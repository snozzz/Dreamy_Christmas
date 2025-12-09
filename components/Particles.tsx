import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useAppStore } from '../store';
import { GestureType } from '../types';

// Augment JSX namespace for R3F intrinsic elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      points: any;
      bufferGeometry: any;
      bufferAttribute: any;
      shaderMaterial: any;
    }
  }
}

// --- SHADERS ---

const vertexShader = `
  uniform float uTime;
  uniform float uMorph; // 0 = Scatter, 1 = Tree
  
  attribute vec3 positionTree;
  attribute vec3 positionScatter;
  attribute float size;
  attribute vec3 color;
  
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = color;
    
    // Mix positions
    vec3 mixedPos = mix(positionScatter, positionTree, uMorph);
    
    // Add some "breathing" movement
    float noise = sin(uTime * 2.0 + mixedPos.y) * 0.1;
    mixedPos.x += noise * (1.0 - uMorph); // Only sway when scattered
    
    // Tree: Spin slightly around Y
    if (uMorph > 0.5) {
        float angle = uTime * 0.1;
        float s = sin(angle);
        float c = cos(angle);
        float x = mixedPos.x * c - mixedPos.z * s;
        float z = mixedPos.x * s + mixedPos.z * c;
        mixedPos.x = x;
        mixedPos.z = z;
    }

    vec4 mvPosition = modelViewMatrix * vec4(mixedPos, 1.0);
    
    // Size attenuation
    gl_PointSize = size * (300.0 / -mvPosition.z);
    
    // Make particles twinkle
    float twinkle = sin(uTime * 5.0 + positionTree.x * 10.0) * 0.5 + 0.5;
    vAlpha = 0.6 + 0.4 * twinkle;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Soft particle
    vec2 xy = gl_PointCoord.xy - vec2(0.5);
    float ll = length(xy);
    if(ll > 0.5) discard;
    
    // Glow
    float glow = exp(-ll * 4.0);
    
    gl_FragColor = vec4(vColor, vAlpha * glow);
  }
`;

const Particles: React.FC = () => {
  const meshRef = useRef<THREE.Points>(null);
  const gesture = useAppStore((state) => state.gesture);
  
  const currentMorph = useRef(0); 
  const targetMorph = useRef(0);

  const count = 5000;

  // Generate Particle Data
  const { positionsTree, positionsScatter, colors, sizes } = useMemo(() => {
    const positionsTree = new Float32Array(count * 3);
    const positionsScatter = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const palette = [
      new THREE.Color('#FFD700'), // Gold
      new THREE.Color('#006400'), // Dark Green
      new THREE.Color('#228B22'), // Forest Green
      new THREE.Color('#32CD32'), // Lime Green
      new THREE.Color('#FF0000'), // Red
      new THREE.Color('#FFFFFF'), // Snow
    ];

    for (let i = 0; i < count; i++) {
      // --- STATE A: TREE ---
      // Multiple cones layers for "Pine" look
      const layer = Math.floor(Math.random() * 5); // 5 layers
      const hPerLayer = 2.0;
      
      const yRatio = Math.random(); 
      // y goes from bottom (-5) to top (5)
      // Actually let's do a simple dense cone with noise
      const h = Math.random() * 10;
      const y = h - 5;
      const rBase = 4.5 * (1.0 - h/10.0);
      const r = rBase * Math.sqrt(Math.random()); // Even spread in circle
      const angle = Math.random() * Math.PI * 2;
      
      positionsTree[i * 3] = Math.cos(angle) * r;
      positionsTree[i * 3 + 1] = y;
      positionsTree[i * 3 + 2] = Math.sin(angle) * r;

      // --- STATE B: SCATTER ---
      // Background starfield or galaxy
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const radius = 15 + Math.random() * 20; // Far away background
      
      positionsScatter[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positionsScatter[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positionsScatter[i * 3 + 2] = radius * Math.cos(phi);

      // --- COLORS ---
      // Bias towards Green for tree structure
      let color;
      if (Math.random() > 0.3) {
          color = palette[1 + Math.floor(Math.random() * 3)]; // Greens
      } else {
          color = palette[Math.floor(Math.random() * palette.length)]; // Random decorations/snow
      }
      
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = Math.random() * 1.5 + 0.5;
    }

    return { positionsTree, positionsScatter, colors, sizes };
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMorph: { value: 0 },
  }), []);

  useFrame((state, delta) => {
    if (meshRef.current) {
      if (gesture === GestureType.FIST) {
        targetMorph.current = 1; 
      } else if (gesture === GestureType.OPEN_PALM || gesture === GestureType.PINCH) {
        targetMorph.current = 0; 
      }
      
      currentMorph.current = THREE.MathUtils.lerp(currentMorph.current, targetMorph.current, delta * 2.5);
      
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.elapsedTime;
      material.uniforms.uMorph.value = currentMorph.current;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positionsTree} itemSize={3} />
        <bufferAttribute attach="attributes-positionTree" count={count} array={positionsTree} itemSize={3} />
        <bufferAttribute attach="attributes-positionScatter" count={count} array={positionsScatter} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={count} array={sizes} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default Particles;