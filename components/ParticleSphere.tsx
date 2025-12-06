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

const vertexShader = `
  uniform float uTime;
  uniform float uScale; // Controls the spread/radius
  uniform float uTurbulence; // Controls the chaotic movement
  
  attribute float aSize;
  attribute float aSpeed;
  attribute vec3 aRandom;
  
  varying vec3 vColor;
  varying float vAlpha;
  
  // Simplex noise function for organic movement
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
    vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
    vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y
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
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
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
    
    // Orbital rotation
    float t = uTime * 0.2 * aSpeed;
    float c = cos(t);
    float s = sin(t);
    mat2 rot = mat2(c, -s, s, c);
    pos.xz = rot * pos.xz;
    
    // Noise field movement
    float noiseVal = snoise(pos * 2.0 + uTime * 0.5);
    pos += normal * noiseVal * (0.1 + uTurbulence * 0.2);

    // Expansion Logic:
    // uScale 0 -> tightly packed nucleus
    // uScale 1 -> expanded gas cloud
    // Base radius is 1.0. 
    float expansion = 0.5 + (uScale * 2.5); // Range 0.5 to 3.0
    
    vec3 finalPos = pos * expansion;

    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Size attenuation
    // Particles get slightly smaller when cloud expands to maintain density illusion
    float sizeFactor = 1.0 - (uScale * 0.3);
    gl_PointSize = (aSize * sizeFactor * 80.0) / -mvPosition.z;
    
    // Distance fade for soft edges
    float dist = length(finalPos);
    vAlpha = smoothstep(expansion + 1.0, expansion - 0.5, dist);
  }
`;

const fragmentShader = `
  uniform vec3 uColor;
  uniform float uOpacity; // Global opacity for fade in/out
  varying float vAlpha;
  
  void main() {
    // Round particle
    vec2 xy = gl_PointCoord.xy - vec2(0.5);
    float r = length(xy);
    if (r > 0.5) discard;
    
    // Soft glow gradient
    float glow = 1.0 - (r * 2.0);
    glow = pow(glow, 1.5);
    
    // Hotter center color
    vec3 coreColor = vec3(1.0, 1.0, 1.0);
    vec3 finalColor = mix(uColor, coreColor, glow * 0.4);
    
    gl_FragColor = vec4(finalColor, glow * vAlpha * uOpacity);
  }
`;

const ParticleSphere: React.FC<ParticleSphereProps> = ({ element, scaleRef, opacityTarget }) => {
  const meshRef = useRef<THREE.Points>(null);
  const count = 3000;
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uScale: { value: 0.0 },
    uTurbulence: { value: 0.0 },
    uColor: { value: new THREE.Color(element.color) },
    uOpacity: { value: 0 }
  }), []); // Init only

  const { positions, sizes, speeds } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const sp = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Gaussian-ish distribution for a core-heavy cloud
      const r = Math.pow(Math.random(), 3); // More points near center
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      sz[i] = Math.random() * 0.5 + 0.5;
      sp[i] = Math.random() + 0.2;
    }
    return { positions: pos, sizes: sz, speeds: sp };
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const pinchValue = scaleRef.current; // 0 to 1

    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = time;
      
      // Smoothly update scale (Cloud Expansion)
      // Lerp current value towards pinch value
      material.uniforms.uScale.value = THREE.MathUtils.lerp(
        material.uniforms.uScale.value,
        pinchValue,
        0.1
      );

      // Turbulence increases with expansion
      material.uniforms.uTurbulence.value = THREE.MathUtils.lerp(
        material.uniforms.uTurbulence.value,
        pinchValue,
        0.1
      );

      // Color transition
      material.uniforms.uColor.value.lerp(new THREE.Color(element.color), 0.05);

      // Opacity fade logic (for fusion transition)
      material.uniforms.uOpacity.value = THREE.MathUtils.lerp(
        material.uniforms.uOpacity.value,
        opacityTarget,
        0.1
      );
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aSize" count={sizes.length} array={sizes} itemSize={1} />
        <bufferAttribute attach="attributes-aSpeed" count={speeds.length} array={speeds} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </points>
  );
};

export default ParticleSphere;