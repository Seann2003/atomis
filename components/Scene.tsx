
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
const fireVertexShader = `
varying vec2 vUv;
varying float vElevation;
uniform float uTime;

void main() {
  vUv = uv;
  vec3 pos = position;
  
  // Simple sine wave wind/wobble
  float wobble = sin(uTime * 5.0 + pos.y * 2.0) * (pos.y + 1.0) * 0.1;
  pos.x += wobble;
  
  // Taper the top to make a teardrop flame shape
  float taper = 1.0 - smoothstep(0.0, 3.0, pos.y + 1.5);
  pos.x *= taper; 

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  vElevation = pos.y;
}
`;

const fireFragmentShader = `
varying vec2 vUv;
varying float vElevation;
uniform float uTime;

void main() {
  // Analytical flame shape gradient
  float dist = abs(vUv.x - 0.5) * 2.0;
  float shape = 1.0 - smoothstep(0.0, 0.8, dist);
  
  // Vertical gradient (Blue base -> Yellow Mid -> Red Tip)
  vec3 colBase = vec3(0.1, 0.1, 1.0); // Blueish base
  vec3 colMid = vec3(1.0, 0.8, 0.2);  // Bright yellow/orange
  vec3 colTip = vec3(1.0, 0.2, 0.0);  // Red tip
  
  // Mix colors based on UV.y
  vec3 col = mix(colBase, colMid, smoothstep(0.0, 0.3, vUv.y));
  col = mix(col, colTip, smoothstep(0.3, 0.9, vUv.y));
  
  // Flicker alpha
  float flicker = 0.8 + 0.2 * sin(uTime * 20.0);
  
  // Falloff at top and bottom
  float alpha = shape * flicker;
  alpha *= smoothstep(0.0, 0.1, vUv.y); // Fade base
  alpha *= 1.0 - smoothstep(0.8, 1.0, vUv.y); // Fade tip

  gl_FragColor = vec4(col, alpha);
}
`;

const OptimizedFire: React.FC = () => {
  const meshRef = useRef<THREE.Group>(null);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
  }), []);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
    if(meshRef.current) {
        meshRef.current.lookAt(state.camera.position);
    }
  });

  return (
    <group ref={meshRef} position={[0, -4.0, -2]} scale={[2, 3, 2]}>
         <mesh>
           <planeGeometry args={[1, 2, 8, 8]} />
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
         <mesh rotation={[0, Math.PI/2, 0]}>
           <planeGeometry args={[1, 2, 8, 8]} />
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
    </group>
  );
};

// --- LIGHTNING SHADER (Light) ---
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
    float noiseVal = fbm(uv * 10.0 + t);
    float bolt = 1.0 - abs((uv.x - 0.5) + noiseVal * 0.2);
    bolt = pow(bolt, 50.0);
    float flash = step(0.9, fract(sin(uTime * 10.0)*43758.5453));
    float glow = 1.0 - abs((uv.x - 0.5) + noiseVal * 0.2);
    glow = pow(glow, 5.0) * 0.5;
    vec3 col = vec3(0.5, 0.8, 1.0) * (bolt + glow);
    col *= flash;
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
            p.pos.y += p.speed;
            p.pos.x += Math.sin(t * 2.0 + p.offset) * 0.01;
            if(p.pos.y > 1.0) {
                p.pos.y = -4.5;
                p.pos.x = (Math.random()-0.5)*2;
            }
            dummy.position.copy(p.pos);
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
            <meshStandardMaterial color="#00ff44" emissive="#004411" roughness={0.1} transparent opacity={0.6} />
        </instancedMesh>
    );
};

// --- CATALYST WRAPPER ---
const CatalystParticles: React.FC<{ activeCatalyst: CatalystType }> = ({ activeCatalyst }) => {
    return (
        <group>
            {activeCatalyst === 'heat' && <OptimizedFire />}
            {activeCatalyst === 'light' && <OptimizedLightning />}
            {activeCatalyst === 'chemical' && <OptimizedBubbles />}
        </group>
    );
};

const CatalystSimulation: React.FC<{ activeCatalyst: CatalystType }> = ({ activeCatalyst }) => {
    // Wrapper to ensure clean unmounting/mounting if needed, though simpler now with shader opts
    return <CatalystParticles activeCatalyst={activeCatalyst} />;
};

// --- BIG EXPLOSION SHADER (Mushroom Cloud) ---
const bigExplosionVertexShader = `
uniform float uTime;
attribute float aSize;
attribute vec3 aVelocity;
attribute float aGroup; // 0=Cap, 1=Stem, 2=Shockwave
varying float vAlpha;
varying vec3 vColor;

void main() {
  vec3 p = position;
  float t = uTime * 2.0; // Speed multiplier
  
  if (aGroup < 0.5) { 
      // --- CAP (Mushroom Head) ---
      // Rises fast, then slows. Expands outwards.
      float rise = t * 3.5;
      float expansion = t * 2.5;
      
      // Basic movement
      p += aVelocity * expansion;
      p.y += rise;
      
      // Drag/Curl effect to flatten bottom of cap
      // If particle is far from center, drag it down slightly relative to top
      float dist = length(p.xz);
      p.y -= dist * 0.3 * smoothstep(0.0, 2.0, t);
      
  } else if (aGroup < 1.5) {
      // --- STEM (Column) ---
      // Rises with less expansion
      float rise = t * 3.0;
      float expansion = t * 0.5; // Narrow expansion
      
      p.x += aVelocity.x * expansion;
      p.z += aVelocity.z * expansion;
      p.y += rise * (0.5 + aVelocity.y * 0.5); // Variation in rise speed
      
  } else {
      // --- SHOCKWAVE (Ground Ring) ---
      float expansion = t * 8.0;
      p.x += aVelocity.x * expansion;
      p.z += aVelocity.z * expansion;
      p.y = 0.0; // Keep on ground
  }
  
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  
  // Size calculation
  float size = aSize * (400.0 / -mvPosition.z);
  // Grow then shrink
  size *= smoothstep(0.0, 0.2, uTime) * (1.0 - smoothstep(1.5, 4.0, uTime));
  gl_PointSize = size;
  
  // Alpha fade out
  vAlpha = 1.0 - smoothstep(1.5, 3.5, uTime);
  
  // Color Evolution: Bright White -> Fire Gold -> Dark Red Smoke
  vec3 colCore = vec3(1.0, 1.0, 0.8); // Blinding white/yellow
  vec3 colFire = vec3(1.0, 0.5, 0.0); // Orange/Gold
  vec3 colSmoke = vec3(0.1, 0.05, 0.05); // Dark reddish black
  
  float progress = uTime; // 0 to 3s approx
  
  if (progress < 0.3) {
      vColor = mix(colCore, colFire, progress / 0.3);
  } else if (progress < 1.5) {
      vColor = mix(colFire, colSmoke, (progress - 0.3) / 1.2);
  } else {
      vColor = colSmoke;
  }
}
`;

const bigExplosionFragmentShader = `
varying float vAlpha;
varying vec3 vColor;
void main() {
  vec2 uv = gl_PointCoord.xy - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  
  // Soft particle edge
  float alpha = vAlpha * (1.0 - smoothstep(0.3, 0.5, d));
  
  gl_FragColor = vec4(vColor, alpha);
}
`;

const BigExplosion: React.FC = () => {
    const ref = useRef<THREE.Points>(null);
    const count = 3000;
    
    const { positions, velocities, sizes, groups } = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const vel = new Float32Array(count * 3);
        const sz = new Float32Array(count);
        const grp = new Float32Array(count);
        
        for(let i=0; i<count; i++) {
            // Reset position
            pos[i*3] = 0; pos[i*3+1] = -2; pos[i*3+2] = 0;
            
            const r = Math.random();
            let groupId = 0; // Cap
            
            if (r > 0.85) groupId = 2; // Shockwave (15%)
            else if (r > 0.6) groupId = 1; // Stem (25%)
            else groupId = 0; // Cap (60%)
            
            grp[i] = groupId;
            sz[i] = Math.random() * 1.5 + 0.5;

            // Velocity setup based on group
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            if (groupId === 0) { // Cap - Sphere-ish
                 const speed = Math.random() * 0.8 + 0.2;
                 vel[i*3] = Math.sin(phi) * Math.cos(theta) * speed;
                 vel[i*3+1] = Math.abs(Math.cos(phi)) * speed; // Mostly Up
                 vel[i*3+2] = Math.sin(phi) * Math.sin(theta) * speed;
            } else if (groupId === 1) { // Stem - Cylinder
                 const speed = Math.random() * 0.5 + 0.1;
                 const rad = Math.random() * 0.2; // Narrow
                 vel[i*3] = Math.cos(theta) * rad;
                 vel[i*3+1] = Math.random() * 1.0 + 0.5; // Strong Up
                 vel[i*3+2] = Math.sin(theta) * rad;
            } else { // Shockwave - Disc
                 const speed = Math.random() * 1.0 + 0.5;
                 vel[i*3] = Math.cos(theta) * speed;
                 vel[i*3+1] = 0;
                 vel[i*3+2] = Math.sin(theta) * speed;
            }
        }
        return { positions: pos, velocities: vel, sizes: sz, groups: grp };
    }, []);

    useFrame((state, delta) => {
        if(ref.current) {
            const mat = ref.current.material as THREE.ShaderMaterial;
            mat.uniforms.uTime.value += delta;
        }
    });

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
                <bufferAttribute attach="attributes-aVelocity" count={count} array={velocities} itemSize={3} />
                <bufferAttribute attach="attributes-aSize" count={count} array={sizes} itemSize={1} />
                <bufferAttribute attach="attributes-aGroup" count={count} array={groups} itemSize={1} />
            </bufferGeometry>
            <shaderMaterial 
                vertexShader={bigExplosionVertexShader} 
                fragmentShader={bigExplosionFragmentShader} 
                uniforms={{ uTime: { value: 0 } }}
                transparent 
                depthWrite={false} 
                blending={THREE.AdditiveBlending} 
            />
        </points>
    );
};

// --- MOLECULES AND HELPERS ---
const waterVertexShader = `
varying vec2 vUv; varying vec3 vNormal; varying vec3 vPosition;
void main() { vUv = uv; vNormal = normalize(normalMatrix * normal); vPosition = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const waterFragmentShader = `
uniform float uTime; uniform vec3 uBaseColor; varying vec2 vUv; varying vec3 vNormal;
float random (in vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }
float noise (in vec2 st) { vec2 i = floor(st); vec2 f = fract(st); float a = random(i); float b = random(i + vec2(1.0, 0.0)); float c = random(i + vec2(0.0, 1.0)); float d = random(i + vec2(1.0, 1.0)); vec2 u = f * f * (3.0 - 2.0 * f); return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y; }
void main() { vec2 flowUv = vUv * 4.0; flowUv.y -= uTime * 0.5; float n = noise(flowUv); vec3 viewDir = vec3(0.0, 0.0, 1.0); float fresnel = pow(1.0 - dot(vNormal, viewDir), 2.0); vec3 color = uBaseColor; color += vec3(0.4) * smoothstep(0.4, 0.6, n); color += vec3(0.5, 0.8, 1.0) * fresnel; gl_FragColor = vec4(color, 0.85); }
`;

const H2OMolecule: React.FC<{ scaleRef?: React.MutableRefObject<number> }> = ({ scaleRef }) => {
    const groupRef = useRef<THREE.Group>(null);
    const waterUniforms = useMemo(() => ({ uTime: { value: 0 }, uBaseColor: { value: new THREE.Color('#22aaff') } }), []);
    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        const s = scaleRef ? (1.0 + scaleRef.current * 0.3) : 1.0;
        if (groupRef.current) { groupRef.current.rotation.y = t * 0.5; groupRef.current.rotation.x = Math.sin(t * 0.5) * 0.1; groupRef.current.scale.set(1.5 * s, 1.5 * s, 1.5 * s); }
        waterUniforms.uTime.value = t;
    });
    return (
        <group ref={groupRef} scale={1.5}>
            <mesh> <sphereGeometry args={[0.8, 64, 64]} /> <shaderMaterial vertexShader={waterVertexShader} fragmentShader={waterFragmentShader} uniforms={waterUniforms} transparent /> </mesh>
            <mesh position={[0.7, 0.6, 0]}> <sphereGeometry args={[0.4, 32, 32]} /> <shaderMaterial vertexShader={waterVertexShader} fragmentShader={waterFragmentShader} uniforms={waterUniforms} transparent /> </mesh>
            <mesh position={[-0.7, 0.6, 0]}> <sphereGeometry args={[0.4, 32, 32]} /> <shaderMaterial vertexShader={waterVertexShader} fragmentShader={waterFragmentShader} uniforms={waterUniforms} transparent /> </mesh>
        </group>
    );
};

const HClMolecule: React.FC<{ scaleRef?: React.MutableRefObject<number> }> = ({ scaleRef }) => {
    const groupRef = useRef<THREE.Group>(null);
    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        const s = scaleRef ? (1.0 + scaleRef.current * 0.2) : 1.0;
        if (groupRef.current) { groupRef.current.rotation.y = t * 0.5; groupRef.current.rotation.z = Math.sin(t * 0.3) * 0.1; groupRef.current.scale.set(s, s, s); }
    });
    return (
        <group ref={groupRef}>
            <mesh position={[0.8, 0, 0]}> <sphereGeometry args={[0.3, 32, 32]} /> <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.1} emissive="#333333" /> </mesh>
            <mesh position={[-0.4, 0, 0]}> <sphereGeometry args={[0.7, 32, 32]} /> <meshStandardMaterial color="#00ff00" roughness={0.3} metalness={0.2} transparent opacity={0.9} emissive="#003300" /> </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]} position={[0.2, 0, 0]}> <cylinderGeometry args={[0.1, 0.1, 1.2, 8]} /> <meshStandardMaterial color="#cccccc" /> </mesh>
        </group>
    );
};

const NH3Molecule: React.FC<{ scaleRef?: React.MutableRefObject<number> }> = ({ scaleRef }) => {
    const groupRef = useRef<THREE.Group>(null);
    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        const s = scaleRef ? (1.0 + scaleRef.current * 0.2) : 1.0;
        if (groupRef.current) { groupRef.current.rotation.y = t * 0.5; groupRef.current.rotation.x = Math.sin(t * 0.2) * 0.1; groupRef.current.scale.set(s, s, s); }
    });
    return (
        <group ref={groupRef}>
            <mesh position={[0, 0.2, 0]}> <sphereGeometry args={[0.6, 32, 32]} /> <meshStandardMaterial color="#0000ff" roughness={0.3} metalness={0.1} emissive="#000044" /> </mesh>
            {[0, 120, 240].map((angle, i) => {
                const rad = angle * (Math.PI / 180);
                const x = Math.cos(rad) * 0.7; const z = Math.sin(rad) * 0.7;
                return (
                    <group key={i}>
                         <mesh position={[x, -0.4, z]}> <sphereGeometry args={[0.3, 32, 32]} /> <meshStandardMaterial color="#ffffff" roughness={0.2} emissive="#444444" /> </mesh>
                        <mesh position={[x/2, -0.1, z/2]} rotation={[0.5, -rad - Math.PI/2, 0]}> <cylinderGeometry args={[0.08, 0.08, 0.8, 8]} /> <meshStandardMaterial color="#cccccc" /> </mesh>
                    </group>
                )
            })}
        </group>
    );
};

const Fe2O3Molecule: React.FC<{ scaleRef?: React.MutableRefObject<number> }> = ({ scaleRef }) => {
    const groupRef = useRef<THREE.Group>(null);
    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        const s = scaleRef ? (1.0 + scaleRef.current * 0.2) : 1.0;
        if (groupRef.current) { groupRef.current.rotation.y = t * 0.5; groupRef.current.rotation.z = Math.cos(t * 0.1) * 0.05; groupRef.current.scale.set(s, s, s); }
    });
    return (
        <group ref={groupRef}>
            <mesh position={[-0.6, 0, 0]}> <sphereGeometry args={[0.55, 32, 32]} /> <meshStandardMaterial color="#d45500" roughness={0.4} metalness={0.6} emissive="#441100" /> </mesh>
            <mesh position={[0.6, 0, 0]}> <sphereGeometry args={[0.55, 32, 32]} /> <meshStandardMaterial color="#d45500" roughness={0.4} metalness={0.6} emissive="#441100" /> </mesh>
            <mesh position={[0, 0.6, 0]}> <sphereGeometry args={[0.45, 32, 32]} /> <meshStandardMaterial color="#ff0000" roughness={0.3} emissive="#440000" /> </mesh>
            <mesh position={[0, -0.6, 0]}> <sphereGeometry args={[0.45, 32, 32]} /> <meshStandardMaterial color="#ff0000" roughness={0.3} emissive="#440000" /> </mesh>
            <mesh position={[0, 0, 0.6]}> <sphereGeometry args={[0.45, 32, 32]} /> <meshStandardMaterial color="#ff0000" roughness={0.3} emissive="#440000" /> </mesh>
             <mesh position={[-0.3, 0.3, 0]} rotation={[0, 0, -0.8]}> <cylinderGeometry args={[0.08, 0.08, 0.9, 8]} /> <meshStandardMaterial color="#888888" /> </mesh>
             <mesh position={[0.3, 0.3, 0]} rotation={[0, 0, 0.8]}> <cylinderGeometry args={[0.08, 0.08, 0.9, 8]} /> <meshStandardMaterial color="#888888" /> </mesh>
            <mesh position={[-0.3, -0.3, 0]} rotation={[0, 0, 0.8]}> <cylinderGeometry args={[0.08, 0.08, 0.9, 8]} /> <meshStandardMaterial color="#888888" /> </mesh>
             <mesh position={[0.3, -0.3, 0]} rotation={[0, 0, -0.8]}> <cylinderGeometry args={[0.08, 0.08, 0.9, 8]} /> <meshStandardMaterial color="#888888" /> </mesh>
        </group>
    );
};

const CaCl2Molecule: React.FC<{ scaleRef?: React.MutableRefObject<number> }> = ({ scaleRef }) => {
    const groupRef = useRef<THREE.Group>(null);
    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        const s = scaleRef ? (1.0 + scaleRef.current * 0.2) : 1.0;
        if (groupRef.current) { groupRef.current.rotation.y = t * 0.5; groupRef.current.rotation.x = t * 0.1; groupRef.current.scale.set(s, s, s); }
    });
    return (
        <group ref={groupRef}>
            <mesh position={[0, 0, 0]}> <sphereGeometry args={[0.65, 32, 32]} /> <meshStandardMaterial color="#aaaaaa" roughness={0.3} metalness={0.4} emissive="#222222" /> </mesh>
            <mesh position={[1.2, 0, 0]}> <sphereGeometry args={[0.55, 32, 32]} /> <meshStandardMaterial color="#00ff00" roughness={0.3} transparent opacity={0.9} emissive="#003300" /> </mesh>
            <mesh position={[-1.2, 0, 0]}> <sphereGeometry args={[0.55, 32, 32]} /> <meshStandardMaterial color="#00ff00" roughness={0.3} transparent opacity={0.9} emissive="#003300" /> </mesh>
             <mesh position={[0.6, 0, 0]} rotation={[0, 0, 1.57]}> <cylinderGeometry args={[0.1, 0.1, 1.2, 8]} /> <meshStandardMaterial color="#cccccc" /> </mesh>
            <mesh position={[-0.6, 0, 0]} rotation={[0, 0, 1.57]}> <cylinderGeometry args={[0.1, 0.1, 1.2, 8]} /> <meshStandardMaterial color="#cccccc" /> </mesh>
        </group>
    );
};

const NO2Molecule: React.FC<{ scaleRef?: React.MutableRefObject<number> }> = ({ scaleRef }) => {
    const groupRef = useRef<THREE.Group>(null);
    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        const s = scaleRef ? (1.0 + scaleRef.current * 0.2) : 1.0;
        if (groupRef.current) { groupRef.current.rotation.y = t * 0.5; groupRef.current.scale.set(s, s, s); }
    });
    return (
        <group ref={groupRef}>
            <mesh position={[0, 0.3, 0]}> <sphereGeometry args={[0.5, 32, 32]} /> <meshStandardMaterial color="#0000ff" roughness={0.3} emissive="#000044" /> </mesh>
            <mesh position={[0.9, -0.4, 0]}> <sphereGeometry args={[0.45, 32, 32]} /> <meshStandardMaterial color="#ff0000" roughness={0.3} emissive="#440000" /> </mesh>
            <mesh position={[-0.9, -0.4, 0]}> <sphereGeometry args={[0.45, 32, 32]} /> <meshStandardMaterial color="#ff0000" roughness={0.3} emissive="#440000" /> </mesh>
             <mesh position={[0.45, -0.05, 0]} rotation={[0, 0, -0.8]}> <cylinderGeometry args={[0.1, 0.1, 1.0, 8]} /> <meshStandardMaterial color="#888888" /> </mesh>
            <mesh position={[-0.45, -0.05, 0]} rotation={[0, 0, 0.8]}> <cylinderGeometry args={[0.1, 0.1, 1.0, 8]} /> <meshStandardMaterial color="#888888" /> </mesh>
        </group>
    );
};

const H2CO3Molecule: React.FC<{ scaleRef?: React.MutableRefObject<number> }> = ({ scaleRef }) => {
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
            {/* Carbon Center (Black/Grey) */}
            <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[0.45, 32, 32]} />
                <meshStandardMaterial color="#333333" roughness={0.3} />
            </mesh>

            {/* Top Oxygen (Double Bonded, Red) */}
            <mesh position={[0, 0.8, 0]}>
                <sphereGeometry args={[0.4, 32, 32]} />
                <meshStandardMaterial color="#ff0000" roughness={0.3} emissive="#440000" />
            </mesh>
            {/* Double Bond connectors */}
            <mesh position={[-0.12, 0.4, 0]}>
                <cylinderGeometry args={[0.06, 0.06, 0.8, 8]} />
                <meshStandardMaterial color="#cccccc" />
            </mesh>
            <mesh position={[0.12, 0.4, 0]}>
                <cylinderGeometry args={[0.06, 0.06, 0.8, 8]} />
                <meshStandardMaterial color="#cccccc" />
            </mesh>

            {/* Left Oxygen (Single Bonded, Red) */}
            <mesh position={[-0.7, -0.5, 0]}>
                <sphereGeometry args={[0.4, 32, 32]} />
                <meshStandardMaterial color="#ff0000" roughness={0.3} emissive="#440000" />
            </mesh>
             {/* Left C-O Bond */}
            <mesh position={[-0.35, -0.25, 0]} rotation={[0, 0, -2.1]}>
                 <cylinderGeometry args={[0.08, 0.08, 0.8, 8]} />
                 <meshStandardMaterial color="#cccccc" />
            </mesh>
            {/* Left Hydrogen (White) */}
            <mesh position={[-1.1, -0.7, 0]}>
                 <sphereGeometry args={[0.25, 32, 32]} />
                 <meshStandardMaterial color="#ffffff" />
            </mesh>
             {/* Left O-H Bond */}
            <mesh position={[-0.9, -0.6, 0]} rotation={[0, 0, -2.5]}>
                 <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
                 <meshStandardMaterial color="#cccccc" />
            </mesh>

            {/* Right Oxygen (Single Bonded, Red) */}
            <mesh position={[0.7, -0.5, 0]}>
                <sphereGeometry args={[0.4, 32, 32]} />
                <meshStandardMaterial color="#ff0000" roughness={0.3} emissive="#440000" />
            </mesh>
            {/* Right C-O Bond */}
            <mesh position={[0.35, -0.25, 0]} rotation={[0, 0, 2.1]}>
                 <cylinderGeometry args={[0.08, 0.08, 0.8, 8]} />
                 <meshStandardMaterial color="#cccccc" />
            </mesh>
             {/* Right Hydrogen (White) */}
             <mesh position={[1.1, -0.7, 0]}>
                 <sphereGeometry args={[0.25, 32, 32]} />
                 <meshStandardMaterial color="#ffffff" />
            </mesh>
             {/* Right O-H Bond */}
            <mesh position={[0.9, -0.6, 0]} rotation={[0, 0, 2.5]}>
                 <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
                 <meshStandardMaterial color="#cccccc" />
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
        // Only show simple burst if not a huge explosion
        if (combinedElement.symbol !== 'BOOM') {
            setShowBurst(true);
            const t = setTimeout(() => setShowBurst(false), 1000);
            return () => clearTimeout(t);
        }
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
    if (element.symbol === 'H2CO3' && !combinedElement) return <H2CO3Molecule scaleRef={scaleRef} />;
    
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
    
    if (combinedElement.symbol === 'BOOM') return <BigExplosion />;

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
    if (combinedElement.symbol === 'H2CO3') {
        return <H2CO3Molecule scaleRef={combinedPinchRef} />;
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
      <directionalLight position={[0, 0, 10]} intensity={1.5} color="#ffffff" />
      <pointLight position={[10, 10, 10]} intensity={1.5} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} color="#00ffff" />
      
      <CatalystSimulation activeCatalyst={activeCatalyst} />

      {showBurst && <CollisionBurst color={combinedElement ? combinedElement.color : '#ffffff'} />}

      <group ref={leftGroupRef}>
         {renderElement(leftElement, leftPinchRef, opacities.left, !combinedElement)}
         {!combinedElement && <AtomLabel element={leftElement} position={[0, -1.2, 0]} />}
      </group>

      <group ref={rightGroupRef}>
         {renderElement(rightElement, rightPinchRef, opacities.right, !combinedElement)}
         {!combinedElement && <AtomLabel element={rightElement} position={[0, -1.2, 0]} />}
      </group>

      <group ref={combinedGroupRef}>
        {renderCombined()}
        {combinedElement && combinedElement.symbol !== 'BOOM' && <AtomLabel element={combinedElement} position={[0, -2.5, 0]} />}
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
