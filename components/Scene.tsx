import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import ParticleSphere from './ParticleSphere';
import AtomLabel from './AtomLabel';
import { ElementData, TrackingData, CatalystType } from '../types';
import * as THREE from 'three';

interface SceneProps {
  leftElement: ElementData;
  rightElement: ElementData;
  combinedElement: ElementData | null;
  trackingData: React.MutableRefObject<TrackingData>;
  activeCatalyst: CatalystType;
}

// --- WATER SHADERS (H2O Flow) ---
const waterVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const waterFragmentShader = `
uniform float uTime;
uniform vec3 uBaseColor;
varying vec2 vUv;
varying vec3 vNormal;

// Simple noise function
float random (in vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float noise (in vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
    // Flow simulation
    vec2 flowUv = vUv * 4.0;
    flowUv.y -= uTime * 0.5; // Flow downwards/upwards
    
    float n = noise(flowUv);
    
    // Fresnel effect for energy rim
    vec3 viewDir = vec3(0.0, 0.0, 1.0); 
    float fresnel = pow(1.0 - dot(vNormal, viewDir), 2.0);
    
    vec3 color = uBaseColor;
    
    // Add flow streaks
    color += vec3(0.4) * smoothstep(0.4, 0.6, n);
    
    // Add rim glow
    color += vec3(0.5, 0.8, 1.0) * fresnel;
    
    gl_FragColor = vec4(color, 0.85); // Slightly transparent
}
`;

const H2OMolecule: React.FC = () => {
    const groupRef = useRef<THREE.Group>(null);
    const oxygenRef = useRef<THREE.Mesh>(null);
    const h1Ref = useRef<THREE.Mesh>(null);
    const h2Ref = useRef<THREE.Mesh>(null);
    
    const waterUniforms = useMemo(() => ({
        uTime: { value: 0 },
        uBaseColor: { value: new THREE.Color('#22aaff') }
    }), []);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        if (groupRef.current) {
            groupRef.current.rotation.y = t * 0.2;
            groupRef.current.rotation.x = Math.sin(t * 0.5) * 0.1;
        }
        
        waterUniforms.uTime.value = t;
    });

    return (
        <group ref={groupRef} scale={1.5}>
            {/* Oxygen Atom (Center) */}
            <mesh ref={oxygenRef}>
                <sphereGeometry args={[1, 64, 64]} />
                <shaderMaterial 
                    vertexShader={waterVertexShader} 
                    fragmentShader={waterFragmentShader} 
                    uniforms={waterUniforms}
                    transparent
                />
            </mesh>
            
            {/* Hydrogen 1 */}
            <mesh ref={h1Ref} position={[0.9, 0.8, 0]}>
                <sphereGeometry args={[0.5, 32, 32]} />
                <shaderMaterial 
                    vertexShader={waterVertexShader} 
                    fragmentShader={waterFragmentShader} 
                    uniforms={waterUniforms}
                    transparent
                />
            </mesh>

            {/* Hydrogen 2 */}
            <mesh ref={h2Ref} position={[-0.9, 0.8, 0]}>
                <sphereGeometry args={[0.5, 32, 32]} />
                <shaderMaterial 
                    vertexShader={waterVertexShader} 
                    fragmentShader={waterFragmentShader} 
                    uniforms={waterUniforms}
                    transparent
                />
            </mesh>
            
            {/* Particles surrounding to show vapor/energy */}
            <points>
                <sphereGeometry args={[2.0, 32, 32]} />
                <pointsMaterial size={0.05} color="#aaddff" transparent opacity={0.4} />
            </points>
        </group>
    );
};

// --- BURST SHADERS ---
const burstVertexShader = `
uniform float uTime;
attribute float aSpeed;
attribute vec3 aDirection;
varying float vAlpha;

void main() {
    // Move outwards linearly based on time and random speed
    vec3 pos = position + aDirection * (uTime * 12.0 * aSpeed); 
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Size shrinks as it expands
    float size = (15.0 / -mvPosition.z) * max(0.0, (1.0 - uTime * 0.8)); 
    gl_PointSize = size;
    
    // Fade out
    vAlpha = 1.0 - smoothstep(0.0, 1.0, uTime); 
}
`;

const burstFragmentShader = `
uniform vec3 uColor;
varying float vAlpha;
void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    
    // Intense glow core
    float glow = 1.0 - (d * 2.0);
    glow = pow(glow, 3.0);
    
    gl_FragColor = vec4(uColor, vAlpha * glow);
}
`;

const CollisionBurst: React.FC<{ color: string }> = ({ color }) => {
    const ref = useRef<THREE.Points>(null);
    const count = 400;
    
    const { positions, directions, speeds } = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const dir = new Float32Array(count * 3);
        const spd = new Float32Array(count);
        
        for(let i=0; i<count; i++) {
            // Start at center
            pos[i*3] = 0; pos[i*3+1] = 0; pos[i*3+2] = 0;
            
            // Random sphere direction
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            dir[i*3] = Math.sin(phi) * Math.cos(theta);
            dir[i*3+1] = Math.sin(phi) * Math.sin(theta);
            dir[i*3+2] = Math.cos(phi);
            
            // Random speed variation
            spd[i] = Math.random() * 0.5 + 0.5;
        }
        return { positions: pos, directions: dir, speeds: spd };
    }, []);

    useFrame((state, delta) => {
        if(ref.current) {
            const material = ref.current.material as THREE.ShaderMaterial;
            // Advance time uniform manually
            material.uniforms.uTime.value += delta * 1.5; // Speed of explosion
        }
    });

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
                <bufferAttribute attach="attributes-aDirection" count={count} array={directions} itemSize={3} />
                <bufferAttribute attach="attributes-aSpeed" count={count} array={speeds} itemSize={1} />
            </bufferGeometry>
            <shaderMaterial 
                vertexShader={burstVertexShader}
                fragmentShader={burstFragmentShader}
                transparent={true}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                uniforms={{
                    uTime: { value: 0 },
                    uColor: { value: new THREE.Color(color) }
                }}
            />
        </points>
    )
}

// --- CATALYST ORB (Replacing flat particles) ---
const CatalystOrb: React.FC<{ type: CatalystType }> = ({ type }) => {
    const dummyScale = useRef(1.0); // No expansion interaction
    if (type === 'none') return null;

    let color = '#ffffff';
    let element: ElementData = { symbol: '', name: '', color: '#ffffff', atomicNumber: 0, description: '' };
    
    if (type === 'heat') {
        color = '#ff3300';
        element.color = color;
    } else if (type === 'light') {
        color = '#ffff00';
        element.color = color;
    } else if (type === 'chemical') {
        color = '#00ff00';
        element.color = color;
    }

    return (
        <group position={[4.5, 0, 0]} scale={0.5}>
             <ParticleSphere 
                element={element}
                scaleRef={dummyScale}
                opacityTarget={1.0}
                isActive={true}
             />
        </group>
    );
};

const SceneContent: React.FC<SceneProps> = ({ leftElement, rightElement, combinedElement, trackingData, activeCatalyst }) => {
  const leftGroupRef = useRef<THREE.Group>(null);
  const rightGroupRef = useRef<THREE.Group>(null);
  const combinedGroupRef = useRef<THREE.Group>(null);
  
  const leftPinchRef = useRef(0.0);
  const rightPinchRef = useRef(0.0);
  const combinedPinchRef = useRef(0.8);

  const [opacities, setOpacities] = useState({ left: 1, right: 1, combined: 0 });
  const [showBurst, setShowBurst] = useState(false);

  // References for Velocity Calculation
  const lastLeftPos = useRef({ x: 0, y: 0 });
  const lastRightPos = useRef({ x: 0, y: 0 });
  const leftRotationSpeed = useRef(0.005);
  const rightRotationSpeed = useRef(0.005);

  useEffect(() => {
    if (combinedElement) {
        // Trigger Fusion Animation
        setOpacities({ left: 0, right: 0, combined: 1 });
        setShowBurst(true);
        
        // Hide burst after animation completes (approx 1s)
        const t = setTimeout(() => setShowBurst(false), 1000);
        return () => clearTimeout(t);
    } else {
        // Reset
        setOpacities({ left: 1, right: 1, combined: 0 });
        setShowBurst(false);
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
      
      {/* 3D Catalyst Orb */}
      <CatalystOrb type={activeCatalyst} />

      {/* Collision Spark Effect */}
      {showBurst && <CollisionBurst color={combinedElement ? combinedElement.color : '#ffffff'} />}

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
                {combinedElement.symbol === 'H2O' ? (
                     <H2OMolecule />
                ) : (
                     <ParticleSphere 
                        element={combinedElement} 
                        scaleRef={combinedPinchRef}
                        opacityTarget={opacities.combined}
                        isActive={!!combinedElement}
                      />
                )}
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