import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Stars } from '@react-three/drei';
import HandTracker from './components/HandTracker';
import Particles from './components/Particles';
import UIOverlay from './components/UIOverlay';
import { HandState } from './types';

const App: React.FC = () => {
  // We use a Ref for hand state to avoid re-rendering the React tree on every frame (60fps)
  // The Particles component will read this ref directly in its useFrame loop.
  const handStateRef = useRef<HandState>({
    isTracking: false,
    separation: 0.5,
    tension: 0,
    position: [0, 0, 0]
  });

  const handleHandUpdate = (newState: HandState) => {
    // Mutate ref directly for performance
    handStateRef.current = newState;
  };

  return (
    <div className="relative w-full h-screen bg-black">
      
      {/* 3D Scene */}
      <Canvas 
        camera={{ position: [0, 0, 8], fov: 60 }}
        className="w-full h-full"
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#050505']} />
        
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="blue" />
        
        {/* Environment */}
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Environment preset="city" />

        {/* Particle System */}
        <Particles handStateRef={handStateRef} />
        
        {/* Controls (Mouse fallback) */}
        <OrbitControls enablePan={false} enableZoom={true} minDistance={2} maxDistance={20} />
      </Canvas>

      {/* Hand Tracking Logic (Runs in background/overlay) */}
      <HandTracker onHandUpdate={handleHandUpdate} />

      {/* UI Overlay */}
      <UIOverlay />

    </div>
  );
};

export default App;
