import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface MeteorImpactProps {
  active: boolean;
  targetPosition: [number, number, number];
  onComplete?: () => void;
}

export const MeteorImpact: React.FC<MeteorImpactProps> = ({
  active,
  targetPosition,
  onComplete
}) => {
  const meteorRef = useRef<THREE.Mesh>(null);
  const shockwaveRef = useRef<THREE.Mesh>(null);
  const magmaCraterRef = useRef<THREE.Mesh>(null);

  const [phase, setPhase] = useState<'IDLE' | 'APPROACHING' | 'IMPACTED'>('IDLE');
  const progressRef = useRef(0);

  useEffect(() => {
    if (active) {
      setPhase('APPROACHING');
      progressRef.current = 0;
    } else {
      setPhase('IDLE');
    }
  }, [active]);

  useFrame((_, delta) => {
    if (phase === 'APPROACHING') {
      progressRef.current += delta * 0.95; // Fast terminal descent

      if (meteorRef.current) {
        const startX = targetPosition[0] + 45;
        const startY = targetPosition[1] + 35;
        const startZ = targetPosition[2] + 45;

        const p = Math.min(1.0, progressRef.current);
        meteorRef.current.position.set(
          THREE.MathUtils.lerp(startX, targetPosition[0], p),
          THREE.MathUtils.lerp(startY, targetPosition[1], p),
          THREE.MathUtils.lerp(startZ, targetPosition[2], p)
        );

        if (p >= 1.0) {
          setPhase('IMPACTED');
          progressRef.current = 0;
        }
      }
    } else if (phase === 'IMPACTED') {
      progressRef.current += delta;
      const t = progressRef.current;

      // 1. Expanding Shockwave Ring
      if (shockwaveRef.current) {
        const scale = 1.0 + t * 24.0;
        shockwaveRef.current.scale.set(scale, scale, 1);
        const mat = shockwaveRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0.0, 0.9 - t * 0.45);
      }

      // 2. Cooling Magma Crater
      if (magmaCraterRef.current) {
        const mat = magmaCraterRef.current.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = Math.max(0.0, 3.5 - t * 0.7);
      }

      if (t > 4.5 && onComplete) {
        onComplete();
      }
    }
  });

  if (!active || phase === 'IDLE') return null;

  return (
    <group>
      {/* 1. Incandescent Meteor Fireball during descent */}
      {phase === 'APPROACHING' && (
        <mesh ref={meteorRef}>
          <dodecahedronGeometry args={[1.6, 2]} />
          <meshStandardMaterial
            color="#ff5500"
            emissive="#ffaa00"
            emissiveIntensity={4.0}
            roughness={0.2}
          />
          {/* Ionized atmospheric trail */}
          <pointLight color="#ff8800" intensity={6.0} distance={60} />
        </mesh>
      )}

      {/* 2. Kinetic Impact Site */}
      {phase === 'IMPACTED' && (
        <group position={targetPosition}>
          {/* Glowing Molten Magma Crater */}
          <mesh ref={magmaCraterRef} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.2, 4.5, 32]} />
            <meshStandardMaterial
              color="#1c1917"
              emissive="#ea580c"
              emissiveIntensity={3.5}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* High-Velocity Shockwave Blast Wave */}
          <mesh ref={shockwaveRef} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[4.2, 5.8, 48]} />
            <meshBasicMaterial
              color="#fbbf24"
              transparent
              opacity={0.85}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          {/* Impact Flash Light */}
          <pointLight color="#fed7aa" intensity={12.0} distance={80} />
        </group>
      )}
    </group>
  );
};
