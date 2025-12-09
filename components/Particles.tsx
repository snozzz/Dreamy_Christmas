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
  attribute vec3 colorScatter;
  
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Mix colors
    vColor = mix(colorScatter, color, uMorph);
    
    // Mix positions
    vec3 mixedPos = mix(positionScatter, positionTree, uMorph);
    
    // EXPLOSION EFFECT
    // When uMorph is transitioning (around 0.5), push particles outward
    // sin(0) = 0, sin(PI) = 0, sin(PI/2) = 1.
    // uMorph goes 0->1. So sin(uMorph * PI) creates a hump in the middle.
    float explosionStrength = 15.0; // Strong explosion
    float explosion = sin(uMorph * 3.14159) * explosionStrength;
    
    // Direction: away from center
    vec3 direction = normalize(mixedPos);
    // Avoid zero length issues
    if (length(mixedPos) < 0.001) direction = vec3(0.0, 1.0, 0.0);
    
    mixedPos += direction * explosion;

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
  const { positionsTree, positionsScatter, colors, colorsScatter, sizes } = useMemo(() => {
    const positionsTree = new Float32Array(count * 3);
    const positionsScatter = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const colorsScatter = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const palette = [
      new THREE.Color('#FFD700'), // Gold
      new THREE.Color('#006400'), // Dark Green
      new THREE.Color('#228B22'), // Forest Green
      new THREE.Color('#32CD32'), // Lime Green
      new THREE.Color('#FF0000'), // Red
      new THREE.Color('#FFFFFF'), // Snow
    ];

    const goldColor = new THREE.Color('#FFD700');
    const orangeGold = new THREE.Color('#FFA500');

    for (let i = 0; i < count; i++) {
      // --- STATE A: TREE ---
      const h = Math.random() * 10;
      const y = h - 5;
      const rBase = 4.5 * (1.0 - h/10.0);
      const r = rBase * Math.sqrt(Math.random()); 
      const angle = Math.random() * Math.PI * 2;
      
      positionsTree[i * 3] = Math.cos(angle) * r;
      positionsTree[i * 3 + 1] = y;
      positionsTree[i * 3 + 2] = Math.sin(angle) * r;

      // --- STATE B: SCATTER (Golden Sphere) ---
      // Dense sphere in center
      const phi = Math.acos((Math.random() * 2) - 1);
      const theta = Math.random() * Math.PI * 2;
      // Radius 0.5 to 4.5 (Center filled but not too tiny)
      // Cube root for uniform distribution, but let's make it denser at core?
      // No, uniform sphere is best for "ball" look.
      const radius = Math.cbrt(Math.random()) * 4.0; 
      
      positionsScatter[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positionsScatter[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positionsScatter[i * 3 + 2] = radius * Math.cos(phi);

      // --- COLORS ---
      // Tree colors
      let color;
      if (Math.random() > 0.3) {
          color = palette[1 + Math.floor(Math.random() * 3)]; // Greens
      } else {
          color = palette[Math.floor(Math.random() * palette.length)]; // Random decorations/snow
      }
      
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Scatter colors (Vibrant Gold)
      const cScatter = Math.random() > 0.3 ? goldColor : orangeGold;
      colorsScatter[i * 3] = cScatter.r;
      colorsScatter[i * 3 + 1] = cScatter.g;
      colorsScatter[i * 3 + 2] = cScatter.b;

      sizes[i] = Math.random() * 1.5 + 0.5;
    }

    return { positionsTree, positionsScatter, colors, colorsScatter, sizes };
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
      
      // Slower lerp for more dramatic transition
      currentMorph.current = THREE.MathUtils.lerp(currentMorph.current, targetMorph.current, delta * 2.0);
      
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
        <bufferAttribute attach="attributes-colorScatter" count={count} array={colorsScatter} itemSize={3} />
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