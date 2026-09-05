import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CELESTIAL_BODIES } from '@/data/celestialData';
import { useAppStore } from '@/stores/useAppStore';

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
  const isSelected = selectedTarget === 'blackhole';

  // Position in deep space (cosmic anomaly far beyond Pluto)
  const position: [number, number, number] = [0, 180, -1200];

  const scratchCamPos = useMemo(() => new THREE.Vector3(), []);

  const volumeUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uLocalCamPos: { value: new THREE.Vector3(0, 30, 120) }
    }),
    []
  );

  useFrame((state, delta) => {
    if (groupRef.current && volumeMatRef.current) {
      volumeMatRef.current.uniforms.uTime.value += delta;
      scratchCamPos.copy(state.camera.position);
      groupRef.current.worldToLocal(scratchCamPos);
      volumeMatRef.current.uniforms.uLocalCamPos.value.copy(scratchCamPos);
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
        <sphereGeometry args={[18.0, 32, 32]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* 2. Unified Relativistic Schwarzschild Geodesic Raymarching Volume */}
      <mesh>
        <sphereGeometry args={[65.0, 64, 64]} />
        <shaderMaterial
          ref={volumeMatRef}
          vertexShader={blackholeVert}
          fragmentShader={blackholeFrag}
          uniforms={volumeUniforms}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 3. Delicate Telemetry Reticle when Selected */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
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
