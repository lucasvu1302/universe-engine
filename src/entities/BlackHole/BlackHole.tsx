import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CELESTIAL_BODIES } from '@/data/celestialData';
import { useAppStore } from '@/stores/useAppStore';

import blackholeVert from '@/shaders/blackhole/blackhole.vert.glsl';
import blackholeFrag from '@/shaders/blackhole/blackhole.frag.glsl';
import blackholeLensingVert from '@/shaders/blackhole/blackholeLensing.vert.glsl';
import blackholeLensingFrag from '@/shaders/blackhole/blackholeLensing.frag.glsl';

interface BlackHoleProps {
  onSelect?: (id: string) => void;
  onFocus?: (id: string) => void;
}

export const BlackHole: React.FC<BlackHoleProps> = ({ onSelect, onFocus }) => {
  const groupRef = useRef<THREE.Group>(null);
  const diskMatRef = useRef<THREE.ShaderMaterial>(null);
  const lensingMatRef = useRef<THREE.ShaderMaterial>(null);
  const lensingMeshRef = useRef<THREE.Mesh>(null);

  const data = CELESTIAL_BODIES.blackhole;
  const setHoveredId = useAppStore((state) => state.setHoveredId);
  const selectedTarget = useAppStore((state) => state.targetId);
  const isSelected = selectedTarget === 'blackhole';

  // Position in deep space (cosmic anomaly far beyond Pluto)
  const position: [number, number, number] = [0, 180, -1200];

  const diskUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCenter: { value: new THREE.Vector3(...position) }
    }),
    []
  );

  const lensingUniforms = useMemo(
    () => ({
      uTime: { value: 0 }
    }),
    []
  );

  useFrame((state, delta) => {
    if (diskMatRef.current) {
      diskMatRef.current.uniforms.uTime.value += delta;
    }
    if (lensingMatRef.current) {
      lensingMatRef.current.uniforms.uTime.value += delta;
    }
    // Lensing halo dynamically billboards to face camera, ensuring seamless 360° perspective
    if (lensingMeshRef.current) {
      lensingMeshRef.current.quaternion.copy(state.camera.quaternion);
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* 1. Event Horizon: Absolute Light Absorbing Black Sphere */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.('blackhole');
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
        <sphereGeometry args={[data.visualRadius * 0.36, 64, 64]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* 2. Primary Relativistic Accretion Disk (Equatorial Plane) */}
      <mesh rotation={[Math.PI / 2.3, 0.1, 0.35]}>
        <planeGeometry args={[data.visualRadius * 3.4, data.visualRadius * 3.4]} />
        <shaderMaterial
          ref={diskMatRef}
          vertexShader={blackholeVert}
          fragmentShader={blackholeFrag}
          uniforms={diskUniforms}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 3. Einstein Gravitational Lensing Halo (Dynamically billboarded to face camera) */}
      <mesh ref={lensingMeshRef}>
        <planeGeometry args={[data.visualRadius * 2.8, data.visualRadius * 2.8]} />
        <shaderMaterial
          ref={lensingMatRef}
          vertexShader={blackholeLensingVert}
          fragmentShader={blackholeLensingFrag}
          uniforms={lensingUniforms}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 4. Delicate Telemetry Reticle when Selected */}
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
