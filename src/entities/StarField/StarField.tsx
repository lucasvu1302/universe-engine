import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import starVert from '@/shaders/stars/starfield.vert.glsl';
import starFrag from '@/shaders/stars/starfield.frag.glsl';
import { useAppStore } from '@/stores/useAppStore';
import { PerformanceManager } from '@/engine/performance/PerformanceManager';

interface StarFieldProps {
  radius?: number;
}

export const StarField: React.FC<StarFieldProps> = ({ radius = 12000 }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const andromedaRef = useRef<THREE.Mesh>(null);
  const quality = useAppStore((state) => state.graphicsQuality);

  // Spectral star colors: O/B, A, G, K, M
  const starPalette = useMemo(
    () => [
      new THREE.Color('#a0c0ff'), // Blue-white
      new THREE.Color('#ffffff'), // White
      new THREE.Color('#fff4e8'), // Yellow
      new THREE.Color('#ffd2a1'), // Orange
      new THREE.Color('#ffaa6f')  // Reddish
    ],
    []
  );

  const starCount = useMemo(() => {
    return PerformanceManager.getInstance().getParticleCount(quality);
  }, [quality]);

  const { positions, colors, sizes, speeds, phases } = useMemo(() => {
    const pos = new Float32Array(starCount * 3);
    const col = new Float32Array(starCount * 3);
    const sz = new Float32Array(starCount);
    const spd = new Float32Array(starCount);
    const phs = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = radius * Math.cbrt(Math.random() * 0.7 + 0.3);

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      const paletteIndex = Math.floor(Math.random() * starPalette.length);
      const c = starPalette[paletteIndex];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;

      sz[i] = Math.random() * 2.8 + 1.2;
      spd[i] = Math.random() * 3.0 + 1.0;
      phs[i] = Math.random() * Math.PI * 2;
    }

    return { positions: pos, colors: col, sizes: sz, speeds: spd, phases: phs };
  }, [starCount, radius, starPalette]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWarpFactor: { value: 0 },
      uVelocity: { value: new THREE.Vector3(0, 0, 0) }
    }),
    []
  );

  // Procedural Andromeda Galaxy Texture
  const andromedaTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Galactic Core
    const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 240);
    grad.addColorStop(0, 'rgba(255, 250, 230, 0.95)');
    grad.addColorStop(0.12, 'rgba(255, 215, 160, 0.75)');
    grad.addColorStop(0.35, 'rgba(120, 170, 255, 0.45)');
    grad.addColorStop(0.65, 'rgba(70, 100, 220, 0.2)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Spiral Arm Streaks
    ctx.strokeStyle = 'rgba(160, 210, 255, 0.15)';
    ctx.lineWidth = 14;
    for (let a = 0; a < 2; a++) {
      ctx.beginPath();
      for (let i = 0; i < 200; i++) {
        const theta = (i / 200) * Math.PI * 3.5 + a * Math.PI;
        const r = 20 + i * 1.0;
        const x = 256 + Math.cos(theta) * r * 1.4;
        const y = 256 + Math.sin(theta) * r * 0.7;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  // Procedural Deep Space Emission Nebula Texture
  const nebulaTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Cyan / Magenta interstellar cloud
    const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 250);
    grad.addColorStop(0, 'rgba(217, 70, 239, 0.55)');   // Magenta core
    grad.addColorStop(0.35, 'rgba(56, 189, 248, 0.35)'); // Cyan gas
    grad.addColorStop(0.7, 'rgba(99, 102, 241, 0.15)');  // Indigo outer
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;
    }
    if (andromedaRef.current) {
      andromedaRef.current.rotation.z += delta * 0.002;
    }
  });

  return (
    <group>
      {/* 360° Infinite Starfield */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colors, 3]}
          />
          <bufferAttribute
            attach="attributes-aSize"
            args={[sizes, 1]}
          />
          <bufferAttribute
            attach="attributes-aSpeed"
            args={[speeds, 1]}
          />
          <bufferAttribute
            attach="attributes-aPhase"
            args={[phases, 1]}
          />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          vertexShader={starVert}
          fragmentShader={starFrag}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* 1. Distant Andromeda Galaxy (M31) */}
      <mesh
        ref={andromedaRef}
        position={[2800, 1800, -4500]}
        rotation={[0.6, -0.4, 0.3]}
      >
        <planeGeometry args={[1400, 700]} />
        <meshBasicMaterial
          map={andromedaTexture}
          transparent
          opacity={0.75}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 2. Large Magellanic Cloud */}
      <mesh
        position={[-3500, -2200, 2400]}
        rotation={[0.3, 0.8, -0.5]}
      >
        <planeGeometry args={[950, 650]} />
        <meshBasicMaterial
          map={nebulaTexture}
          transparent
          opacity={0.45}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 3. Deep Space Cosmic Emission Nebula (Orion / Carina Complex) */}
      <mesh
        position={[-1800, 2500, -3800]}
        rotation={[-0.4, 0.3, 0.8]}
      >
        <planeGeometry args={[1800, 1400]} />
        <meshBasicMaterial
          map={nebulaTexture}
          transparent
          opacity={0.35}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};
