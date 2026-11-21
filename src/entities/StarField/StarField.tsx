import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import starVert from '@/shaders/stars/starfield.vert.glsl';
import starFrag from '@/shaders/stars/starfield.frag.glsl';
import { useAppStore } from '@/stores/useAppStore';
import { PerformanceManager } from '@/engine/performance/PerformanceManager';
import { AssetManager } from '@/engine/assets/AssetManager';
import { CameraManager } from '@/engine/camera/CameraManager';

interface StarFieldProps {
  radius?: number;
}

const NOOP_RAYCAST: THREE.Object3D['raycast'] = () => {};

export const StarField: React.FC<StarFieldProps> = ({ radius = 12000 }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const andromedaRef = useRef<THREE.Mesh>(null);
  const magellanicRef = useRef<THREE.Mesh>(null);
  const nebulaMeshRef = useRef<THREE.Mesh>(null);
  const quality = useAppStore((state) => state.graphicsQuality);
  const detectedGPUTier = useAppStore((state) => state.detectedGPUTier);

  const starPalette = useMemo(
    () => [
      new THREE.Color('#a0c0ff'),
      new THREE.Color('#ffffff'),
      new THREE.Color('#fff4e8'),
      new THREE.Color('#ffd2a1'),
      new THREE.Color('#ffaa6f')
    ],
    []
  );

  const starCount = useMemo(() => {
    return PerformanceManager.getInstance().getParticleCount(quality, detectedGPUTier);
  }, [quality, detectedGPUTier]);

  const { geometry, positions, colors, sizes, speeds, phases } = useMemo(() => {
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

    const g = new THREE.BufferGeometry();
    return {
      geometry: g,
      positions: pos,
      colors: col,
      sizes: sz,
      speeds: spd,
      phases: phs
    };
  }, [starCount, radius, starPalette]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWarpSpeed: { value: 0 },
      uVelocityDirection: { value: new THREE.Vector3(0, 0, 1) }
    }),
    []
  );

  const assets = AssetManager.getInstance();
  const andromedaTexture = useMemo(() => assets.getAndromedaTexture(), [assets]);
  const nebulaTexture = useMemo(() => assets.getDeepSpaceNebulaTexture(), [assets]);

  useEffect(() => {
    const mat = materialRef.current;
    const m1 = andromedaRef.current;
    const m2 = magellanicRef.current;
    const m3 = nebulaMeshRef.current;
    return () => {
      mat?.dispose();
      for (const m of [m1, m2, m3]) {
        m?.geometry?.dispose();
        (m?.material as THREE.Material | undefined)?.dispose();
      }
    };
  }, []);

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;
      const store = useAppStore.getState();
      if (store.reducedMotion) {
        materialRef.current.uniforms.uWarpSpeed.value = 0;
      } else {
        const camMgr = CameraManager.getInstance();
        const speed = camMgr.velocity.length();
        const targetWarp =
          store.cameraMode === 'TRANSITIONING'
            ? 0.35
            : THREE.MathUtils.clamp(speed / 95.0, 0, 0.55);
        materialRef.current.uniforms.uWarpSpeed.value = THREE.MathUtils.lerp(
          materialRef.current.uniforms.uWarpSpeed.value,
          targetWarp,
          delta * 5.0
        );
        if (speed > 0.1) {
          materialRef.current.uniforms.uVelocityDirection.value
            .copy(camMgr.velocity)
            .normalize();
        }
      }
    }
    if (andromedaRef.current) {
      andromedaRef.current.rotation.z += delta * 0.002;
    }
  });

  return (
    <group>
      {/* 360° Infinite Starfield */}
      <points raycast={NOOP_RAYCAST}>
        <primitive object={geometry} attach="geometry">
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
          <bufferAttribute attach="attributes-aTwinkleSpeed" args={[speeds, 1]} />
          <bufferAttribute attach="attributes-aTwinklePhase" args={[phases, 1]} />
        </primitive>
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
        raycast={NOOP_RAYCAST}
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
        ref={magellanicRef}
        position={[-3500, -2200, 2400]}
        rotation={[0.3, 0.8, -0.5]}
        raycast={NOOP_RAYCAST}
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

      {/* 3. Deep Space Cosmic Emission Nebula */}
      <mesh
        ref={nebulaMeshRef}
        position={[-1800, 2500, -3800]}
        rotation={[-0.4, 0.3, 0.8]}
        raycast={NOOP_RAYCAST}
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
