import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Environment } from '@react-three/drei';
import Particles from './Particles';
import PhotoCards from './PhotoCards';
import Decorations from './Decorations';

// Augment JSX namespace for R3F intrinsic elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      color: any;
      fog: any;
      ambientLight: any;
      pointLight: any;
      spotLight: any;
    }
  }
}

const Experience: React.FC = () => {
  return (
    <div className="w-full h-full relative bg-slate-900">
      <Canvas
        camera={{ position: [0, 0, 12], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#020205']} />
        <fog attach="fog" args={['#020205', 10, 40]} />
        
        <Suspense fallback={null}>
            {/* Environment for metallic reflections */}
            <Environment preset="city" blur={1} />
            
            {/* Cinematic Lighting */}
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={2.0} color="#ffaa00" />
            <pointLight position={[-10, 5, 0]} intensity={1.5} color="#0044ff" />
            <spotLight position={[0, 10, 0]} angle={0.5} penumbra={1} intensity={2} color="#ffffff" />

            {/* Content */}
            <Particles />
            <Decorations />
            <PhotoCards />
        </Suspense>
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />
        
        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 1.5} minPolarAngle={Math.PI / 3} />
      </Canvas>
    </div>
  );
};

export default Experience;