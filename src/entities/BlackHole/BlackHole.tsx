import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CELESTIAL_BODIES } from '@/data/celestialData';
import { useAppStore } from '@/stores/useAppStore';
import { PerformanceManager } from '@/engine/performance/PerformanceManager';
import { AssetManager } from '@/engine/assets/AssetManager';

import blackholeVert from '@/shaders/blackhole/blackhole.vert.glsl';
import blackholeFrag from '@/shaders/blackhole/blackhole.frag.glsl';

interface BlackHoleProps {
  onSelect?: (id: string) => void;
  onFocus?: (id: string) => void;
}

export const BlackHole: React.FC<BlackHoleProps> = ({ onSelect, onFocus }) => {
  const groupRef = useRef<THREE.Group>(null);
  const volumeMatRef = useRef<THREE.ShaderMaterial>(null);

  const data = CELESTIAL_BODIES.blackhole;
  const setHoveredId = useAppStore((state) => state.setHoveredId);
  const selectedTarget = useAppStore((state) => state.targetId);
  const quality = useAppStore((state) => state.graphicsQuality);
  const detectedGPUTier = useAppStore((state) => state.detectedGPUTier);
  const isSelected = selectedTarget === 'blackhole';

  const position: [number, number, number] = [0, 180, -1200];

  const scratchCamPos = useMemo(() => new THREE.Vector3(), []);
  const unitSphere = useMemo(() => AssetManager.getInstance().getUnitSphereGeometry(48), []);
  const hitSphere = useMemo(() => AssetManager.getInstance().getUnitSphereGeometry(24), []);

  const raymarchSteps = useMemo(
    () => PerformanceManager.getInstance().getQualityProfile(quality, detectedGPUTier).raymarchSteps,
    [quality, detectedGPUTier]
  );

  const volumeUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uLocalCamPos: { value: new THREE.Vector3(0, 30, 120) },
      uMaxSteps: { value: 48 },
      uVolumeRadius: { value: 65.0 }
    }),
    []
  );

  useEffect(() => {
    volumeUniforms.uMaxSteps.value = raymarchSteps;
  }, [raymarchSteps, volumeUniforms]);

  useEffect(() => {
    const mat = volumeMatRef.current;
    return () => {
      mat?.dispose();
    };
  }, []);

  useFrame((state, delta) => {
    if (groupRef.current && volumeMatRef.current) {
      volumeMatRef.current.uniforms.uTime.value += delta;
      scratchCamPos.copy(state.camera.position);
      groupRef.current.worldToLocal(scratchCamPos);
      volumeMatRef.current.uniforms.uLocalCamPos.value.copy(scratchCamPos);

      // Single-sided adaptive culling: FrontSide outside 65.5, BackSide inside 65.5
      const desiredSide = scratchCamPos.length() < 65.5 ? THREE.BackSide : THREE.FrontSide;
      if (volumeMatRef.current.side !== desiredSide) {
        volumeMatRef.current.side = desiredSide;
        volumeMatRef.current.needsUpdate = true;
      }
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[0.26, 0.12, 0.04]}
    >
      {/* 1. Interactive Click & Hover Target Sphere */}
      <mesh
        geometry={hitSphere}
        scale={18.0}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.('blackhole');
          onFocus?.('blackhole');
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onFocus?.('blackhole');
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredId('blackhole');
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHoveredId(null);
          document.body.style.cursor = 'auto';
        }}
      >
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* 2. Unified Relativistic Schwarzschild Geodesic Raymarching Volume (Single-sided) */}
      <mesh geometry={unitSphere} scale={65.0} raycast={() => null}>
        <shaderMaterial
          ref={volumeMatRef}
          vertexShader={blackholeVert}
          fragmentShader={blackholeFrag}
          uniforms={volumeUniforms}
          transparent
          side={THREE.FrontSide}
          depthWrite={false}
        />
      </mesh>

      {/* 3. Delicate Telemetry Reticle when Selected */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]} raycast={() => null}>
          <ringGeometry
            args={[
              data.visualRadius * 1.88,
              data.visualRadius * 1.9,
              128
            ]}
          />
          <meshBasicMaterial
            color="#f97316"
            side={THREE.DoubleSide}
            transparent
            opacity={0.35}
          />
        </mesh>
      )}
    </group>
  );
};
