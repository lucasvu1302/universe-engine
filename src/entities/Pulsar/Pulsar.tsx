import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface PulsarProps {
  position?: [number, number, number];
  onSelect?: () => void;
}

export const Pulsar: React.FC<PulsarProps> = ({
  position = [-380, 140, -420],
  onSelect
}) => {
  const coreRef = useRef<THREE.Mesh>(null);
  const beamGroupRef = useRef<THREE.Group>(null);
  const magnetosphereRef = useRef<THREE.Points>(null);

  useFrame((_, delta) => {
    // 1. Relativistic high-RPM spin
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 12.0;
    }

    // 2. Sweeping beam precession
    if (beamGroupRef.current) {
      beamGroupRef.current.rotation.y += delta * 16.0;
      beamGroupRef.current.rotation.z = Math.sin(beamGroupRef.current.rotation.y * 0.2) * 0.35;
    }

    // 3. Magnetosphere plasma particles
    if (magnetosphereRef.current) {
      magnetosphereRef.current.rotation.y -= delta * 4.0;
    }
  });

  return (
    <group position={position} onClick={onSelect}>
      {/* 1. Ultra-dense Neutron Core */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[2.5, 32, 32]} />
        <meshStandardMaterial
          color="#06b6d4"
          emissive="#67e8f9"
          emissiveIntensity={3.5}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* Core Halo Glow */}
      <mesh scale={1.4}>
        <sphereGeometry args={[2.5, 32, 32]} />
        <meshBasicMaterial
          color="#0ea5e9"
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 2. Sweeping Relativistic Pulsar Beams (North & South) */}
      <group ref={beamGroupRef}>
        {/* North Beam */}
        <mesh position={[0, 42, 0]} rotation={[0, 0, 0]}>
          <coneGeometry args={[3.2, 80, 32, 1, true]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.65}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* South Beam */}
        <mesh position={[0, -42, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[3.2, 80, 32, 1, true]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.65}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {/* 3. High-energy Magnetosphere Particle Ring */}
      <points ref={magnetosphereRef}>
        <ringGeometry args={[4.0, 18.0, 64]} />
        <pointsMaterial
          size={0.4}
          color="#c084fc"
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Radiation Beacon Pointlight */}
      <pointLight color="#38bdf8" intensity={4.5} distance={120} />
    </group>
  );
};
