import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SpacecraftEphemeris } from '@/engine/ephemeris/SpacecraftEphemeris';
import { SimulationClock } from '@/engine/simulation/SimulationClock';

interface JWSTProps {
  earthPosition: THREE.Vector3;
  onFocus?: () => void;
}

export const JWST: React.FC<JWSTProps> = ({ earthPosition, onFocus }) => {
  const groupRef = useRef<THREE.Group>(null);
  const ephem = SpacecraftEphemeris.getInstance();
  const tempPos = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!groupRef.current) return;
    const simTime = SimulationClock.getInstance().simulationTime;
    const pos = ephem.getJWSTPosition(simTime, earthPosition, tempPos.current);
    groupRef.current.position.copy(pos);

    // Sunshield permanently shields mirror from the Sun at (0, 0, 0)
    groupRef.current.lookAt(new THREE.Vector3(0, 0, 0));
  });

  return (
    <group ref={groupRef} onClick={onFocus} scale={0.4}>
      {/* 1. Diamond-shaped 5-Layer Sunshield */}
      <mesh position={[0, -0.4, 0]} rotation={[Math.PI / 2, 0, Math.PI / 4]}>
        <planeGeometry args={[7.2, 7.2]} />
        <meshStandardMaterial
          color="#cbd5e1"
          metalness={0.95}
          roughness={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. 18 Hexagonal Gold Primary Mirrors */}
      <group position={[0, 0.8, 0]} rotation={[-Math.PI / 6, 0, 0]}>
        {/* Central Backplane Hexagon array */}
        <mesh>
          <cylinderGeometry args={[2.2, 2.2, 0.15, 6]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#f59e0b"
            emissiveIntensity={0.65}
            metalness={0.98}
            roughness={0.05}
          />
        </mesh>

        {/* 3. Secondary Mirror Tripod Mast */}
        <mesh position={[0, 0, 2.8]}>
          <cylinderGeometry args={[0.35, 0.35, 0.1, 6]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.98} />
        </mesh>
        {/* Tripod struts */}
        {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((angle, idx) => (
          <group key={`strut-${idx}`} rotation={[0, 0, angle]}>
            <mesh position={[0, 1.2, 1.4]} rotation={[0.6, 0, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 3.2]} />
              <meshStandardMaterial color="#475569" />
            </mesh>
          </group>
        ))}
      </group>

      <pointLight color="#f59e0b" intensity={1.5} distance={20} />
    </group>
  );
};
