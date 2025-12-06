import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Cylinder, Float } from '@react-three/drei';
import * as THREE from 'three';
import { TrackingData } from '../types';

interface MascotModelProps {
  trackingData: React.MutableRefObject<TrackingData>;
}

// A cute robot head with a lab coat feel
const MascotModel: React.FC<MascotModelProps> = ({ trackingData }) => {
  const headGroupRef = useRef<THREE.Group>(null);
  const bodyGroupRef = useRef<THREE.Group>(null);

  // Simple animation: subtle floating and looking around
  useFrame((state) => {
    // HEAD LOGIC (Rotation Tracking)
    if (headGroupRef.current) {
      // Look At Logic
      const data = trackingData.current;
      let targetX = 0;
      let targetY = 0;

      // Determine target based on hand presence
      if (data.left.isDetected && data.right.isDetected) {
        // Look at midpoint
        targetX = (data.left.position.x + data.right.position.x) / 2;
        targetY = (data.left.position.y + data.right.position.y) / 2;
      } else if (data.left.isDetected) {
        targetX = data.left.position.x;
        targetY = data.left.position.y;
      } else if (data.right.isDetected) {
        targetX = data.right.position.x;
        targetY = data.right.position.y;
      } else {
        // Idle: Look slightly around or center
        targetX = 0.5 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
        targetY = 0.5;
      }

      // NEW MAPPING
      // Avatar is positioned at Bottom-Right of screen.
      // Normalized Screen Coords: (1, 1) is Bottom-Right.
      // We use (0.9, 0.9) to approximate the center of the avatar widget.
      const AVATAR_SCREEN_X = 0.9;
      const AVATAR_SCREEN_Y = 0.9;

      // Calculate vector from Avatar to Target
      // X: Target < Avatar (Left) -> Negative
      const worldX = (targetX - AVATAR_SCREEN_X) * 6; 
      // Y: Target < Avatar (Up) -> Positive (since Screen Y is inverted vs 3D Y)
      const worldY = -(targetY - AVATAR_SCREEN_Y) * 6; 
      const worldZ = 3; // Depth scaling

      // Create a target vector
      const targetVec = new THREE.Vector3(worldX, worldY, worldZ);
      
      // Smoothly interpolate current look direction
      const currentRotation = headGroupRef.current.rotation.clone();
      headGroupRef.current.lookAt(targetVec);
      const targetRotation = headGroupRef.current.rotation.clone();

      // Clamp Vertical Rotation (Pitch / X-axis)
      // Prevent looking too far up (negative X) or down (positive X)
      // Revised request: Can turn down around 60 degrees (approx 1.0 rad)
      targetRotation.x = Math.max(-0.15, Math.min(1.0, targetRotation.x));

      // Clamp Horizontal Rotation (Yaw / Y-axis) if needed, though usually fine
      // targetRotation.y = Math.max(-1.0, Math.min(1.0, targetRotation.y));
      
      // Reset and lerp manually for smoothness
      headGroupRef.current.rotation.copy(currentRotation);
      
      // Simple Lerp for smooth following
      headGroupRef.current.rotation.x += (targetRotation.x - headGroupRef.current.rotation.x) * 0.1;
      headGroupRef.current.rotation.y += (targetRotation.y - headGroupRef.current.rotation.y) * 0.1;
      headGroupRef.current.rotation.z += (targetRotation.z - headGroupRef.current.rotation.z) * 0.1;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
      <group scale={1.2}>
        {/* --- HEAD GROUP (Rotates) --- */}
        <group ref={headGroupRef}>
            {/* HEAD (Main Sphere) */}
            <Sphere args={[1, 32, 32]} position={[0, 0, 0]}>
              <meshStandardMaterial
                color="#ffffff" // Lab coat white
                roughness={0.2}
                metalness={0.1}
              />
            </Sphere>

            {/* FACE SCREEN (Black visor area) */}
            <Sphere args={[0.85, 32, 32]} position={[0, 0.1, 0.2]} scale={[1, 0.8, 1]}>
              <meshStandardMaterial color="#111111" roughness={0.2} metalness={0.8} />
            </Sphere>

            {/* EYES (Glowing Cyan) */}
            {/* Left Eye */}
            <Sphere args={[0.15, 16, 16]} position={[-0.3, 0.1, 0.9]}>
              <meshBasicMaterial color="#00FFFF" />
            </Sphere>
            {/* Right Eye */}
            <Sphere args={[0.15, 16, 16]} position={[0.3, 0.1, 0.9]}>
              <meshBasicMaterial color="#00FFFF" />
            </Sphere>

            {/* ANTENNA (Lab Equipment feel) */}
            <Cylinder args={[0.05, 0.05, 0.5]} position={[0, 1.1, 0]}>
              <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.2} />
            </Cylinder>
            <Sphere args={[0.15]} position={[0, 1.4, 0]}>
              <meshStandardMaterial color="#00FFFF" emissive="#00FFFF" emissiveIntensity={2} toneMapped={false} />
            </Sphere>
        </group>

        {/* --- BODY GROUP (Static) --- */}
        <group ref={bodyGroupRef}>
            {/* NECK / COLLAR (Hint of a lab coat collar) */}
            <Cylinder args={[0.6, 0.8, 0.4]} position={[0, -0.9, 0]}>
              <meshStandardMaterial color="#eeeeee" />
            </Cylinder>
            
            {/* LAB COAT SHOULDERS (Simple geometry to suggest clothing) */}
            <mesh position={[0, -1.2, 0]} rotation={[0, 0, 0]}>
                <cylinderGeometry args={[0.3, 1.2, 0.8, 32]} />
                <meshStandardMaterial color="#ffffff" />
            </mesh>
            {/* Tie/Bowtie (Cute detail) */}
            <mesh position={[0, -1, 0.55]} rotation={[0, 0, 0]}>
                <boxGeometry args={[0.3, 0.1, 0.1]} />
                <meshStandardMaterial color="#ff0055" />
            </mesh>
        </group>
      </group>
    </Float>
  );
};

interface MascotAvatarProps {
  trackingData: React.MutableRefObject<TrackingData>;
}

const MascotAvatar: React.FC<MascotAvatarProps> = ({ trackingData }) => {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 4], fov: 45 }} gl={{ alpha: true }}>
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#00ffff" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ffffff" />
        <MascotModel trackingData={trackingData} />
      </Canvas>
    </div>
  );
};

export default MascotAvatar;
