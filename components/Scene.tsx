import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, PerspectiveCamera } from '@react-three/drei';
import ParticleSphere from './ParticleSphere';
import AtomLabel from './AtomLabel';
import { ElementData, TrackingData } from '../types';
import * as THREE from 'three';

interface SceneProps {
  leftElement: ElementData;
  rightElement: ElementData;
  combinedElement: ElementData | null;
  trackingData: React.MutableRefObject<TrackingData>;
}

const SceneContent: React.FC<SceneProps> = ({ leftElement, rightElement, combinedElement, trackingData }) => {
  // Groups
  const leftGroupRef = useRef<THREE.Group>(null);
  const rightGroupRef = useRef<THREE.Group>(null);
  const combinedGroupRef = useRef<THREE.Group>(null);
  
  // Particle Data Refs (Pinch Scaling)
  const leftPinchRef = useRef(0.0);
  const rightPinchRef = useRef(0.0);
  const combinedPinchRef = useRef(0.8); // Default large for combined result

  // Opacity Targets for transition
  const [opacities, setOpacities] = useState({ left: 1, right: 1, combined: 0 });

  useEffect(() => {
    if (combinedElement) {
        // Trigger Fusion Transition
        setOpacities({ left: 0, right: 0, combined: 1 });
    } else {
        // Reset to Split
        setOpacities({ left: 1, right: 1, combined: 0 });
    }
  }, [combinedElement]);

  useFrame((state) => {
    const data = trackingData.current;
    
    // Update Scale Inputs from Hands
    // If combined, we ignore hands for left/right pinch and just default them
    leftPinchRef.current = combinedElement ? 0 : data.left.pinchDistance;
    rightPinchRef.current = combinedElement ? 0 : data.right.pinchDistance;
    
    // Screen to World Mapping
    const mapX = (x: number) => (x - 0.5) * 14;
    const mapY = (y: number) => -(y - 0.5) * 8;

    // --- ANIMATION LOGIC ---

    // 1. LEFT ELEMENT
    if (leftGroupRef.current) {
        let targetPos = new THREE.Vector3(0,0,0);
        
        if (combinedElement) {
            // Fusion: Move to center
            targetPos.set(0, 0, 0);
        } else {
            // Normal: Follow Hand
            targetPos.set(mapX(data.left.position.x), mapY(data.left.position.y), 0);
        }
        
        // Smooth movement
        leftGroupRef.current.position.lerp(targetPos, 0.1);
        
        // Rotate slightly based on movement
        leftGroupRef.current.rotation.z += 0.005;
    }

    // 2. RIGHT ELEMENT
    if (rightGroupRef.current) {
        let targetPos = new THREE.Vector3(0,0,0);
        
        if (combinedElement) {
            targetPos.set(0, 0, 0);
        } else {
            targetPos.set(mapX(data.right.position.x), mapY(data.right.position.y), 0);
        }
        
        rightGroupRef.current.position.lerp(targetPos, 0.1);
        rightGroupRef.current.rotation.z -= 0.005;
    }

    // 3. COMBINED ELEMENT
    if (combinedGroupRef.current) {
        // Combined always stays at center, maybe drifts slightly
        combinedGroupRef.current.rotation.y += 0.002;
    }
  });

  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <Stars radius={100} depth={50} count={7000} factor={4} saturation={0} fade speed={1} />
      
      {/* Left Element - Always Rendered */}
      <group ref={leftGroupRef}>
         <ParticleSphere 
            element={leftElement} 
            scaleRef={leftPinchRef}
            opacityTarget={opacities.left}
            isActive={!combinedElement}
          />
         {/* Only show label if visible */}
         {!combinedElement && <AtomLabel element={leftElement} position={[0, -1.5, 0]} />}
      </group>

      {/* Right Element - Always Rendered */}
      <group ref={rightGroupRef}>
         <ParticleSphere 
            element={rightElement} 
            scaleRef={rightPinchRef}
            opacityTarget={opacities.right}
            isActive={!combinedElement}
          />
         {!combinedElement && <AtomLabel element={rightElement} position={[0, -1.5, 0]} />}
      </group>

      {/* Combined Element - Always Rendered, but hidden via opacity until needed */}
      <group ref={combinedGroupRef}>
        {combinedElement && (
            <>
                 <ParticleSphere 
                    element={combinedElement} 
                    scaleRef={combinedPinchRef}
                    opacityTarget={opacities.combined}
                    isActive={!!combinedElement}
                  />
                 <AtomLabel element={combinedElement} position={[0, -2, 0]} />
            </>
        )}
      </group>
    </>
  );
};

const Scene: React.FC<SceneProps> = (props) => {
  return (
    <Canvas dpr={[1, 2]}>
      <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={60} />
      <SceneContent {...props} />
      <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
    </Canvas>
  );
};

export default Scene;