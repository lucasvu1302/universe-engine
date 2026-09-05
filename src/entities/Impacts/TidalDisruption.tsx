import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface TidalDisruptionProps {
  active: boolean;
  blackHolePosition?: [number, number, number];
  onComplete?: () => void;
}

export const TidalDisruption: React.FC<TidalDisruptionProps> = ({
  active,
  blackHolePosition = [0, 180, -1200],
  onComplete
}) => {
  const streamRef = useRef<THREE.Points>(null);
  const jetRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  // Generate 800 spaghettified particle debris
  const particles = React.useMemo(() => {
    const count = 900;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 4.0;
      const radius = 25.0 + (i / count) * 45.0;
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = ((Math.random() - 0.5) * 4.0);
      pos[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return pos;
  }, []);

  useFrame((_, delta) => {
    if (!active) return;
    timeRef.current += delta;
    const t = timeRef.current;

    // Spiral accretion into event horizon
    if (streamRef.current) {
      streamRef.current.rotation.y += delta * 3.5;
      const scale = Math.max(0.05, 1.0 - t * 0.15);
      streamRef.current.scale.set(scale, scale, scale);
    }

    // Relativistic Gamma-Ray Jet
    if (jetRef.current) {
      const jetScaleY = Math.min(2.5, t * 1.2);
      jetRef.current.scale.set(1, jetScaleY, 1);
      const mat = jetRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0.0, 1.0 - t * 0.18);
    }

    if (t > 6.0 && onComplete) {
      timeRef.current = 0;
      onComplete();
    }
  });

  if (!active) return null;

  return (
    <group position={blackHolePosition}>
      {/* 1. Spaghettified Debris Spiral Stream */}
      <points ref={streamRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particles, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={1.4}
          color="#f97316"
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* 2. Relativistic Gamma-Ray Burst Jet (North/South) */}
      <mesh ref={jetRef} position={[0, 0, 0]}>
        <cylinderGeometry args={[1.5, 4.0, 140, 16, 1, true]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <pointLight color="#f97316" intensity={15.0} distance={150} />
    </group>
  );
};
