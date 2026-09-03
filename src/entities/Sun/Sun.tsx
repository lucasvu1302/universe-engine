import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import sunVert from '@/shaders/sun/sun.vert.glsl';
import sunFrag from '@/shaders/sun/sun.frag.glsl';
import { CELESTIAL_BODIES } from '@/data/celestialData';
import { useAppStore } from '@/stores/useAppStore';

interface SunProps {
  onSelect?: () => void;
}

export const Sun: React.FC<SunProps> = ({ onSelect }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const setHoveredId = useAppStore((state) => state.setHoveredId);
  const sunData = CELESTIAL_BODIES.sun;

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorCore: { value: new THREE.Color('#ffffff') },
      uColorRim: { value: new THREE.Color('#ff7700') }
    }),
    []
  );

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;
    }
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Central Omnidirectional Light Source */}
      <pointLight
        position={[0, 0, 0]}
        intensity={4.8}
        distance={3500}
        decay={0.25}
        color="#fffaf0"
      />

      {/* Cosmic Starlight Ambient Fill */}
      <ambientLight intensity={0.08} color="#0c1830" />

      {/* Photosphere Convective Body */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredId('sun');
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHoveredId(null);
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[sunData.visualRadius, 64, 64]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={sunVert}
          fragmentShader={sunFrag}
          uniforms={uniforms}
        />
      </mesh>
    </group>
  );
};
