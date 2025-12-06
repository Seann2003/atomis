
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Html } from '@react-three/drei';
import ParticleSphere from './ParticleSphere';
import WaterSimulation from './WaterSimulation'; 
import { SaltPile, SaltLattice } from './SaltSimulation'; 
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

// --- OPTIMIZED FIRE SHADER (Heat) ---
// Uses simple sine waves instead of complex noise functions for performance
const fireVertexShader = `
varying vec2 vUv;
uniform float uTime;
void main() {
  vUv = uv;
  vec3 pos = position;
  // Simple wind sway effect based on height
  float sway = sin(uTime * 3.0 + pos.y * 2.0) * (pos.y + 1.0) * 0.05;
  pos.x += sway;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const fireFragmentShader = `
varying vec2 vUv;
uniform float uTime;
uniform vec3 uColorBase;
uniform vec3 uColorTip;

void main() {
  vec2 uv = vUv;
  
  // Create a candle-flame shape (teardrop)
  // Center is at x=0.5
  float xDist = abs(uv.x - 0.5);
  // Width tapers as y increases
  float width = 0.45 * (1.0 - uv.y * 0.8); 
  
  // Smooth edges
  float shape = smoothstep(width, width - 0.15, xDist);
  
  // Fade out bottom slightly
  shape *= smoothstep(0.0, 0.15, uv.y);
  // Fade out top
  shape *= smoothstep(1.0, 0.8, uv.y);
  
  // Simple vertical flicker
  float flicker = sin(uTime * 15.0 - uv.y * 10.0) * 0.1;
  
  // Color gradient
  vec3 col = mix(uColorBase, uColorTip, uv.y + flicker);
  
  // Core heat glow
  float core = smoothstep(width * 0.6, width * 0.2, xDist) * smoothstep(0.0, 0.4, uv.y);
  col += vec3(1.0, 0.9, 0.6) * core * 0.8;

  gl_FragColor = vec4(col, shape);
}
`;

const OptimizedFire: React.FC = () => {
  const meshRef = useRef<THREE.Group>(null);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColorBase: { value: new THREE.Color('#ff4400') },
    uColorTip: { value: new THREE.Color('#ffff00') }
  }), []);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
    if(meshRef.current) {
        meshRef.current.lookAt(state.camera.position);
    }
  });

  return (
    <group ref={meshRef} position={[0, -4.0, -2]} scale={[3, 4, 3]}>
       {/* 3 Intersecting planes for volume illusion, reduced count/complexity */}
       {[0, Math.PI/3, 2*Math.PI/3].map((rot, i) => (
         <mesh key={i} rotation={[0, rot, 0]}>
           <planeGeometry args={[1, 1.5]} />
           <shaderMaterial 
             vertexShader={fireVertexShader} 
             fragmentShader={fireFragmentShader} 
             uniforms={uniforms} 
             transparent 
             depthWrite={false} 
             side={THREE.DoubleSide} 
             blending={THREE.AdditiveBlending}
           />
         </mesh>
       ))}
    </group>
  );
};

// --- SHADER HELPERS (Only used for Lightning now) ---
const noiseFunction = `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
`;

// --- LIGHTNING SHADER (Light) ---
const lightningFragmentShader = `
varying vec2 vUv;
uniform float uTime;
${noiseFunction}

float fbm(vec2 st) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
    for (int i = 0; i < 5; i++) {
        v += a * snoise(st);
        st = rot * st * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

void main() {
    vec2 uv = vUv;
    vec2 t = vec2(uTime * 2.0, uTime * 5.0);
    
    // Main Bolt
    float noiseVal = fbm(uv * 10.0 + t);
    float bolt = 1.0 - abs((uv.x - 0.5) + noiseVal * 0.2);
    bolt = pow(bolt, 50.0); // Sharpen
    
    // Flashing
    float flash = step(0.9, fract(sin(uTime * 10.0)*43758.5453));
    
    // Glow
    float glow = 1.0 - abs((uv.x - 0.5) + noiseVal * 0.2);
    glow = pow(glow, 5.0) * 0.5;

    vec3 col = vec3(0.5, 0.8, 1.0) * (bolt + glow);
    col *= flash;
    
    // Fade edges
    float alpha = smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
    
    gl_FragColor = vec4(col, min(1.0, (bolt + glow) * alpha));
}
`;

const OptimizedLightning: React.FC = () => {
    const meshRef = useRef<THREE.Mesh>(null);
    const uniforms = useMemo(() => ({
        uTime: { value: 0 }
    }), []);
    
    useFrame((state) => {
        uniforms.uTime.value = state.clock.elapsedTime;
        if(meshRef.current) meshRef.current.lookAt(state.camera.position);
    });

    return (
        <mesh ref={meshRef} position={[0, -3.0, -2]} scale={[4, 5, 1]}>
            <planeGeometry args={[1, 1]} />
            <shaderMaterial 
                vertexShader={`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
                fragmentShader={lightningFragmentShader}
                uniforms={uniforms}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </mesh>
    );
};

// --- BUBBLES (Chemical) ---
const OptimizedBubbles: React.FC = () => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const count = 50;
    const dummy = useMemo(() => new THREE.Object3D(), []);
    
    const particles = useMemo(() => {
        return new Array(count).fill(0).map(() => ({
            pos: new THREE.Vector3((Math.random()-0.5)*2, -4, (Math.random()-0.5)*2),
            speed: Math.random() * 0.05 + 0.02,
            offset: Math.random() * 100
        }));
    }, []);

    useFrame((state) => {
        if(!meshRef.current) return;
        const t = state.clock.elapsedTime;
        
        particles.forEach((p, i) => {
            // Rise
            p.pos.y += p.speed;
            
            // Wobble
            p.pos.x += Math.sin(t * 2.0 + p.offset) * 0.01;
            
            // Reset
            if(p.pos.y > 1.0) {
                p.pos.y = -4.5;
                p.pos.x = (Math.random()-0.5)*2;
            }
            
            dummy.position.copy(p.pos);
            // Scale pulse
            const s = (Math.sin(t * 5.0 + p.offset) * 0.2 + 0.8) * 0.15;
            dummy.scale.setScalar(s);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]} position={[0, 0, -2]}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial 
                color="#00ff44" 
                emissive="#004411"
                roughness={0.1}
                transparent
                opacity={0.6}
            />
        </instancedMesh>
    );
};

const CatalystSimulation: React.FC<{ activeCatalyst: CatalystType }> = ({ activeCatalyst }) => {
    return (
        <group>
            {activeCatalyst === 'heat' && <OptimizedFire />}
            {activeCatalyst === 'light' && <OptimizedLightning />}
            {activeCatalyst === 'chemical' && <OptimizedBubbles />}
        </group>
    );
};

// --- H2O MOLECULE (Saved State) ---
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
            groupRef.current.rotation.y = t * 0.5; 
            groupRef.current.rotation.x = Math.sin(t * 0.5) * 0.1;
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

// --- HCl MOLECULE ---
const HClMolecule: React.FC<{ scaleRef?: React.MutableRefObject<number> }> = ({ scaleRef }) => {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        const s = scaleRef ? (1.0 + scaleRef.current * 0.2) : 1.0;
        if (groupRef.current) {
            groupRef.current.rotation.y = t * 0.5;
            groupRef.current.rotation.z = Math.sin(t * 0.3) * 0.1;
            groupRef.current.scale.set(s, s, s);
        }
    });

    return (
        <group ref={groupRef}>
            {/* Hydrogen (White, Small) */}
            <mesh position={[0.8, 0, 0]}>
                <sphereGeometry args={[0.3, 32, 32]} />
                <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.1} emissive="#333333" />
            </mesh>
            {/* Chlorine (Green, Large) */}
            <mesh position={[-0.4, 0, 0]}>
                <sphereGeometry args={[0.7, 32, 32]} />
                <meshStandardMaterial color="#00ff00" roughness={0.3} metalness={0.2} transparent opacity={0.9} emissive="#003300" />
            </mesh>
            {/* Bond */}
            <mesh rotation={[0, 0, Math.PI / 2]} position={[0.2, 0, 0]}>
                <cylinderGeometry args={[0.1, 0.1, 1.2, 8]} />
                <meshStandardMaterial color="#cccccc" />
            </mesh>
        </group>
    );
};

// --- NH3 MOLECULE (Ammonia) ---
const NH3Molecule: React.FC<{ scaleRef?: React.MutableRefObject<number> }> = ({ scaleRef }) => {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        const s = scaleRef ? (1.0 + scaleRef.current * 0.2) : 1.0;
        if (groupRef.current) {
            groupRef.current.rotation.y = t * 0.5;
            groupRef.current.rotation.x = Math.sin(t * 0.2) * 0.1;
            groupRef.current.scale.set(s, s, s);
        }
    });

    return (
        <group ref={groupRef}>
            {/* Nitrogen (Blue, Large) */}
            <mesh position={[0, 0.2, 0]}>
                <sphereGeometry args={[0.6, 32, 32]} />
                <meshStandardMaterial color="#0000ff" roughness={0.3} metalness={0.1} emissive="#000044" />
            </mesh>
            {/* Hydrogens (White, Small) - Tripod */}
            {[0, 120, 240].map((angle, i) => {
                const rad = angle * (Math.PI / 180);
                const x = Math.cos(rad) * 0.7;
                const z = Math.sin(rad) * 0.7;
                return (
                    <group key={i}>
                         <mesh position={[x, -0.4, z]}>
                            <sphereGeometry args={[0.3, 32, 32]} />
                            <meshStandardMaterial color="#ffffff" roughness={0.2} emissive="#444444" />
                        </mesh>
                         {/* Bond */}
                        <mesh position={[x/2, -0.1, z/2]} rotation={[0.5, -rad - Math.PI/2, 0]}>
                             <cylinderGeometry args={[0.08, 0.08, 0.8, 8]} />
                             <meshStandardMaterial color="#cccccc" />
                        </mesh>
                    </group>
                )
            })}
        </group>
    );
};

// --- Fe2O3 MOLECULE (Iron Oxide) ---
const Fe2O3Molecule: React.FC<{ scaleRef?: React.MutableRefObject<number> }> = ({ scaleRef }) => {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        const s = scaleRef ? (1.0 + scaleRef.current * 0.2) : 1.0;
        if (groupRef.current) {
            groupRef.current.rotation.y = t * 0.5;
            groupRef.current.rotation.z = Math.cos(t * 0.1) * 0.05;
            groupRef.current.scale.set(s, s, s);
        }
    });

    return (
        <group ref={groupRef}>
            {/* Iron (Orange-Red, Large) */}
            <mesh position={[-0.6, 0, 0]}>
                <sphereGeometry args={[0.55, 32, 32]} />
                <meshStandardMaterial color="#d45500" roughness={0.4} metalness={0.6} emissive="#441100" />
            </mesh>
            <mesh position={[0.6, 0, 0]}>
                <sphereGeometry args={[0.55, 32, 32]} />
                <meshStandardMaterial color="#d45500" roughness={0.4} metalness={0.6} emissive="#441100" />
            </mesh>

            {/* Oxygen (Red, Medium) */}
            <mesh position={[0, 0.6, 0]}>
                <sphereGeometry args={[0.45, 32, 32]} />
                <meshStandardMaterial color="#ff0000" roughness={0.3} emissive="#440000" />
            </mesh>
            <mesh position={[0, -0.6, 0]}>
                <sphereGeometry args={[0.45, 32, 32]} />
                <meshStandardMaterial color="#ff0000" roughness={0.3} emissive="#440000" />
            </mesh>
            <mesh position={[0, 0, 0.6]}>
                <sphereGeometry args={[0.45, 32, 32]} />
                <meshStandardMaterial color="#ff0000" roughness={0.3} emissive="#440000" />
            </mesh>
            
            {/* Bonds */}
             <mesh position={[-0.3, 0.3, 0]} rotation={[0, 0, -0.8]}>
                <cylinderGeometry args={[0.08, 0.08, 0.9, 8]} />
                <meshStandardMaterial color="#888888" />
            </mesh>
             <mesh position={[0.3, 0.3, 0]} rotation={[0, 0, 0.8]}>
                <cylinderGeometry args={[0.08, 0.08, 0.9, 8]} />
                <meshStandardMaterial color="#888888" />
            </mesh>
            <mesh position={[-0.3, -0.3, 0]} rotation={[0, 0, 0.8]}>
                <cylinderGeometry args={[0.08, 0.08, 0.9, 8]} />
                <meshStandardMaterial color="#888888" />
            </mesh>
             <mesh position={[0.3, -0.3, 0]} rotation={[0, 0, -0.8]}>
                <cylinderGeometry args={[0.08, 0.08, 0.9, 8]} />
                <meshStandardMaterial color="#888888" />
            </mesh>
        </group>
    );
};

// --- CaCl2 MOLECULE (Calcium Chloride) ---
const CaCl2Molecule: React.FC<{ scaleRef?: React.MutableRefObject<number> }> = ({ scaleRef }) => {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        const s = scaleRef ? (1.0 + scaleRef.current * 0.2) : 1.0;
        if (groupRef.current) {
            groupRef.current.rotation.y = t * 0.5;
            groupRef.current.rotation.x = t * 0.1;
            groupRef.current.scale.set(s, s, s);
        }
    });

    return (
        <group ref={groupRef}>
            {/* Calcium (Grey, Large) */}
            <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[0.65, 32, 32]} />
                <meshStandardMaterial color="#aaaaaa" roughness={0.3} metalness={0.4} emissive="#222222" />
            </mesh>
            
            {/* Chlorines (Green, Medium) - Linear */}
            <mesh position={[1.2, 0, 0]}>
                <sphereGeometry args={[0.55, 32, 32]} />
                <meshStandardMaterial color="#00ff00" roughness={0.3} transparent opacity={0.9} emissive="#003300" />
            </mesh>
            <mesh position={[-1.2, 0, 0]}>
                <sphereGeometry args={[0.55, 32, 32]} />
                <meshStandardMaterial color="#00ff00" roughness={0.3} transparent opacity={0.9} emissive="#003300" />
            </mesh>

            {/* Bonds */}
             <mesh position={[0.6, 0, 0]} rotation={[0, 0, 1.57]}>
                <cylinderGeometry args={[0.1, 0.1, 1.2, 8]} />
                <meshStandardMaterial color="#cccccc" />
            </mesh>
            <mesh position={[-0.6, 0, 0]} rotation={[0, 0, 1.57]}>
                <cylinderGeometry args={[0.1, 0.1, 1.2, 8]} />
                <meshStandardMaterial color="#cccccc" />
            </mesh>
        </group>
    );
};

// --- NO2 MOLECULE (Nitrogen Dioxide) ---
const NO2Molecule: React.FC<{ scaleRef?: React.MutableRefObject<number> }> = ({ scaleRef }) => {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        const s = scaleRef ? (1.0 + scaleRef.current * 0.2) : 1.0;
        if (groupRef.current) {
            groupRef.current.rotation.y = t * 0.5;
            groupRef.current.scale.set(s, s, s);
        }
    });

    return (
        <group ref={groupRef}>
            {/* Nitrogen (Blue) */}
            <mesh position={[0, 0.3, 0]}>
                <sphereGeometry args={[0.5, 32, 32]} />
                <meshStandardMaterial color="#0000ff" roughness={0.3} emissive="#000044" />
            </mesh>
            
            {/* Oxygens (Red) - Bent */}
            <mesh position={[0.9, -0.4, 0]}>
                <sphereGeometry args={[0.45, 32, 32]} />
                <meshStandardMaterial color="#ff0000" roughness={0.3} emissive="#440000" />
            </mesh>
            <mesh position={[-0.9, -0.4, 0]}>
                <sphereGeometry args={[0.45, 32, 32]} />
                <meshStandardMaterial color="#ff0000" roughness={0.3} emissive="#440000" />
            </mesh>

             {/* Bonds */}
             <mesh position={[0.45, -0.05, 0]} rotation={[0, 0, -0.8]}>
                <cylinderGeometry args={[0.1, 0.1, 1.0, 8]} />
                <meshStandardMaterial color="#888888" />
            </mesh>
            <mesh position={[-0.45, -0.05, 0]} rotation={[0, 0, 0.8]}>
                <cylinderGeometry args={[0.1, 0.1, 1.0, 8]} />
                <meshStandardMaterial color="#888888" />
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

// --- SCENE CONTENT ---
const SceneContent: React.FC<SceneProps> = ({ leftElement, rightElement, combinedElement, trackingData, activeCatalyst }) => {
  const leftGroupRef = useRef<THREE.Group>(null);
  const rightGroupRef = useRef<THREE.Group>(null);
  const combinedGroupRef = useRef<THREE.Group>(null);
  
  const leftPinchRef = useRef(0.0);
  const rightPinchRef = useRef(0.0);
  const combinedPinchRef = useRef(0.8);

  const [opacities, setOpacities] = useState({ left: 1, right: 1, combined: 0 });
  const [showBurst, setShowBurst] = useState(false);

  const lastLeftPos = useRef({ x: 0, y: 0 });
  const lastRightPos = useRef({ x: 0, y: 0 });
  const leftRotationSpeed = useRef(0.005);
  const rightRotationSpeed = useRef(0.005);

  useEffect(() => {
    if (combinedElement) {
        setOpacities({ left: 0, right: 0, combined: 1 });
        setShowBurst(true);
        const t = setTimeout(() => setShowBurst(false), 1000);
        return () => clearTimeout(t);
    } else {
        setOpacities({ left: 1, right: 1, combined: 0 });
        setShowBurst(false);
    }
  }, [combinedElement]);

  useFrame((state) => {
    const data = trackingData.current;
    
    leftPinchRef.current = combinedElement ? 0 : data.left.pinchDistance;
    rightPinchRef.current = combinedElement ? 0 : data.right.pinchDistance;
    
    const mapX = (x: number) => (x - 0.5) * 18; 
    const mapY = (y: number) => -(y - 0.5) * 10;

    // LEFT
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

    // RIGHT
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

  const renderElement = (element: ElementData, scaleRef: React.MutableRefObject<number>, opacity: number, isActive: boolean) => {
    if (element.symbol === 'H2O' && !combinedElement) return <H2OMolecule scaleRef={scaleRef} />;
    if (element.symbol === 'NaCl' && !combinedElement) return <SaltLattice scaleRef={scaleRef} />;
    if (element.symbol === 'HCl' && !combinedElement) return <HClMolecule scaleRef={scaleRef} />;
    if (element.symbol === 'NH3' && !combinedElement) return <NH3Molecule scaleRef={scaleRef} />;
    if (element.symbol === 'Fe2O3' && !combinedElement) return <Fe2O3Molecule scaleRef={scaleRef} />;
    if (element.symbol === 'CaCl2' && !combinedElement) return <CaCl2Molecule scaleRef={scaleRef} />;
    if (element.symbol === 'NO2' && !combinedElement) return <NO2Molecule scaleRef={scaleRef} />;
    
    return (
        <ParticleSphere 
            element={element} 
            scaleRef={scaleRef}
            opacityTarget={opacity}
            isActive={isActive}
        />
    );
  };

  const renderCombined = () => {
    if (!combinedElement) return null;
    
    if (combinedElement.symbol === 'H2O') {
        return <WaterSimulation trackingRef={trackingData} />;
    }
    if (combinedElement.symbol === 'NaCl') {
        return <SaltPile />;
    }
    if (combinedElement.symbol === 'HCl') {
        return <HClMolecule scaleRef={combinedPinchRef} />;
    }
    if (combinedElement.symbol === 'NH3') {
        return <NH3Molecule scaleRef={combinedPinchRef} />;
    }
    if (combinedElement.symbol === 'Fe2O3') {
        return <Fe2O3Molecule scaleRef={combinedPinchRef} />;
    }
    if (combinedElement.symbol === 'CaCl2') {
        return <CaCl2Molecule scaleRef={combinedPinchRef} />;
    }
    if (combinedElement.symbol === 'NO2') {
        return <NO2Molecule scaleRef={combinedPinchRef} />;
    }

    return (
        <ParticleSphere 
            element={combinedElement} 
            scaleRef={combinedPinchRef}
            opacityTarget={opacities.combined}
            isActive={true}
        />
    );
  };

  return (
    <>
      <ambientLight intensity={0.5} />
      {/* Front Light to illuminate center opaque objects like Salt and Molecules */}
      <directionalLight position={[0, 0, 10]} intensity={1.5} color="#ffffff" />
      <pointLight position={[10, 10, 10]} intensity={1.5} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} color="#00ffff" />
      
      <CatalystSimulation activeCatalyst={activeCatalyst} />

      {showBurst && <CollisionBurst color={combinedElement ? combinedElement.color : '#ffffff'} />}

      {/* Left Element */}
      <group ref={leftGroupRef}>
         {renderElement(leftElement, leftPinchRef, opacities.left, !combinedElement)}
         {!combinedElement && <AtomLabel element={leftElement} position={[0, -1.2, 0]} />}
      </group>

      {/* Right Element */}
      <group ref={rightGroupRef}>
         {renderElement(rightElement, rightPinchRef, opacities.right, !combinedElement)}
         {!combinedElement && <AtomLabel element={rightElement} position={[0, -1.2, 0]} />}
      </group>

      {/* Combined Element */}
      <group ref={combinedGroupRef}>
        {renderCombined()}
        {combinedElement && <AtomLabel element={combinedElement} position={[0, -2.5, 0]} />}
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
