import React, { useRef, useMemo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import { OrbitControls } from '@react-three/drei/native';
import * as THREE from 'three';

interface Node {
  id: string;
  position: [number, number, number];
}

interface Edge {
  source: string;
  target: string;
}

interface GraphCanvasProps {
  nodes: Node[];
  edges: Edge[];
}

const NODE_RADIUS = 0.1;
const LINE_WIDTH = 0.02;

const Node: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ camera }) => {
    if (ref.current) {
      ref.current.quaternion.copy(camera.quaternion);
    }
  });

  return (
    <group position={position}>
      <mesh ref={ref}>
        <circleGeometry args={[NODE_RADIUS, 32]} />
        <meshBasicMaterial color="black" />
      </mesh>
      <mesh ref={ref}>
        <ringGeometry args={[NODE_RADIUS - 0.01, NODE_RADIUS, 32]} />
        <meshBasicMaterial color="white" />
      </mesh>
    </group>
  );
};

const Edge: React.FC<{ start: [number, number, number]; end: [number, number, number] }> = ({ start, end }) => {
  const startVec = new THREE.Vector3(...start);
  const endVec = new THREE.Vector3(...end);
  const direction = endVec.clone().sub(startVec).normalize();
  
  const adjustedStart = startVec.clone().add(direction.clone().multiplyScalar(NODE_RADIUS));
  const adjustedEnd = endVec.clone().sub(direction.clone().multiplyScalar(NODE_RADIUS));

  const edgeGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(18);
    const normal = new THREE.Vector3();
    const side = new THREE.Vector3();

    normal.subVectors(adjustedEnd, adjustedStart).normalize();
    side.crossVectors(normal, new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(LINE_WIDTH / 2);

    const vertices = [
      adjustedStart.clone().add(side),
      adjustedStart.clone().sub(side),
      adjustedEnd.clone().add(side),
      adjustedEnd.clone().add(side),
      adjustedStart.clone().sub(side),
      adjustedEnd.clone().sub(side),
    ];

    for (let i = 0; i < vertices.length; i++) {
      positions[i * 3] = vertices[i].x;
      positions[i * 3 + 1] = vertices[i].y;
      positions[i * 3 + 2] = vertices[i].z;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [adjustedStart, adjustedEnd]);

  return (
    <mesh geometry={edgeGeometry}>
      <meshBasicMaterial color="white" side={THREE.DoubleSide} />
    </mesh>
  );
};

const Graph: React.FC<GraphCanvasProps> = ({ nodes, edges }) => {
  return (
    <>
      {edges.map((edge, index) => {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        const targetNode = nodes.find((n) => n.id === edge.target);
        if (sourceNode && targetNode) {
          return (
            <Edge
              key={`${edge.source}-${edge.target}`}
              start={sourceNode.position}
              end={targetNode.position}
            />
          );
        }
        return null;
      })}
      {nodes.map((node) => (
        <Node key={node.id} position={node.position} />
      ))}
    </>
  );
};

const CameraController = () => {
  const { camera, gl } = useThree();
  useEffect(() => {
    camera.near = 0.1;
    camera.far = 1000;
    camera.updateProjectionMatrix();
  }, [camera]);

  return (
    <OrbitControls
      args={[camera, gl.domElement]}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      panSpeed={0.5}
      zoomSpeed={0.5}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: THREE.MOUSE.PAN
      }}
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.PAN
      }}
    />
  );
};

const GraphCanvas: React.FC<GraphCanvasProps> = ({ nodes, edges }) => {
  return (
    <View style={styles.canvasContainer}>
      <Canvas camera={{ position: [0, 0, 5], fov: 75, near: 0.1, far: 1000 }}>
        <color attach="background" args={["#000000"]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Graph nodes={nodes} edges={edges} />
        <CameraController />
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  canvasContainer: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default GraphCanvas;