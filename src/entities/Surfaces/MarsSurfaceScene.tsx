import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface MarsSurfaceSceneProps {
  visible: boolean;
}

export const MarsSurfaceScene: React.FC<MarsSurfaceSceneProps> = ({ visible }) => {
  const dustParticlesRef = useRef<THREE.Points>(null);

  // 1. Procedural 3D Terrain Geometry for Jezero Crater
  const terrainGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(300, 300, 96, 96);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      // Multi-frequency Martian dune ridges and crater rim elevation
      const d1 = Math.sin(x * 0.04) * Math.cos(z * 0.04) * 4.5;
      const d2 = Math.sin(x * 0.12 + z * 0.08) * 1.8;
      const distFromCenter = Math.sqrt(x * x + z * z);
      const craterRim = Math.sin(Math.min(Math.PI, distFromCenter * 0.025)) * 6.0;

      pos.setY(i, d1 + d2 + craterRim - 5.0);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  // 2. Volumetric Martian Dust Storm Particles (3,000 drifting dust specks)
  const dustData = useMemo(() => {
    const count = 2500;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 240;
      positions[i * 3 + 1] = Math.random() * 35;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 240;

      velocities[i * 3] = 0.8 + Math.random() * 0.6; // High-speed easterly wind
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    }

    return { positions, velocities };
  }, []);

  useFrame((_, delta) => {
    if (!visible || !dustParticlesRef.current) return;

    const posAttr = dustParticlesRef.current.geometry.attributes.position;
    const pos = posAttr.array as Float32Array;

    for (let i = 0; i < pos.length / 3; i++) {
      pos[i * 3] += dustData.velocities[i * 3] * delta * 15.0;
      pos[i * 3 + 1] += dustData.velocities[i * 3 + 1] * delta * 5.0;
      pos[i * 3 + 2] += dustData.velocities[i * 3 + 2] * delta * 5.0;

      // Wrap around boundary
      if (pos[i * 3] > 120) pos[i * 3] = -120;
      if (pos[i * 3 + 1] > 35) pos[i * 3 + 1] = 0.5;
      if (pos[i * 3 + 1] < 0.2) pos[i * 3 + 1] = 30;
    }
    posAttr.needsUpdate = true;
  });

  if (!visible) return null;

  return (
    <group position={[0, -2, 0]}>
      {/* Martian Atmospheric Sky Dome with Signature Blue Sunset */}
      <mesh>
        <sphereGeometry args={[280, 32, 16]} />
        <meshBasicMaterial
          color="#c86432"
          side={THREE.BackSide}
          fog={false}
        />
      </mesh>

      {/* Blue Martian Sunset Sun Glow */}
      <mesh position={[180, 25, -160]}>
        <sphereGeometry args={[14, 16, 16]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>

      {/* 3D Jezero Crater Terrain */}
      <mesh geometry={terrainGeo} receiveShadow>
        <meshStandardMaterial
          color="#b44218"
          roughness={0.92}
          metalness={0.08}
          flatShading
        />
      </mesh>

      {/* Volumetric Dust Storm */}
      <points ref={dustParticlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[dustData.positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.65}
          color="#e08244"
          transparent
          opacity={0.45}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Directional Martian Sunlight */}
      <directionalLight
        position={[180, 60, -160]}
        intensity={1.8}
        color="#ffe2cc"
      />
      <ambientLight intensity={0.4} color="#7c2d12" />

      {/* Scattered Martian Boulders */}
      {[
        [-12, -1.2, 8, 1.8],
        [15, -0.8, -14, 2.4],
        [-35, -2.1, -25, 3.2],
        [42, -1.5, 30, 2.8],
        [5, -2.5, 22, 1.5]
      ].map(([x, y, z, s], idx) => (
        <mesh key={`rock-${idx}`} position={[x, y, z]} scale={[s, s * 0.7, s]}>
          <dodecahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#882f12" roughness={0.95} />
        </mesh>
      ))}

      {/* Perseverance Rover Mockup */}
      <group position={[0, -2.4, 0]} scale={0.75}>
        {/* Chassis */}
        <mesh position={[0, 1.0, 0]}>
          <boxGeometry args={[3.2, 1.2, 2.4]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Mast Camera */}
        <mesh position={[1.2, 2.2, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 1.8]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
        <mesh position={[1.2, 3.1, 0]}>
          <boxGeometry args={[0.5, 0.35, 0.4]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        {/* Wheels (6 Rocker-Bogie wheels) */}
        {[-1.4, 0, 1.4].map((wx, wIdx) => (
          <React.Fragment key={`wheel-pair-${wIdx}`}>
            <mesh position={[wx, 0.4, 1.5]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.45, 0.45, 0.4, 16]} />
              <meshStandardMaterial color="#1e293b" roughness={0.8} />
            </mesh>
            <mesh position={[wx, 0.4, -1.5]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.45, 0.45, 0.4, 16]} />
              <meshStandardMaterial color="#1e293b" roughness={0.8} />
            </mesh>
          </React.Fragment>
        ))}
      </group>
    </group>
  );
};
