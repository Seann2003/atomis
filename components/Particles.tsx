import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ElementType, ShapeTemplate, ELEMENT_CONFIGS } from '../types';
import { useAppStore } from '../store';

interface ParticlesProps {
  handStateRef: React.MutableRefObject<any>;
}

const Particles: React.FC<ParticlesProps> = ({ handStateRef }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { selectedElement, selectedTemplate, customColor } = useAppStore();
  
  // Configuration derived from selection
  const config = ELEMENT_CONFIGS[selectedElement];
  const count = config.count;
  const particleSize = config.size;

  // Create dummy object for matrix calculations
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Store initial random positions for "Explosion" effects or drift
  const initialPositions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return pos;
  }, [count]);

  // Store "target" positions based on template
  const getTargetPosition = (i: number, template: ShapeTemplate): THREE.Vector3 => {
    const vec = new THREE.Vector3();
    const ratio = i / count;
    
    switch (template) {
      case ShapeTemplate.HEART: {
        // Parametric heart
        const t = ratio * Math.PI * 2;
        // Distribute points somewhat evenly? Just random usually looks better for volume
        // Or 2D parametric curve:
        // x = 16sin^3(t)
        // y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
        // Let's do a 3D volume heart roughly
        const phi = Math.acos(-1 + (2 * i) / count);
        const theta = Math.sqrt(count * Math.PI) * phi;
        // Sphere mapping -> Heart distortion
        let x = Math.sin(phi) * Math.cos(theta);
        let y = Math.sin(phi) * Math.sin(theta);
        let z = Math.cos(phi);
        
        // Morph sphere to heart
        y = y * 1.2; // Stretch
        // This is complex to get perfect, let's use a simpler 2D extrusion + jitter
        // Standard Heart Curve
        const angle = i * 0.1;
        const r = (Math.random() * 0.5 + 0.5); // internal volume
        // x = 16 sin^3 t
        // y = 13 cos t - 5 cos 2t ...
        // We'll just map random points inside a bounding box and discard those outside heart eq?
        // Too slow. Let's use simple math approximation.
        const tx = (Math.random() - 0.5) * 4;
        const ty = (Math.random() - 0.5) * 4;
        const tz = (Math.random() - 0.5) * 2;
        // Check if inside heart? simpler:
        // x = 16 sin^3(t)
        const ht = (i / count) * Math.PI * 2;
        vec.set(
            (16 * Math.pow(Math.sin(ht), 3)) * 0.1,
            (13 * Math.cos(ht) - 5 * Math.cos(2 * ht) - 2 * Math.cos(3 * ht) - Math.cos(4 * ht)) * 0.1,
            (Math.random() - 0.5) * 2
        );
        break;
      }
      case ShapeTemplate.SATURN: {
        // Sphere in middle + Ring
        if (i < count * 0.3) {
            // Planet
            const phi = Math.acos(-1 + (2 * i) / (count * 0.3));
            const theta = Math.sqrt((count * 0.3) * Math.PI) * phi;
            vec.setFromSphericalCoords(1.5, phi, theta);
        } else {
            // Ring
            const angle = (i * 0.2);
            const dist = 2.5 + Math.random() * 1.5;
            vec.set(Math.cos(angle) * dist, (Math.random() - 0.5) * 0.1, Math.sin(angle) * dist);
        }
        break;
      }
      case ShapeTemplate.FLOWER: {
        // Phylotaxis
        const angle = i * 137.5; // Golden angle
        const r = 0.1 * Math.sqrt(i);
        // Add some Z depth for 3D flower
        const z = Math.sin(r) * 0.5;
        vec.set(r * Math.cos(angle), r * Math.sin(angle), z);
        break;
      }
      case ShapeTemplate.FIREWORKS: {
        // Explosion outward from center
        // Just sphere but we'll animate velocity in update
        const phi = Math.acos(-1 + (2 * i) / count);
        const theta = Math.sqrt(count * Math.PI) * phi;
        vec.setFromSphericalCoords(Math.random() * 4, phi, theta);
        break;
      }
      case ShapeTemplate.ATOM:
      default: {
        // Sphere / Electron Cloud
        const phi = Math.acos(-1 + (2 * i) / count);
        const theta = Math.sqrt(count * Math.PI) * phi;
        // Add some noise to make it a "cloud"
        const r = 2 + (Math.random() - 0.5) * 0.5;
        vec.setFromSphericalCoords(r, phi, theta);
        break;
      }
    }
    return vec;
  };

  // Cache targets
  const targetPositions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const v = getTargetPosition(i, selectedTemplate);
        arr[i * 3] = v.x;
        arr[i * 3 + 1] = v.y;
        arr[i * 3 + 2] = v.z;
    }
    return arr;
  }, [selectedTemplate, count]);

  // Animation State
  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.getElapsedTime();
    const { separation, tension, isTracking } = handStateRef.current;
    
    // Base scale derived from hand separation
    // If not tracking, pulse automatically
    const baseScale = isTracking 
        ? 0.5 + (separation * 2.5) // Hands apart = Expand (up to 3x)
        : 1 + Math.sin(time) * 0.2; // Idle pulse

    // Tension affects jitter speed or rotation speed
    const jitter = isTracking ? tension * 0.2 : 0.05;
    const speed = isTracking ? 1 + tension * 5 : 1;

    for (let i = 0; i < count; i++) {
      // Current Target
      const tx = targetPositions[i * 3];
      const ty = targetPositions[i * 3 + 1];
      const tz = targetPositions[i * 3 + 2];

      // Physics / Movement
      let x, y, z;

      if (selectedTemplate === ShapeTemplate.FIREWORKS) {
         // Fireworks expand outward continuously loop
         const explosionTime = (time * speed * 0.5 + (i * 0.01)) % 2; 
         // Reset quickly
         const r = explosionTime * 5 * baseScale;
         
         // Direction is normalized target
         const len = Math.sqrt(tx*tx + ty*ty + tz*tz) || 1;
         x = (tx / len) * r;
         y = (ty / len) * r;
         z = (tz / len) * r;

         // Gravity drop
         y -= explosionTime * explosionTime * 2; 

      } else if (selectedTemplate === ShapeTemplate.SATURN) {
          // Rotate the ring
          const isRing = i >= count * 0.3;
          if (isRing) {
             // Rotate around Y axis
             const angle = time * speed * 0.5 + i;
             const dist = Math.sqrt(tx*tx + tz*tz);
             x = Math.cos(angle) * dist * baseScale;
             y = ty * baseScale + Math.sin(time * 5 + i) * jitter;
             z = Math.sin(angle) * dist * baseScale;
          } else {
             // Planet rotates slowly
             x = tx * baseScale;
             y = ty * baseScale;
             z = tz * baseScale;
          }
      } else {
          // Standard morph
          // Add some orbital noise
          const noise = Math.sin(time * speed + i) * jitter;
          x = tx * baseScale + noise;
          y = ty * baseScale + noise;
          z = tz * baseScale + noise;
      }

      // Update Matrix
      dummy.position.set(x, y, z);
      
      // Scale particles based on selection
      const scale = particleSize * (1 + Math.sin(time * 5 + i) * 0.3); // Twinkle size
      dummy.scale.set(scale, scale, scale);
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    
    // Rotate entire system slowly if not tracking interactions heavily
    if (!isTracking || tension < 0.2) {
        meshRef.current.rotation.y += 0.001;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.15, 8, 8]} />
      <meshStandardMaterial 
        color={customColor} 
        emissive={customColor} 
        emissiveIntensity={0.8}
        roughness={0.2}
        metalness={0.8}
      />
    </instancedMesh>
  );
};

export default Particles;
