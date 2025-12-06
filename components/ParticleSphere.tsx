import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ElementData } from '../types';

interface ParticleSphereProps {
  element: ElementData;
  scaleRef: React.MutableRefObject<number>;
  opacityTarget: number; // New prop to control fading
  isActive: boolean;
}

const coreVertexShader = `
  uniform float uTime;
  uniform float uScale; // Controls the spread/radius
  uniform float uTurbulence; // Controls the chaotic movement
  
  attribute float aSize;
  attribute float aSpeed;
  attribute float aLayer; // 0 = Core, 1 = Shell
  
  varying vec3 vColor;
  varying float vAlpha;
  
  // Simplex noise function
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute( permute( permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xzyw ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
    vec3 pos = position;
    
    // Rotation logic specific to particles
    float t = uTime * 0.5 * aSpeed;
    
    // Core (Layer 0) barely moves, Shell (Layer 1) spins
    if (aLayer > 0.5) {
        float c = cos(t);
        float s = sin(t);
        mat2 rot = mat2(c, -s, s, c);
        pos.xz = rot * pos.xz;
    }

    // Noise field movement
    float noiseVal = snoise(pos * 2.5 + uTime * 0.8);
    pos += normal * noiseVal * (0.05 + uTurbulence * 0.15);

    // Expansion Logic
    float expansion = 1.0 + (uScale * 3.0); 
    
    // If it's a shell particle, push it out further
    if (aLayer > 0.5) {
        pos *= expansion;
    } else {
        // Nucleus only expands slightly
        pos *= (1.0 + uScale * 0.5);
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Size attenuation
    gl_PointSize = (aSize * 50.0) / -mvPosition.z;
    
    // Alpha
    vAlpha = 1.0;
  }
`;

const coreFragmentShader = `
  uniform vec3 uColor;
  uniform float uOpacity; 
  varying float vAlpha;
  
  void main() {
    // Sharp circle with glow
    vec2 xy = gl_PointCoord.xy - vec2(0.5);
    float r = length(xy);
    if (r > 0.5) discard;
    
    // Hard center, soft edge
    float glow = 1.0 - smoothstep(0.1, 0.5, r);
    
    vec3 finalColor = mix(uColor, vec3(1.0), glow * 0.5); // Add white hot center
    
    gl_FragColor = vec4(finalColor, glow * uOpacity);
  }
`;

// --- NEW PARTICLE RING (Orbit) ---
const ringVertexShader = `
    attribute float aSize;
    attribute float aOffset;
    uniform float uTime;
    uniform vec3 uColor;
    varying vec3 vColor;
    
    void main() {
        vec3 pos = position;
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        // INCREASED SIZE HERE: 30.0 -> 70.0
        gl_PointSize = (aSize * 70.0) / -mvPosition.z; 
    }
`;

const ringFragmentShader = `
    uniform vec3 uColor;
    uniform float uOpacity;
    void main() {
        vec2 xy = gl_PointCoord.xy - vec2(0.5);
        if (length(xy) > 0.5) discard;
        
        float strength = 1.0 - length(xy) * 2.0;
        strength = pow(strength, 1.5);
        
        gl_FragColor = vec4(uColor, strength * uOpacity);
    }
`;

const OrbitalRing: React.FC<{ radius: number, speed: number, axis: [number, number, number], color: string, opacity: number }> = ({ radius, speed, axis, color, opacity }) => {
    const ref = useRef<THREE.Points>(null);
    const count = 150; // Number of particles in the ring

    const { positions, sizes, offsets } = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const sz = new Float32Array(count);
        const off = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            const theta = (i / count) * Math.PI * 2;
            // Circle on XZ plane initially
            pos[i * 3] = radius * Math.cos(theta);
            pos[i * 3 + 1] = 0; 
            pos[i * 3 + 2] = radius * Math.sin(theta);
            
            sz[i] = Math.random() * 0.5 + 0.8; // Slightly larger base size
            off[i] = Math.random() * Math.PI * 2;
        }
        return { positions: pos, sizes: sz, offsets: off };
    }, [radius]);

    useFrame((state) => {
        if (ref.current) {
            // Self Rotation Axis
            ref.current.rotation.x += axis[0] * speed;
            ref.current.rotation.y += axis[1] * speed;
            ref.current.rotation.z += axis[2] * speed;
        }
    });

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
                <bufferAttribute attach="attributes-aSize" count={sizes.length} array={sizes} itemSize={1} />
                <bufferAttribute attach="attributes-aOffset" count={offsets.length} array={offsets} itemSize={1} />
            </bufferGeometry>
            <shaderMaterial
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                vertexShader={ringVertexShader}
                fragmentShader={ringFragmentShader}
                uniforms={{
                    uColor: { value: new THREE.Color(color) },
                    uOpacity: { value: opacity }
                }}
            />
        </points>
    );
};

const ParticleSphere: React.FC<ParticleSphereProps> = ({ element, scaleRef, opacityTarget }) => {
  const meshRef = useRef<THREE.Points>(null);
  // INCREASED PARTICLES FOR DENSER LOOK
  const coreCount = 1500;
  const shellCount = 2000;
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uScale: { value: 0.0 },
    uTurbulence: { value: 0.0 },
    uColor: { value: new THREE.Color(element.color) },
    uOpacity: { value: 0 }
  }), []); 

  const { positions, sizes, speeds, layers } = useMemo(() => {
    const total = coreCount + shellCount;
    const pos = new Float32Array(total * 3);
    const sz = new Float32Array(total);
    const sp = new Float32Array(total);
    const lay = new Float32Array(total);

    // 1. Generate Core (Dense Sphere)
    for (let i = 0; i < coreCount; i++) {
        // REDUCED RADIUS (0.6 -> 0.5)
        const r = Math.pow(Math.random(), 3) * 0.5; 
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);

        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = r * Math.cos(phi);

        sz[i] = Math.random() * 1.5 + 0.5;
        sp[i] = Math.random() * 0.2;
        lay[i] = 0.0; // Core Layer
    }

    // 2. Generate Shell (Hollow Sphere surface)
    for (let i = coreCount; i < total; i++) {
        // REDUCED RADIUS (1.2 -> 0.9)
        const r = 0.9 + Math.random() * 0.2; 
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);

        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = r * Math.cos(phi);

        sz[i] = Math.random() * 0.8 + 0.2;
        sp[i] = Math.random() + 0.5;
        lay[i] = 1.0; // Shell Layer
    }

    return { positions: pos, sizes: sz, speeds: sp, layers: lay };
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const pinchValue = scaleRef.current; 

    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = time;
      
      material.uniforms.uScale.value = THREE.MathUtils.lerp(
        material.uniforms.uScale.value,
        pinchValue,
        0.1
      );

      material.uniforms.uTurbulence.value = THREE.MathUtils.lerp(
        material.uniforms.uTurbulence.value,
        pinchValue,
        0.1
      );

      material.uniforms.uColor.value.lerp(new THREE.Color(element.color), 0.1);
      
      material.uniforms.uOpacity.value = THREE.MathUtils.lerp(
        material.uniforms.uOpacity.value,
        opacityTarget,
        0.1
      );
    }
  });

  return (
    <group>
        {/* Core & Shell Particles */}
        <points ref={meshRef}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
                <bufferAttribute attach="attributes-aSize" count={sizes.length} array={sizes} itemSize={1} />
                <bufferAttribute attach="attributes-aSpeed" count={speeds.length} array={speeds} itemSize={1} />
                <bufferAttribute attach="attributes-aLayer" count={layers.length} array={layers} itemSize={1} />
            </bufferGeometry>
            <shaderMaterial
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                vertexShader={coreVertexShader}
                fragmentShader={coreFragmentShader}
                uniforms={uniforms}
            />
        </points>

        {/* Futuristic Orbital Particle Rings (Decreased Radius for tighter fit) */}
        {opacityTarget > 0.1 && (
            <>
                <OrbitalRing radius={1.1} speed={0.03} axis={[0.2, 1, 0.2]} color={element.color} opacity={opacityTarget * 1.5} />
                <OrbitalRing radius={1.3} speed={0.04} axis={[1, 0.2, 0.2]} color={element.color} opacity={opacityTarget * 1.3} />
                <OrbitalRing radius={1.5} speed={0.02} axis={[0.5, 0.5, 1]} color="#ffffff" opacity={opacityTarget * 1.0} />
            </>
        )}
    </group>
  );
};

export default ParticleSphere;