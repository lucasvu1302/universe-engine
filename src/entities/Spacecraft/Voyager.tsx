import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SpacecraftEphemeris } from '@/engine/ephemeris/SpacecraftEphemeris';

interface VoyagerProps {
  id: 'voyager1' | 'voyager2';
  onFocus?: () => void;
}

export const Voyager: React.FC<VoyagerProps> = ({ id, onFocus }) => {
  const groupRef = useRef<THREE.Group>(null);
  const pingRingRef = useRef<THREE.Mesh>(null);
  const ephem = SpacecraftEphemeris.getInstance();

  const isVoyager1 = id === 'voyager1';
  const pos = React.useMemo(() => {
    const target = new THREE.Vector3();
    return isVoyager1 ? ephem.getVoyager1Position(target) : ephem.getVoyager2Position(target);
  }, [isVoyager1, ephem]);

  useFrame((_, delta) => {
    if (pingRingRef.current) {
      pingRingRef.current.scale.addScalar(delta * 2.2);
      const mat = pingRingRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity -= delta * 0.45;
      if (mat.opacity <= 0.05) {
        pingRingRef.current.scale.set(1, 1, 1);
        mat.opacity = 0.9;
      }
    }
  });

  return (
    <group position={pos} ref={groupRef} onClick={onFocus} scale={0.7}>
      {/* 1. 3.7-meter Parabolic High-Gain Dish Antenna pointed back at Earth */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <sphereGeometry args={[2.5, 32, 16, 0, Math.PI * 2, 0, 0.75]} />
        <meshStandardMaterial
          color="#f8fafc"
          roughness={0.4}
          metalness={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. Central Subcarrier Feed Horn */}
      <mesh position={[0, 0, 1.2]}>
        <coneGeometry args={[0.2, 1.0, 16]} />
        <meshStandardMaterial color="#475569" metalness={0.8} />
      </mesh>

      {/* 3. Golden Record attached to bus */}
      <mesh position={[0.9, -0.6, -0.4]} rotation={[0, Math.PI / 4, 0]}>
        <cylinderGeometry args={[0.45, 0.45, 0.02, 32]} />
        <meshStandardMaterial
          color="#eab308"
          emissive="#ca8a04"
          emissiveIntensity={0.5}
          metalness={0.98}
          roughness={0.1}
        />
      </mesh>

      {/* 4. Radio Telemetry Ping Expanding Wave towards Earth */}
      <mesh ref={pingRingRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.8, 3.2, 32]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Radio Signal Beacon */}
      <pointLight color="#38bdf8" intensity={2.0} distance={40} />
    </group>
  );
};
