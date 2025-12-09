
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import { useAppStore } from '../store';
import { GestureType } from '../types';

// Augment JSX namespace for R3F intrinsic elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      instancedMesh: any;
      sphereGeometry: any;
      primitive: any;
      octahedronGeometry: any;
      mesh: any;
      pointLight: any;
      group: any;
      meshBasicMaterial: any;
    }
  }
}

// "Pink Particle" / Bokeh aesthetic
// Using BasicMaterial with AdditiveBlending creates a "glowing light" effect
// instead of a solid physical object.
const glowMaterial = new THREE.MeshBasicMaterial({
  color: '#FF1493', // Deep Pink
  transparent: true,
  opacity: 0.6,
  blending: THREE.AdditiveBlending,
  depthWrite: false, // Important for particle-like glow overlap
});

const starMaterial = new THREE.MeshBasicMaterial({
  color: '#FF69B4', // Hot Pink Star
  blending: THREE.AdditiveBlending,
  transparent: true,
  opacity: 0.9
});

const Decorations: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const starRef = useRef<THREE.Group>(null);
  const { gesture } = useAppStore();
  const count = 100; // Increased count for particle effect

  // Store current positions for smooth lerping
  const currentPositions = useRef<THREE.Vector3[]>([]);

  // Generate positions for Tree state and Ring state
  const { data } = useMemo(() => {
    const temp = [];
    currentPositions.current = [];

    for (let i = 0; i < count; i++) {
      // TREE STATE: Spiral distribution
      const yRatio = i / count;
      const y = yRatio * 10 - 5; // -5 to 5
      const radius = 3.8 * (1.0 - yRatio) + 0.2;
      const angle = i * 0.4 + Math.random() * 0.5; 
      
      const treePos = new THREE.Vector3(
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius
      );

      // SCATTER STATE: Large cloud around the scene
      const ringAngle = Math.random() * Math.PI * 2;
      const ringRadius = 10 + Math.random() * 10; 
      const ringY = (Math.random() - 0.5) * 12; 
      
      const scatterPos = new THREE.Vector3(
        Math.cos(ringAngle) * ringRadius,
        ringY,
        Math.sin(ringAngle) * ringRadius
      );
      
      // Randomize sizes for particle look
      const scale = Math.random() * 0.5 + 0.2;

      // Initialize current pos at random scatter
      currentPositions.current.push(scatterPos.clone());

      temp.push({ treePos, scatterPos, scale });
    }
    return { data: temp };
  }, []);

  useFrame((state, delta) => {
    if (meshRef.current) {
      const isTree = gesture === GestureType.FIST;
      
      const dummy = new THREE.Object3D();

      for (let i = 0; i < count; i++) {
        const { treePos, scatterPos, scale } = data[i];
        
        // Target Determination
        const target = isTree ? treePos : scatterPos;
        
        // SMOOTH INTERPOLATION (Lerp)
        // Speed 3.0 provides a nice fluid motion
        currentPositions.current[i].lerp(target, delta * 2.5);
        
        // Add Breathing Animation
        const time = state.clock.elapsedTime;
        const pulse = Math.sin(time * 2 + i) * 0.1 + 1.0;
        
        dummy.position.copy(currentPositions.current[i]);
        dummy.scale.setScalar(scale * pulse);
        
        // Particles always face camera roughly (spheres), but we update matrix
        dummy.updateMatrix();
        
        meshRef.current.setMatrixAt(i, dummy.matrix);
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
    }

    // Star Animation (Also pink/glowing now)
    if (starRef.current) {
        const isTree = gesture === GestureType.FIST;
        const targetPos = isTree ? new THREE.Vector3(0, 5.5, 0) : new THREE.Vector3(0, 15, -10);
        
        starRef.current.position.lerp(targetPos, delta * 2);
        starRef.current.rotation.y += delta;
        starRef.current.rotation.z = Math.sin(state.clock.elapsedTime) * 0.2;
        
        const s = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.3;
        starRef.current.scale.setScalar(s);
    }
  });

  return (
    <group>
      {/* Pink Glowing Particles - Instanced */}
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <primitive object={glowMaterial} />
      </instancedMesh>

      {/* Top Star */}
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <group ref={starRef}>
            {/* Core Star */}
            <mesh>
                <octahedronGeometry args={[0.8, 0]} />
                <primitive object={starMaterial} />
            </mesh>
            {/* Outer Glow Halo */}
            <mesh scale={1.8}>
                <sphereGeometry args={[0.6, 16, 16]} />
                <meshBasicMaterial color="#FF69B4" transparent opacity={0.2} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
             {/* Point light to cast pink light on tree */}
             <pointLight distance={10} intensity={2} color="#FF69B4" />
        </group>
      </Float>
    </group>
  );
};

export default Decorations;
