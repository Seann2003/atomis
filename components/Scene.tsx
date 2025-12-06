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
    
    // Use the same coordinate mapping logic as UI or simple approximation for 3D depth
    // Note: To perfectly match the DOM cursor, we would need to unproject screen coords.
    // However, for the 3D particles, a simpler map often feels better as it keeps them in the "world" center.
    // Let's stick to the previous world map but ensure it covers the view.
    const mapX = (x: number) => (x - 0.5) * 16; // Wider range
    const mapY = (y: number) => -(y - 0.5) * 9;

    if (leftGroupRef.current) {
        let targetPos = new THREE.Vector3(0,0,0);
        if (combinedElement) targetPos.set(0, 0, 0);
        else targetPos.set(mapX(data.left.position.x), mapY(data.left.position.y), 0);
        leftGroupRef.current.position.lerp(targetPos, 0.1);
        leftGroupRef.current.rotation.z += 0.005;
    }

    if (rightGroupRef.current) {
        let targetPos = new THREE.Vector3(0,0,0);
        if (combinedElement) targetPos.set(0, 0, 0);
        else targetPos.set(mapX(data.right.position.x), mapY(data.right.position.y), 0);
        rightGroupRef.current.position.lerp(targetPos, 0.1);
        rightGroupRef.current.rotation.z -= 0.005;
    }

    if (combinedGroupRef.current) {
        combinedGroupRef.current.rotation.y += 0.002;
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />
      
      {/* Left Element */}
      <group ref={leftGroupRef}>
         <ParticleSphere 
            element={leftElement} 
            scaleRef={leftPinchRef}
            opacityTarget={opacities.left}
            isActive={!combinedElement}
          />
         {!combinedElement && <AtomLabel element={leftElement} position={[0, -1.5, 0]} />}
      </group>

      {/* Right Element */}
      <group ref={rightGroupRef}>
         <ParticleSphere 
            element={rightElement} 
            scaleRef={rightPinchRef}
            opacityTarget={opacities.right}
            isActive={!combinedElement}
          />
         {!combinedElement && <AtomLabel element={rightElement} position={[0, -1.5, 0]} />}
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
                 <AtomLabel element={combinedElement} position={[0, -2, 0]} />
            </>
        )}
      </group>
    </>
  );
};

const Scene: React.FC<SceneProps> = (props) => {
  return (
    <Canvas dpr={[1, 2]} gl={{ alpha: true }}>
      <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={60} />
      <SceneContent {...props} />
      <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
    </Canvas>
  );
};

export default Scene;
