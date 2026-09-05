import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import sunVert from '@/shaders/sun/sun.vert.glsl';
import sunFrag from '@/shaders/sun/sun.frag.glsl';
import prominenceVert from '@/shaders/sun/prominence.vert.glsl';
import prominenceFrag from '@/shaders/sun/prominence.frag.glsl';
import coronaVert from '@/shaders/sun/corona.vert.glsl';
import coronaFrag from '@/shaders/sun/corona.frag.glsl';
import { CELESTIAL_BODIES } from '@/data/celestialData';
import { useAppStore } from '@/stores/useAppStore';

interface SunProps {
  onSelect?: () => void;
}

export const Sun: React.FC<SunProps> = ({ onSelect }) => {
  const photosphereMeshRef = useRef<THREE.Mesh>(null);
  const photosphereMatRef = useRef<THREE.ShaderMaterial>(null);
  const prominenceMatRef = useRef<THREE.ShaderMaterial>(null);
  const coronaMatRef = useRef<THREE.ShaderMaterial>(null);

  const setHoveredId = useAppStore((state) => state.setHoveredId);
  const sunRadius = CELESTIAL_BODIES.sun.visualRadius;
  const prominenceRadius = sunRadius * 1.28;
  const coronaRadius = sunRadius * 2.15;

  // 1. Photosphere Convection & Convective Cells Uniforms
  const photosphereUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCameraPosition: { value: new THREE.Vector3() },
      uColorCore: { value: new THREE.Color('#fff9e6') },
      uColorRim: { value: new THREE.Color('#ff4400') }
    }),
    []
  );

  // 2. Solar Prominence & Coronal Loops Uniforms
  const prominenceUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCameraPosition: { value: new THREE.Vector3() },
      uSunRadius: { value: sunRadius },
      uProminenceRadius: { value: prominenceRadius }
    }),
    [sunRadius, prominenceRadius]
  );

  // 3. Volumetric Solar Corona & Streamers Uniforms
  const coronaUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCameraPosition: { value: new THREE.Vector3() },
      uSunRadius: { value: sunRadius },
      uCoronaRadius: { value: coronaRadius }
    }),
    [sunRadius, coronaRadius]
  );

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    const camPos = state.camera.position;

    // Update Photosphere
    if (photosphereMatRef.current) {
      photosphereMatRef.current.uniforms.uTime.value = time;
      photosphereMatRef.current.uniforms.uCameraPosition.value.copy(camPos);
    }
    if (photosphereMeshRef.current) {
      // Differential solar rotation
      photosphereMeshRef.current.rotation.y += delta * 0.04;
    }

    // Update Prominences
    if (prominenceMatRef.current) {
      prominenceMatRef.current.uniforms.uTime.value = time;
      prominenceMatRef.current.uniforms.uCameraPosition.value.copy(camPos);
    }

    // Update Volumetric Corona
    if (coronaMatRef.current) {
      coronaMatRef.current.uniforms.uTime.value = time;
      coronaMatRef.current.uniforms.uCameraPosition.value.copy(camPos);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Central Omnidirectional Light Source */}
      <pointLight
        position={[0, 0, 0]}
        intensity={5.5}
        distance={4500}
        decay={0.22}
        color="#fffaf0"
      />

      {/* Cosmic Starlight Ambient Fill */}
      <ambientLight intensity={0.08} color="#0c1830" />

      {/* 1. Photosphere Convective Body */}
      <mesh
        ref={photosphereMeshRef}
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
        <sphereGeometry args={[sunRadius, 64, 64]} />
        <shaderMaterial
          ref={photosphereMatRef}
          vertexShader={sunVert}
          fragmentShader={sunFrag}
          uniforms={photosphereUniforms}
        />
      </mesh>

      {/* 2. Solar Prominence & Coronal Loop Shell (Tai Lửa Mặt Trời) */}
      <mesh raycast={() => null}>
        <sphereGeometry args={[prominenceRadius, 64, 64]} />
        <shaderMaterial
          ref={prominenceMatRef}
          vertexShader={prominenceVert}
          fragmentShader={prominenceFrag}
          uniforms={prominenceUniforms}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 3. Volumetric Outer Corona & Solar Wind Streamers (Nhật Hoa) */}
      <mesh raycast={() => null}>
        <sphereGeometry args={[coronaRadius, 48, 48]} />
        <shaderMaterial
          ref={coronaMatRef}
          vertexShader={coronaVert}
          fragmentShader={coronaFrag}
          uniforms={coronaUniforms}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};
