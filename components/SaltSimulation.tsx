
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// --- SALT PILE (Active Fusion Animation) ---
// Visual: A mound of white crystalline cubes
export const SaltPile: React.FC = () => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const count = 500; // Number of crystals

    const dummy = useMemo(() => new THREE.Object3D(), []);
    const crystals = useMemo(() => {
        const data = [];
        for (let i = 0; i < count; i++) {
            // Gaussian-like distribution for a pile shape
            const angle = Math.random() * Math.PI * 2;
            const r = Math.sqrt(-2 * Math.log(Math.random())) * 1.5; // Radius spread
            const height = Math.max(0, 2.5 - r * 1.2) + (Math.random() * 0.5);
            
            data.push({
                x: r * Math.cos(angle) * 0.5,
                y: height - 2.0, // Center vertically
                z: r * Math.sin(angle) * 0.5,
                rotX: Math.random() * Math.PI,
                rotY: Math.random() * Math.PI,
                rotZ: Math.random() * Math.PI,
                scale: Math.random() * 0.15 + 0.05
            });
        }
        return data;
    }, []);

    useFrame((state) => {
        if (meshRef.current) {
            const t = state.clock.getElapsedTime();
            // Slowly rotate the entire pile
            meshRef.current.rotation.y = t * 0.1;
        }
    });

    // Set initial positions
    useMemo(() => {
        if (meshRef.current) {
            crystals.forEach((d, i) => {
                dummy.position.set(d.x, d.y, d.z);
                dummy.rotation.set(d.rotX, d.rotY, d.rotZ);
                dummy.scale.setScalar(d.scale);
                dummy.updateMatrix();
                meshRef.current!.setMatrixAt(i, dummy.matrix);
            });
            meshRef.current.instanceMatrix.needsUpdate = true;
        }
    }, [crystals, dummy]);

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <boxGeometry args={[1, 1, 1]} /> {/* Cubic crystals */}
            {/* Opaque white material for better visibility */}
            <meshStandardMaterial 
                color="#ffffff"
                roughness={0.4}
                metalness={0.1}
                emissive="#333333" // Slight self-illumination
            />
        </instancedMesh>
    );
};

// --- SALT LATTICE (Saved Molecule Structure) ---
// Visual: 3x3x3 Grid of alternating Na (Purple) and Cl (Green) spheres
export const SaltLattice: React.FC<{ scaleRef?: React.MutableRefObject<number> }> = ({ scaleRef }) => {
    const groupRef = useRef<THREE.Group>(null);
    const gridSize = 3;
    const spacing = 0.7;
    const offset = ((gridSize - 1) * spacing) / 2;

    const atoms = useMemo(() => {
        const list = [];
        for (let x = 0; x < gridSize; x++) {
            for (let y = 0; y < gridSize; y++) {
                for (let z = 0; z < gridSize; z++) {
                    const isNa = (x + y + z) % 2 === 0;
                    list.push({
                        type: isNa ? 'Na' : 'Cl',
                        pos: [x * spacing - offset, y * spacing - offset, z * spacing - offset] as [number, number, number]
                    });
                }
            }
        }
        return list;
    }, [offset]);

    // Generate Bonds (Connections)
    const bonds = useMemo(() => {
        const list = [];
        // Helper to add bond
        const addBond = (p1: number[], p2: number[], key: string) => {
            const start = new THREE.Vector3(...p1);
            const end = new THREE.Vector3(...p2);
            const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
            const dist = start.distanceTo(end);
            
            // Quaternion for rotation
            const quaternion = new THREE.Quaternion();
            const direction = new THREE.Vector3().subVectors(end, start).normalize();
            const up = new THREE.Vector3(0, 1, 0);
            quaternion.setFromUnitVectors(up, direction);
            const euler = new THREE.Euler().setFromQuaternion(quaternion);

            list.push({ pos: mid, rot: euler, height: dist, key });
        };

        // Simple grid connectivity
        for (let x = 0; x < gridSize; x++) {
            for (let y = 0; y < gridSize; y++) {
                for (let z = 0; z < gridSize; z++) {
                    const curr = [x * spacing - offset, y * spacing - offset, z * spacing - offset];
                    if (x < gridSize - 1) addBond(curr, [(x+1) * spacing - offset, y * spacing - offset, z * spacing - offset], `x-${x}${y}${z}`);
                    if (y < gridSize - 1) addBond(curr, [x * spacing - offset, (y+1) * spacing - offset, z * spacing - offset], `y-${x}${y}${z}`);
                    if (z < gridSize - 1) addBond(curr, [x * spacing - offset, y * spacing - offset, (z+1) * spacing - offset], `z-${x}${y}${z}`);
                }
            }
        }
        return list;
    }, [offset]);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        // SCALING FIX: Apply a base multiplier (0.6) to reduce size overall
        const s = (scaleRef ? (1.0 + scaleRef.current * 0.2) : 1.0) * 0.6;

        if (groupRef.current) {
            groupRef.current.rotation.y = t * 0.2;
            groupRef.current.rotation.x = Math.sin(t * 0.3) * 0.1;
            groupRef.current.scale.set(s, s, s);
        }
    });

    return (
        <group ref={groupRef}>
            {atoms.map((atom, i) => (
                <mesh key={i} position={atom.pos}>
                    <sphereGeometry args={[atom.type === 'Na' ? 0.25 : 0.35, 32, 32]} />
                    <meshStandardMaterial 
                        color={atom.type === 'Na' ? '#800080' : '#00ff00'} // Purple (Na), Green (Cl)
                        roughness={0.3}
                        metalness={0.2}
                    />
                </mesh>
            ))}
            {bonds.map((bond) => (
                <mesh key={bond.key} position={bond.pos} rotation={bond.rot}>
                    <cylinderGeometry args={[0.05, 0.05, bond.height, 8]} />
                    <meshStandardMaterial color="#cccccc" />
                </mesh>
            ))}
        </group>
    );
};
