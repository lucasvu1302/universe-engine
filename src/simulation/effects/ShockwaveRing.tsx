import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ShockwaveRingProps {
  progress: number; // 0 to 1
  maxRadius?: number;
  color?: string;
  thickness?: number;
  rotation?: [number, number, number];
}

export const ShockwaveRing: React.FC<ShockwaveRingProps> = ({
  progress,
  maxRadius = 80,
  color = "#38bdf8",
  thickness = 2.5,
  rotation = [Math.PI / 2, 0, 0]
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  const clamped = Math.min(Math.max(progress, 0), 1);
  const currentRadius = Math.max(0.1, clamped * maxRadius);
  const opacity = Math.pow(1.0 - clamped, 1.8);

  useFrame(() => {
    if (matRef.current) {
      matRef.current.opacity = opacity;
    }
  });

  if (clamped < 0 || clamped >= 1) return null;

  return (
    <mesh ref={meshRef} rotation={rotation}>
      <ringGeometry args={[currentRadius, currentRadius + thickness, 64]} />
      <meshBasicMaterial
        ref={matRef}
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
};
