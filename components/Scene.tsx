import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import ParticleSphere from './ParticleSphere';
import WaterSimulation from './WaterSimulation'; // Import new component
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

// --- H2O MOLECULE (Saved State) ---
// Kept for when water is selected from shelf
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
    vec2 flowUv = vUv * 4.0;
    flowUv.y -= uTime * 0.5; 
    
    float n = noise(flowUv);
    
    vec3 viewDir = vec3(0.0, 0.0, 1.0); 
    float fresnel = pow(1.0 - dot(vNormal, viewDir), 2.0);
    
    vec3 color = uBaseColor;
    color += vec3(0.4) * smoothstep(0.4, 0.6, n);
    color += vec3(0.5, 0.8, 1.0) * fresnel;
    
    gl_FragColor = vec4(color, 0.85);
}
`;

const H2OMolecule: React.FC<{ scaleRef?: React.MutableRefObject<number> }> = ({ scaleRef }) => {
    const groupRef = useRef<THREE.Group>(null);
    
    const waterUniforms = useMemo(() => ({
        uTime: { value: 0 },
        uBaseColor: { value: new THREE.Color('#22aaff') }
    }), []);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        const s = scaleRef ? (1.0 + scaleRef.current * 0.3) : 1.0;

        if (groupRef.current) {
            groupRef.current.rotation.y = t * 0.2;
            groupRef.current.rotation.x = Math.sin(t * 0.5) * 0.1;
            // Apply Pinch Scale
            groupRef.current.scale.set(1.5 * s, 1.5 * s, 1.5 * s);
        }
        waterUniforms.uTime.value = t;
    });

    return (
        <group ref={groupRef} scale={1.5}>
            <mesh>
                <sphereGeometry args={[0.8, 64, 64]} />
                <shaderMaterial vertexShader={waterVertexShader} fragmentShader={waterFragmentShader} uniforms={waterUniforms} transparent />
            </mesh>
            <mesh position={[0.7, 0.6, 0]}>
                <sphereGeometry args={[0.4, 32, 32]} />
                <shaderMaterial vertexShader={waterVertexShader} fragmentShader={waterFragmentShader} uniforms={waterUniforms} transparent />
            </mesh>
            <mesh position={[-0.7, 0.6, 0]}>
                <sphereGeometry args={[0.4, 32, 32]} />
                <shaderMaterial vertexShader={waterVertexShader} fragmentShader={waterFragmentShader} uniforms={waterUniforms} transparent />
            </mesh>
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
    vec3 pos = position + aDirection * (uTime * 12.0 * aSpeed); 
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    float size = (15.0 / -mvPosition.z) * max(0.0, (1.0 - uTime * 0.8)); 
    gl_PointSize = size;
    vAlpha = 1.0 - smoothstep(0.0, 1.0, uTime); 
}
`;
const burstFragmentShader = `
uniform vec3 uColor;
varying float vAlpha;
void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
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
            pos[i*3] = 0; pos[i*3+1] = 0; pos[i*3+2] = 0;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            dir[i*3] = Math.sin(phi) * Math.cos(theta);
            dir[i*3+1] = Math.sin(phi) * Math.sin(theta);
            dir[i*3+2] = Math.cos(phi);
            spd[i] = Math.random() * 0.5 + 0.5;
        }
        return { positions: pos, directions: dir, speeds: spd };
    }, []);
    useFrame((state, delta) => {
        if(ref.current) {
            (ref.current.material as THREE.ShaderMaterial).uniforms.uTime.value += delta * 1.5;
        }
    });
    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
                <bufferAttribute attach="attributes-aDirection" count={count} array={directions} itemSize={3} />
                <bufferAttribute attach="attributes-aSpeed" count={count} array={speeds} itemSize={1} />
            </bufferGeometry>
            <shaderMaterial vertexShader={burstVertexShader} fragmentShader={burstFragmentShader} transparent depthWrite={false} blending={THREE.AdditiveBlending} uniforms={{ uTime: { value: 0 }, uColor: { value: new THREE.Color(color) } }} />
        </points>
    )
}

// --- CATALYST SIMULATION ---
const catalystVertexShader = `
uniform float uTime;
uniform float uType; // 0=none, 1=heat, 2=light, 3=chemical
attribute float aSize;
attribute vec3 aRandom;

void main() {
    vec3 pos = position;
    
    // BASE: Start at bottom center
    // Emitters spread slightly in X/Z but mostly move UP Y
    
    // HEAT: Rising Embers
    if (uType > 0.5 && uType < 1.5) {
        float t = uTime * 2.5;
        // Cycle Y from 0 to 8
        float yOffset = mod(t + aRandom.y * 5.0, 8.0);
        pos.y += yOffset;
        
        // Wiggle X/Z
        pos.x += sin(pos.y + t) * 0.3 * (yOffset * 0.2); 
        pos.z += cos(pos.y + t) * 0.3 * (yOffset * 0.2);
    } 
    // LIGHT: Upward Rays/Beams
    else if (uType > 1.5 && uType < 2.5) {
        float t = uTime * 8.0;
        // Fast shooting up
        float yOffset = mod(t + aRandom.y * 10.0, 12.0);
        pos.y += yOffset;
        pos.x *= (1.0 + yOffset * 0.1); // Spread slightly
        pos.z *= (1.0 + yOffset * 0.1);
    }
    // CHEMICAL: Bubbles Rising
    else if (uType > 2.5) {
        float t = uTime * 1.0;
        float yOffset = mod(t + aRandom.y * 8.0, 8.0);
        pos.y += yOffset;
        
        // Spiral
        pos.x += sin(t + aRandom.z * 10.0) * 0.5;
        pos.z += cos(t + aRandom.x * 10.0) * 0.5;
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    float size = aSize * 40.0;
    if (uType > 1.5 && uType < 2.5) size *= 1.5; 
    
    gl_PointSize = size / -mvPosition.z;
}
`;

const catalystFragmentShader = `
uniform vec3 uColor;
void main() {
    vec2 xy = gl_PointCoord.xy - vec2(0.5);
    if (length(xy) > 0.5) discard;
    float alpha = 1.0 - smoothstep(0.1, 0.5, length(xy));
    gl_FragColor = vec4(uColor, alpha);
}
`;

const CatalystSimulation: React.FC<{ type: CatalystType }> = ({ type }) => {
    const ref = useRef<THREE.Points>(null);
    const count = 300;
    
    const typeValue = useMemo(() => {
        if (type === 'heat') return 1.0;
        if (type === 'light') return 2.0;
        if (type === 'chemical') return 3.0;
        return 0.0;
    }, [type]);

    const color = useMemo(() => {
        if (type === 'heat') return new THREE.Color('#ff5500');
        if (type === 'light') return new THREE.Color('#ffffaa');
        if (type === 'chemical') return new THREE.Color('#00ff00');
        return new THREE.Color('#ffffff');
    }, [type]);

    const { positions, sizes, randoms } = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const sz = new Float32Array(count);
        const rand = new Float32Array(count * 3);
        
        for(let i=0; i<count; i++) {
            // Flatten base position to XZ plane at Y=0
            const theta = Math.random() * Math.PI * 2;
            const r = Math.random() * 1.0; 
            
            pos[i*3] = r * Math.cos(theta); // X
            pos[i*3+1] = 0; // Y start
            pos[i*3+2] = r * Math.sin(theta); // Z
            
            sz[i] = Math.random() * 0.5 + 0.5;
            rand[i*3] = Math.random();
            rand[i*3+1] = Math.random();
            rand[i*3+2] = Math.random();
        }
        return { positions: pos, sizes: sz, randoms: rand };
    }, []);

    useFrame((state) => {
        if (ref.current && type !== 'none') {
             const mat = ref.current.material as THREE.ShaderMaterial;
             mat.uniforms.uTime.value = state.clock.getElapsedTime();
             mat.uniforms.uType.value = typeValue;
             mat.uniforms.uColor.value.lerp(color, 0.1);
        }
    });

    if (type === 'none') return null;

    // Positioned at BOTTOM CENTER of screen
    return (
        <group position={[0, -4.5, 0]}>
            <points ref={ref}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
                    <bufferAttribute attach="attributes-aSize" count={count} array={sizes} itemSize={1} />
                    <bufferAttribute attach="attributes-aRandom" count={count} array={randoms} itemSize={3} />
                </bufferGeometry>
                <shaderMaterial 
                    transparent
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    vertexShader={catalystVertexShader}
                    fragmentShader={catalystFragmentShader}
                    uniforms={{
                        uTime: { value: 0 },
                        uType: { value: typeValue },
                        uColor: { value: color }
                    }}
                />
            </points>
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
        
        leftGroupRef.current.position.lerp(targetPos, 0.12);
        
        const dx = data.left.position.x - lastLeftPos.current.x;
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
        
        const dx = data.right.position.x - lastRightPos.current.x;
        if (!combinedElement) {
            rightRotationSpeed.current = THREE.MathUtils.lerp(rightRotationSpeed.current, -0.005 + (dx * 1.5), 0.1);
        }

        rightGroupRef.current.rotation.y += rightRotationSpeed.current;
        rightGroupRef.current.rotation.z -= 0.002;
        lastRightPos.current = { x: data.right.position.x, y: data.right.position.y };
    }
  });

  const isFreshWaterFusion = combinedElement && combinedElement.symbol === 'H2O';

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} color="#00ffff" />
      
      {/* 3D Catalyst Particles - BOTTOM CENTER */}
      <CatalystSimulation type={activeCatalyst} />

      {/* Collision Spark Effect */}
      {showBurst && <CollisionBurst color={combinedElement ? combinedElement.color : '#ffffff'} />}

      {/* Left Element */}
      <group ref={leftGroupRef}>
         {leftElement.symbol === 'H2O' && !combinedElement ? (
             <H2OMolecule scaleRef={leftPinchRef} />
         ) : (
             <ParticleSphere 
                element={leftElement} 
                scaleRef={leftPinchRef}
                opacityTarget={opacities.left}
                isActive={!combinedElement}
              />
         )}
         {!combinedElement && <AtomLabel element={leftElement} position={[0, -1.8, 0]} />}
      </group>

      {/* Right Element */}
      <group ref={rightGroupRef}>
         {rightElement.symbol === 'H2O' && !combinedElement ? (
             <H2OMolecule scaleRef={rightPinchRef} />
         ) : (
             <ParticleSphere 
                element={rightElement} 
                scaleRef={rightPinchRef}
                opacityTarget={opacities.right}
                isActive={!combinedElement}
              />
         )}
         {!combinedElement && <AtomLabel element={rightElement} position={[0, -1.8, 0]} />}
      </group>

      {/* Combined Element */}
      <group ref={combinedGroupRef}>
        {combinedElement && (
            <>
                {isFreshWaterFusion ? (
                     // HIGH QUALITY WATER SIMULATION (ACTIVE FUSION)
                     <WaterSimulation trackingRef={trackingData} />
                ) : (
                    // STANDARD PARTICLE SPHERE (OTHER ELEMENTS)
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
    <Canvas dpr={[1, 2]} gl={{ alpha: true, antialias: true }}>
      <PerspectiveCamera makeDefault position={[0, 0, 9]} fov={55} />
      <SceneContent {...props} />
      <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
    </Canvas>
  );
};

export default Scene;