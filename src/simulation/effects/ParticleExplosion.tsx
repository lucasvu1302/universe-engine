import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ParticleExplosionProps {
  progress: number; // 0 to 1
  count?: number;
  primaryColor?: string;
  secondaryColor?: string;
  maxSpread?: number;
}

export const ParticleExplosion: React.FC<ParticleExplosionProps> = ({
  progress,
  count = 1200,
  primaryColor = "#ffaa00",
  secondaryColor = "#ff2200",
  maxSpread = 70
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);

  // Generate initial velocity directions and colors
  const { velocities, basePositions, colors } = useMemo(() => {
    const vels = new Float32Array(count * 3);
    const pos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);

    const c1 = new THREE.Color(primaryColor);
    const c2 = new THREE.Color(secondaryColor);
    const tempCol = new THREE.Color();

    for (let i = 0; i < count; i++) {
      // Uniform sphere distribution
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const speed = 0.3 + Math.random() * 0.7;

      const vx = Math.sin(phi) * Math.cos(theta) * speed;
      const vy = Math.sin(phi) * Math.sin(theta) * speed;
      const vz = Math.cos(phi) * speed;

      vels[i * 3] = vx;
      vels[i * 3 + 1] = vy;
      vels[i * 3 + 2] = vz;

      pos[i * 3] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = 0;

      // Color variation between primary and secondary
      tempCol.copy(c1).lerp(c2, Math.random());
      cols[i * 3] = tempCol.r;
      cols[i * 3 + 1] = tempCol.g;
      cols[i * 3 + 2] = tempCol.b;
    }

    return { velocities: vels, basePositions: pos, colors: cols };
  }, [count, primaryColor, secondaryColor]);

  // Current dynamic positions buffer
  const currentPositions = useMemo(() => new Float32Array(basePositions), [basePositions]);

  const clamped = Math.min(Math.max(progress, 0), 1);
  const opacity = Math.pow(1.0 - clamped, 1.5);

  useFrame(() => {
    if (!pointsRef.current) return;
    const geom = pointsRef.current.geometry;
    const posAttr = geom.attributes.position as THREE.BufferAttribute;

    const expansion = Math.max(1.0, clamped * maxSpread);
    for (let i = 0; i < count; i++) {
      currentPositions[i * 3] = velocities[i * 3] * expansion;
      currentPositions[i * 3 + 1] = velocities[i * 3 + 1] * expansion;
      currentPositions[i * 3 + 2] = velocities[i * 3 + 2] * expansion;
    }
    posAttr.copyArray(currentPositions);
    posAttr.needsUpdate = true;

    if (matRef.current) {
      matRef.current.opacity = opacity;
    }
  });

  if (clamped < 0 || clamped >= 1) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[currentPositions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        size={1.8}
        vertexColors
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};
