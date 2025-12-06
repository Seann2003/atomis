import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
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
  const leftGroupRef = useRef<THREE.Group>(null);
  const rightGroupRef = useRef<THREE.Group>(null);
  const combinedGroupRef = useRef<THREE.Group>(null);
  
  const leftPinchRef = useRef(0.0);
  const rightPinchRef = useRef(0.0);
  const combinedPinchRef = useRef(0.8);

  const [opacities, setOpacities] = useState({ left: 1, right: 1, combined: 0 });

  // References for Velocity Calculation
  const lastLeftPos = useRef({ x: 0, y: 0 });
  const lastRightPos = useRef({ x: 0, y: 0 });
  const leftRotationSpeed = useRef(0.005);
  const rightRotationSpeed = useRef(0.005);

  useEffect(() => {
    if (combinedElement) {
        setOpacities({ left: 0, right: 0, combined: 1 });
    } else {
        setOpacities({ left: 1, right: 1, combined: 0 });
    }
  }, [combinedElement]);

  useFrame((state) => {
    const data = trackingData.current;
    
    // Smooth input scaling
    leftPinchRef.current = combinedElement ? 0 : data.left.pinchDistance;
    rightPinchRef.current = combinedElement ? 0 : data.right.pinchDistance;
    
    const mapX = (x: number) => (x - 0.5) * 18; 
    const mapY = (y: number) => -(y - 0.5) * 10;

    // LEFT ATOM LOGIC
    if (leftGroupRef.current) {
        let targetPos = new THREE.Vector3(0,0,0);
        if (combinedElement) targetPos.set(0, 0, 0);
        else targetPos.set(mapX(data.left.position.x), mapY(data.left.position.y), 0);
        
        // Position Lerp
        leftGroupRef.current.position.lerp(targetPos, 0.12);
        
        // Rotation Momentum Calculation
        const dx = data.left.position.x - lastLeftPos.current.x;
        // If moving left/right, spin faster
        if (!combinedElement) {
           leftRotationSpeed.current = THREE.MathUtils.lerp(leftRotationSpeed.current, 0.005 + (dx * 1.5), 0.1);
        }
        
        leftGroupRef.current.rotation.y += leftRotationSpeed.current;
        leftGroupRef.current.rotation.z += 0.002;
        
        lastLeftPos.current = { x: data.left.position.x, y: data.left.position.y };
    }

    // RIGHT ATOM LOGIC
    if (rightGroupRef.current) {
        let targetPos = new THREE.Vector3(0,0,0);
        if (combinedElement) targetPos.set(0, 0, 0);
        else targetPos.set(mapX(data.right.position.x), mapY(data.right.position.y), 0);
        
        rightGroupRef.current.position.lerp(targetPos, 0.12);
        
        // Rotation Momentum
        const dx = data.right.position.x - lastRightPos.current.x;
        if (!combinedElement) {
            rightRotationSpeed.current = THREE.MathUtils.lerp(rightRotationSpeed.current, -0.005 + (dx * 1.5), 0.1);
        }

        rightGroupRef.current.rotation.y += rightRotationSpeed.current;
        rightGroupRef.current.rotation.z -= 0.002;
        
        lastRightPos.current = { x: data.right.position.x, y: data.right.position.y };
    }

    // COMBINED ATOM LOGIC
    if (combinedGroupRef.current) {
        combinedGroupRef.current.rotation.y += 0.01;
        combinedGroupRef.current.rotation.x += 0.005;
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} color="#00ffff" />
      
      {/* Left Element */}
      <group ref={leftGroupRef}>
         <ParticleSphere 
            element={leftElement} 
            scaleRef={leftPinchRef}
            opacityTarget={opacities.left}
            isActive={!combinedElement}
          />
         {!combinedElement && <AtomLabel element={leftElement} position={[0, -1.8, 0]} />}
      </group>

      {/* Right Element */}
      <group ref={rightGroupRef}>
         <ParticleSphere 
            element={rightElement} 
            scaleRef={rightPinchRef}
            opacityTarget={opacities.right}
            isActive={!combinedElement}
          />
         {!combinedElement && <AtomLabel element={rightElement} position={[0, -1.8, 0]} />}
      </group>

      {/* Combined Element */}
      <group ref={combinedGroupRef}>
        {combinedElement && (
            <>
                 <ParticleSphere 
                    element={combinedElement} 
                    scaleRef={combinedPinchRef}
                    opacityTarget={opacities.combined}
                    isActive={!!combinedElement}
                  />
                 <AtomLabel element={combinedElement} position={[0, -2.5, 0]} />
            </>
        )}
      </group>
    </>
  );
};

const Scene: React.FC<SceneProps> = (props) => {
  return (
    <Canvas dpr={[1, 2]} gl={{ alpha: true }}>
      <PerspectiveCamera makeDefault position={[0, 0, 9]} fov={55} />
      <SceneContent {...props} />
      <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
    </Canvas>
  );
};

export default Scene;