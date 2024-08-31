import "text-encoding-polyfill"
import { Audio } from "expo-av"
import { StatusBar } from "expo-status-bar"
import React, { useCallback, useEffect, useState } from "react"
import { Image, StyleSheet, Text, View } from "react-native"
import { useStore } from "@/lib/store"
import PushToTalkButton from "./components/PushToTalkButton"
import RelayStatusIcon from "./components/RelayStatusIcon"
import { sendAudioToRelay } from "./lib/sendAudioToRelay"
import { useAudioRecording } from "./lib/useAudioRecording"
import { useNostrUser } from "./lib/useNostrUser"
import { useRelayConnection } from "./lib/useRelayConnection"

export default function App() {
  useNostrUser()
  const { isConnected, socket } = useRelayConnection()
  const { startRecording, stopRecording, isRecording } = useAudioRecording()
  const [transcription, setTranscription] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'pending'>('pending')

  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync()
      setPermissionStatus(status === 'granted' ? 'granted' : 'denied')
    })()
  }, [])

  const handlePressIn = useCallback(async () => {
    if (permissionStatus !== 'granted') {
      console.log('Audio permission not granted')
      return
    }
    setTranscription(null)
    await startRecording()
  }, [permissionStatus, startRecording])

  const handlePressOut = useCallback(async () => {
    if (!socket) {
      console.error('No WebSocket connection available')
      return
    }

    setIsProcessing(true)
    try {
      const audioUri = await stopRecording()
      if (audioUri) {
        console.log('Audio recorded:', audioUri)
        await sendAudioToRelay(audioUri, socket)
      }
    } catch (error) {
      console.error('Error sending audio:', error)
      setTranscription('Error sending audio')
      setIsProcessing(false)
    }
  }, [socket, stopRecording])

  useEffect(() => {
    if (socket) {
      const messageHandler = (event: MessageEvent) => {
        const data = JSON.parse(event.data)
        if (data.type === 'EVENT' && data.data.kind === 1235) {
          setTranscription(data.data.content)
          setIsProcessing(false)
        }
      }
      socket.addEventListener('message', messageHandler)
      return () => {
        socket.removeEventListener('message', messageHandler)
      }
    }
  }, [socket])

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('./assets/sqlogo-t.png')} style={styles.logo} resizeMode="contain" />
        <RelayStatusIcon isConnected={isConnected} />
      </View>
      <View style={styles.content}>
        {transcription && (
          <Text style={styles.transcription}>Transcription: {transcription}</Text>
        )}
        <PushToTalkButton
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={permissionStatus !== 'granted'}
          isRecording={isRecording}
          isProcessing={isProcessing}
        />
      </View>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  logo: {
    width: 40,
    height: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  transcription: {
    color: '#fff',
    fontFamily: 'Courier New',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
});