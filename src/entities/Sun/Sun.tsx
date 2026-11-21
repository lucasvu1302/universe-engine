import React, { useEffect, useMemo, useRef } from 'react';
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
  radiusOverride?: number;
  omitLights?: boolean;
}

const NOOP_RAYCAST: THREE.Object3D['raycast'] = () => {};

export const Sun: React.FC<SunProps> = ({
  onSelect,
  radiusOverride,
  omitLights = false
}) => {
  const photosphereMeshRef = useRef<THREE.Mesh>(null);
  const prominenceMeshRef = useRef<THREE.Mesh>(null);
  const coronaMeshRef = useRef<THREE.Mesh>(null);
  const photosphereMatRef = useRef<THREE.ShaderMaterial>(null);
  const prominenceMatRef = useRef<THREE.ShaderMaterial>(null);
  const coronaMatRef = useRef<THREE.ShaderMaterial>(null);

  const setHoveredId = useAppStore((state) => state.setHoveredId);
  const sunRadius = radiusOverride ?? CELESTIAL_BODIES.sun.visualRadius;
  const prominenceRadius = sunRadius * 1.24;
  const coronaRadius = sunRadius * 2.15;

  const sphereGeo = useMemo(() => new THREE.SphereGeometry(1, 64, 64), []);

  const photosphereUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCameraPosition: { value: new THREE.Vector3() },
      uColorCore: { value: new THREE.Color('#fff9e6') },
      uColorRim: { value: new THREE.Color('#ff4400') }
    }),
    []
  );

  const prominenceUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCameraPosition: { value: new THREE.Vector3() },
      uSunRadius: { value: CELESTIAL_BODIES.sun.visualRadius },
      uProminenceRadius: { value: CELESTIAL_BODIES.sun.visualRadius * 1.24 }
    }),
    []
  );

  const coronaUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCameraPosition: { value: new THREE.Vector3() },
      uSunRadius: { value: CELESTIAL_BODIES.sun.visualRadius },
      uCoronaRadius: { value: CELESTIAL_BODIES.sun.visualRadius * 2.15 }
    }),
    []
  );

  useEffect(() => {
    prominenceUniforms.uSunRadius.value = sunRadius;
    prominenceUniforms.uProminenceRadius.value = prominenceRadius;
    coronaUniforms.uSunRadius.value = sunRadius;
    coronaUniforms.uCoronaRadius.value = coronaRadius;
  }, [sunRadius, prominenceRadius, coronaRadius, prominenceUniforms, coronaUniforms]);

  useEffect(() => {
    const pMat = photosphereMatRef.current;
    const prMat = prominenceMatRef.current;
    const cMat = coronaMatRef.current;
    return () => {
      sphereGeo.dispose();
      pMat?.dispose();
      prMat?.dispose();
      cMat?.dispose();
    };
  }, [sphereGeo]);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    const camPos = state.camera.position;

    if (photosphereMatRef.current) {
      photosphereMatRef.current.uniforms.uTime.value = time;
      photosphereMatRef.current.uniforms.uCameraPosition.value.copy(camPos);
    }
    if (photosphereMeshRef.current) {
      photosphereMeshRef.current.rotation.y += delta * 0.04;
    }
    if (prominenceMatRef.current) {
      prominenceMatRef.current.uniforms.uTime.value = time;
      prominenceMatRef.current.uniforms.uCameraPosition.value.copy(camPos);
    }
    if (coronaMatRef.current) {
      coronaMatRef.current.uniforms.uTime.value = time;
      coronaMatRef.current.uniforms.uCameraPosition.value.copy(camPos);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {!omitLights && (
        <>
          <pointLight
            position={[0, 0, 0]}
            intensity={5.5}
            distance={4500}
            decay={0.22}
            color="#fffaf0"
          />
          <ambientLight intensity={0.08} color="#0c1830" />
        </>
      )}

      {/* 1. Photosphere Convective Body */}
      <mesh
        ref={photosphereMeshRef}
        geometry={sphereGeo}
        scale={sunRadius}
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
        <shaderMaterial
          ref={photosphereMatRef}
          vertexShader={sunVert}
          fragmentShader={sunFrag}
          uniforms={photosphereUniforms}
        />
      </mesh>

      {/* 2. Solar Prominence & Chromosphere Shell */}
      <mesh
        ref={prominenceMeshRef}
        geometry={sphereGeo}
        scale={prominenceRadius}
        raycast={NOOP_RAYCAST}
      >
        <shaderMaterial
          ref={prominenceMatRef}
          vertexShader={prominenceVert}
          fragmentShader={prominenceFrag}
          uniforms={prominenceUniforms}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 3. Volumetric Outer Corona & Solar Wind Streamers */}
      <mesh
        ref={coronaMeshRef}
        geometry={sphereGeo}
        scale={coronaRadius}
        raycast={NOOP_RAYCAST}
      >
        <shaderMaterial
          ref={coronaMatRef}
          vertexShader={coronaVert}
          fragmentShader={coronaFrag}
          uniforms={coronaUniforms}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};
