
import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useAppStore } from '../store';
import { GestureType } from '../types';

// Augment JSX namespace for R3F intrinsic elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      mesh: any;
      pointLight: any;
      group: any;
      icosahedronGeometry: any;
      meshBasicMaterial: any;
    }
  }
}

const starMaterial = new THREE.MeshBasicMaterial({
  color: '#FFD700', // Gold
  blending: THREE.AdditiveBlending,
  transparent: true,
  opacity: 1.0
});

const Decorations: React.FC = () => {
  const starRef = useRef<THREE.Group>(null);
  const { gesture } = useAppStore();

  useFrame((state, delta) => {
    // Star Animation
    if (starRef.current) {
        const isTree = gesture === GestureType.FIST;
        // Target: Top of tree (y=6.0) vs Top of screen (y=15)
        const targetPos = isTree ? new THREE.Vector3(0, 6.0, 0) : new THREE.Vector3(0, 15, -10);
        
        starRef.current.position.lerp(targetPos, delta * 3);
        
        // Continuous rotation
        starRef.current.rotation.y += delta;
        starRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.1;
        
        // Pulse scale
        const s = 1.0 + Math.sin(state.clock.elapsedTime * 5) * 0.2;
        starRef.current.scale.setScalar(s);
    }
  });

  return (
    <group>
      {/* Top Star - Gold Icosahedron */}
      <group ref={starRef}>
          {/* Core Star */}
          <mesh>
              <icosahedronGeometry args={[0.6, 0]} />
              <primitive object={starMaterial} />
          </mesh>
          {/* Outer Glow Halo */}
          <mesh scale={1.5}>
              <icosahedronGeometry args={[0.6, 0]} />
              <meshBasicMaterial color="#FFD700" transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
           {/* Point light to cast gold light on tree */}
           <pointLight distance={15} intensity={3} color="#FFD700" />
      </group>
    </group>
  );
};

export default Decorations;

