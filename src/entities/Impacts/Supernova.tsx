import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SupernovaProps {
  active: boolean;
  position?: [number, number, number];
  onComplete?: () => void;
}

export const Supernova: React.FC<SupernovaProps> = ({
  active,
  position = [-220, 90, -180],
  onComplete
}) => {
  const blastMeshRef = useRef<THREE.Mesh>(null);
  const flashLightRef = useRef<THREE.PointLight>(null);
  const nebulaRingRef = useRef<THREE.Points>(null);
  const timeRef = useRef(0);

  // 1,200 particle remnant nebula
  const nebulaParticles = React.useMemo(() => {
    const count = 1200;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 2.0 + Math.random() * 2.0;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, []);

  useFrame((_, delta) => {
    if (!active) return;
    timeRef.current += delta;
    const t = timeRef.current;

    // 1. Blinding Flash fading out
    if (flashLightRef.current) {
      flashLightRef.current.intensity = Math.max(0.0, 30.0 - t * 6.0);
    }

    // 2. Expanding Shockwave Sphere
    if (blastMeshRef.current) {
      const scale = 1.0 + t * 28.0;
      blastMeshRef.current.scale.set(scale, scale, scale);
      const mat = blastMeshRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0.0, 0.85 - t * 0.15);
    }

    // 3. Expanding Remnant Nebula Particles
    if (nebulaRingRef.current) {
      const scale = 1.0 + t * 22.0;
      nebulaRingRef.current.scale.set(scale, scale, scale);
      nebulaRingRef.current.rotation.y += delta * 0.3;
    }

    if (t > 5.5 && onComplete) {
      timeRef.current = 0;
      onComplete();
    }
  });

  if (!active) return null;

  return (
    <group position={position}>
      {/* Blinding Flash Light */}
      <pointLight ref={flashLightRef} color="#ffffff" intensity={30.0} distance={400} />

      {/* Spherical Shockwave Hull */}
      <mesh ref={blastMeshRef}>
        <sphereGeometry args={[2.5, 32, 32]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.85}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Expanding Multi-Colored Remnant Nebula */}
      <points ref={nebulaRingRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[nebulaParticles, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={1.2}
          color="#ec4899"
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
};
