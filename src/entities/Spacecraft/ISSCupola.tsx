import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SpacecraftEphemeris } from '@/engine/ephemeris/SpacecraftEphemeris';
import { SimulationClock } from '@/engine/simulation/SimulationClock';

interface ISSProps {
  earthPosition: THREE.Vector3;
  onFocus?: () => void;
}

export const ISSCupola: React.FC<ISSProps> = ({ earthPosition, onFocus }) => {
  const groupRef = useRef<THREE.Group>(null);
  const solarRef = useRef<THREE.Group>(null);
  const ephem = SpacecraftEphemeris.getInstance();
  const tempPos = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!groupRef.current) return;
    const simTime = SimulationClock.getInstance().simulationTime;
    const pos = ephem.getISSPosition(simTime, earthPosition, tempPos.current);
    groupRef.current.position.copy(pos);

    // Keep bottom Cupola pointed directly at Earth's center
    groupRef.current.lookAt(earthPosition);

    // Solar panels track the Sun (0, 0, 0)
    if (solarRef.current) {
      solarRef.current.rotation.y = simTime * 0.5;
    }
  });

  return (
    <group ref={groupRef} onClick={onFocus} scale={0.35}>
      {/* 1. Main Integrated Truss (Central Backbone) */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 14.0, 8]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.2} />
      </mesh>

      {/* 2. Habitation Modules (Destiny, Zvezda, Unity) */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.7, 0.7, 5.0, 16]} />
        <meshStandardMaterial color="#f1f5f9" metalness={0.5} roughness={0.3} />
      </mesh>

      {/* 3. Cupola 7-Windowed Observation Module (Facing Earth) */}
      <mesh position={[0, 0, 2.7]}>
        <dodecahedronGeometry args={[0.65, 1]} />
        <meshStandardMaterial color="#0284c7" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* 4. Giant Solar Array Wings (8 Arrays) */}
      <group ref={solarRef}>
        {[-5.5, 5.5].map((tx, idx) => (
          <group key={`solar-wing-${idx}`} position={[tx, 0, 0]}>
            {/* Top Wing */}
            <mesh position={[0, 2.8, 0]}>
              <boxGeometry args={[1.8, 4.5, 0.05]} />
              <meshStandardMaterial
                color="#1e3a8a"
                emissive="#1d4ed8"
                emissiveIntensity={0.35}
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
            {/* Bottom Wing */}
            <mesh position={[0, -2.8, 0]}>
              <boxGeometry args={[1.8, 4.5, 0.05]} />
              <meshStandardMaterial
                color="#1e3a8a"
                emissive="#1d4ed8"
                emissiveIntensity={0.35}
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* Beacon Light */}
      <pointLight color="#38bdf8" intensity={1.5} distance={15} />
    </group>
  );
};
