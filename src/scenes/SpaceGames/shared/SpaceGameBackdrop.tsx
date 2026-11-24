import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { NOOP_RAYCAST } from '@/scenes/SpaceGames/shared/CharacterModels';

/**
 * Generates a crisp procedural planetary ground texture (craters, tactical rings, fractures)
 * owned locally by the caller and disposed on unmount.
 */
export function createPlanetaryArenaTexture(
  baseColor: string,
  craterColor: string,
  ringColor: string,
  seed = 1
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const half = size * 0.5;
  const bg = ctx.createRadialGradient(half, half, 20, half, half, half);
  bg.addColorStop(0, baseColor);
  bg.addColorStop(1, craterColor);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Deterministic surface craters & regolith speckles
  let s = seed * 9301 + 49297;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  for (let i = 0; i < 65; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 6 + rand() * 28;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.stroke();
  }

  // Concentric tactical arena rings (no square grid overhang!)
  ctx.strokeStyle = ringColor;
  ctx.globalAlpha = 0.28;
  for (const frac of [0.22, 0.45, 0.7, 0.92]) {
    ctx.lineWidth = frac === 0.92 ? 3 : 1.4;
    ctx.beginPath();
    ctx.arc(half, half, half * frac, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Crosshair radar spokes
  ctx.globalAlpha = 0.16;
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(half, half);
    ctx.lineTo(half + Math.cos(a) * half * 0.92, half + Math.sin(a) * half * 0.92);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

interface SpaceGameStarfieldProps {
  tintHex?: string;
  count?: number;
  radius?: number;
}

/**
 * Lightweight 3D cosmic starfield & nebula dome shared across all 5 Space Games.
 * Zero dynamic lights, NOOP_RAYCAST, full GPU disposal on unmount.
 */
export const SpaceGameStarfield: React.FC<SpaceGameStarfieldProps> = ({
  tintHex = '#38bdf8',
  count = 1100,
  radius = 120,
}) => {
  const { geo, mat } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const tint = new THREE.Color(tintHex);
    const white = new THREE.Color('#f8fafc');
    const warm = new THREE.Color('#fde68a');
    const tmp = new THREE.Color();

    let s = 1337;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };

    for (let i = 0; i < count; i++) {
      const u = rand();
      const v = rand();
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = radius * (0.72 + rand() * 0.45);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const pick = rand();
      tmp.copy(pick < 0.6 ? white : pick < 0.85 ? tint : warm);
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.95,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      sizeAttenuation: true,
      depthWrite: false,
    });

    return { geo: geometry, mat: material };
  }, [count, radius, tintHex]);

  useEffect(() => {
    return () => {
      geo.dispose();
      mat.dispose();
    };
  }, [geo, mat]);

  return <points geometry={geo} material={mat} raycast={NOOP_RAYCAST} />;
};
