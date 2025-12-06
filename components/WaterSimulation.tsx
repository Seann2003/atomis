import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TrackingData } from "../types";

interface WaterSimulationProps {
  trackingRef: React.MutableRefObject<TrackingData>;
}

// --- SHADERS ---

const waterVertexShader = `
uniform float uTime;
uniform float uTension; // 0 to 1 based on hand stress
uniform vec3 uHandLeft;
uniform vec3 uHandRight;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying float vDisplacement;
varying float vThickness;

// Simplex 3D Noise 
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
  vUv = uv;
  vec3 pos = position;

  // Very subtle surface texture - smooth bubble with minimal distortion
  float noiseFreq = 3.0; // Higher frequency for finer, smoother detail
  float noiseAmp = 0.01;  // Very small amplitude for smooth surface
  float noise = snoise(pos * noiseFreq + uTime * 0.15);
  
  // Hand Interaction (very subtle bulge)
  float dLeft = distance(pos, uHandLeft);
  float dRight = distance(pos, uHandRight);
  
  float interaction = 0.0;
  interaction += smoothstep(3.0, 0.0, dLeft) * 0.08; 
  interaction += smoothstep(3.0, 0.0, dRight) * 0.08;

  // Very subtle gravity effect - barely noticeable
  float gravityEffect = smoothstep(0.5, -0.5, pos.y) * 0.02;

  // Minimal displacement for smooth bubble surface
  float totalDisp = noise * noiseAmp + interaction + gravityEffect;
  vec3 newPos = pos + normal * totalDisp;

  vDisplacement = totalDisp;
  
  // Calculate thickness for bubble effect (thinner at top, thicker at bottom)
  vThickness = 0.3 + (1.0 - smoothstep(-0.3, 0.3, pos.y)) * 0.2;
  
  vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
  
  // Use original normal with minimal distortion
  vNormal = normalize(normalMatrix * normal); 
}
`;

const waterFragmentShader = `
uniform float uTime;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying float vDisplacement;
varying float vThickness;

void main() {
  vec3 dx = dFdx(vViewPosition);
  vec3 dy = dFdy(vViewPosition);
  vec3 normal = normalize(cross(dx, dy));

  vec3 viewDir = normalize(vViewPosition);
  vec3 lightDir = normalize(vec3(5.0, 10.0, 7.0)); 
  vec3 halfDir = normalize(lightDir + viewDir);
  
  float NdotL = max(dot(normal, lightDir), 0.0);
  float NdotH = max(dot(normal, halfDir), 0.0);
  
  // Strong specular highlight for bubble
  float specular = pow(NdotH, 120.0) * 2.0; 
  
  // Fresnel effect - stronger at edges (bubble rim)
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.0);
  
  // Water bubble colors - cyan/blue with transparency
  vec3 waterColor = vec3(0.2, 0.6, 0.9);
  vec3 rimColor = vec3(0.4, 0.8, 1.0);
  
  // Mix based on fresnel (edges are brighter)
  vec3 albedo = mix(waterColor, rimColor, fresnel * 0.5);
  
  // Add caustics-like effect
  float caustics = sin(vViewPosition.x * 10.0 + uTime * 2.0) * 
                   sin(vViewPosition.y * 10.0 + uTime * 2.0) * 0.1 + 0.9;
  
  // Final Composition - bubble appearance
  vec3 finalColor = albedo * caustics + (specular * vec3(1.0)) + (fresnel * vec3(0.3, 0.7, 1.0) * 0.5);
  
  // Transparency - more transparent in center, more opaque at edges
  float alpha = 0.3 + fresnel * 0.4;
  
  gl_FragColor = vec4(finalColor, alpha); 
}
`;

const WaterSimulation: React.FC<WaterSimulationProps> = ({ trackingRef }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const dropletsRef = useRef<THREE.InstancedMesh>(null);

  // Dripping droplets at bottom
  const dropletCount = 40;
  const dropletData = useMemo(() => {
    return new Array(dropletCount).fill(0).map(() => {
      // Start droplets at bottom of bubble
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.2 + Math.random() * 0.1;
      const startY = -1.0 - Math.random() * 0.5; // Start below bubble

      return {
        position: new THREE.Vector3(
          Math.cos(angle) * radius * 0.3, // Concentrate at bottom
          startY,
          Math.sin(angle) * radius * 0.3
        ),
        velocity: Math.random() * 0.08 + 0.03,
        scale: Math.random() * 0.15 + 0.08,
        angle: angle,
        radius: radius,
        phase: Math.random() * Math.PI * 2, // Random phase for staggered dripping
      };
    });
  }, []);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTension: { value: 0 },
      uHandLeft: { value: new THREE.Vector3(-10, -10, -10) },
      uHandRight: { value: new THREE.Vector3(10, 10, 10) },
    }),
    []
  );

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const data = trackingRef.current;

    // Update Main Water Sphere
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = t;

      // Map Tension
      const avgTension =
        (data.left.pinchDistance + data.right.pinchDistance) / 2;
      mat.uniforms.uTension.value = THREE.MathUtils.lerp(
        mat.uniforms.uTension.value,
        avgTension,
        0.1
      );

      // Map Hands
      const mapX = (x: number) => (x - 0.5) * 18;
      const mapY = (y: number) => -(y - 0.5) * 10;

      const lx = mapX(data.left.position.x);
      const ly = mapY(data.left.position.y);
      const rx = mapX(data.right.position.x);
      const ry = mapY(data.right.position.y);

      mat.uniforms.uHandLeft.value.set(lx, ly, 0);
      mat.uniforms.uHandRight.value.set(rx, ry, 0);

      meshRef.current.rotation.y = t * 0.1;
      meshRef.current.rotation.z = Math.sin(t * 0.2) * 0.1;
    }

    // Update Dripping Droplets
    if (dropletsRef.current) {
      dropletData.forEach((d, i) => {
        // Only start dripping after phase delay
        const dripTime = t + d.phase;
        if (dripTime > 1.0) {
          // Droplet falls down
          d.position.y -= d.velocity;

          // Slight horizontal drift
          d.position.x += Math.sin(t * 2.0 + d.phase) * 0.01;
          d.position.z += Math.cos(t * 2.0 + d.phase) * 0.01;

          // Reset when it falls too far
          if (d.position.y < -2.5) {
            // Reset to bottom of bubble with new random phase
            const angle = Math.random() * Math.PI * 2;
            d.position.x = Math.cos(angle) * d.radius * 0.3;
            d.position.y = -1.0 - Math.random() * 0.3;
            d.position.z = Math.sin(angle) * d.radius * 0.3;
            d.phase = Math.random() * Math.PI * 2;
          }
        } else {
          // Still attached to bubble bottom
          const angle = d.angle + Math.sin(t * 0.5) * 0.1;
          d.position.x = Math.cos(angle) * d.radius * 0.3;
          d.position.z = Math.sin(angle) * d.radius * 0.3;
        }

        dummy.position.copy(d.position);
        dummy.scale.setScalar(d.scale);
        dummy.updateMatrix();
        dropletsRef.current!.setMatrixAt(i, dummy.matrix);
      });
      dropletsRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Main Water Bubble - Spherical */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.2, 64, 64]} />
        <shaderMaterial
          vertexShader={waterVertexShader}
          fragmentShader={waterFragmentShader}
          uniforms={uniforms}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Dripping Water Droplets at Bottom */}
      <instancedMesh
        ref={dropletsRef}
        args={[undefined, undefined, dropletCount]}
      >
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshPhysicalMaterial
          color="#4da6ff"
          transmission={0.95}
          opacity={0.9}
          transparent
          roughness={0.1}
          ior={1.33}
          thickness={0.3}
          metalness={0.1}
        />
      </instancedMesh>
    </group>
  );
};

export default WaterSimulation;
