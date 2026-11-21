import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AssetManager } from '@/engine/assets/AssetManager';
import beamVert from '@/shaders/pulsar/pulsarBeam.vert.glsl';
import beamFrag from '@/shaders/pulsar/pulsarBeam.frag.glsl';
import accretionDiskVert from '@/shaders/cosmic/accretionDisk.vert.glsl';
import accretionDiskFrag from '@/shaders/cosmic/accretionDisk.frag.glsl';

interface PulsarProps {
  position?: [number, number, number];
  onSelect?: () => void;
}

export const Pulsar: React.FC<PulsarProps> = ({
  position = [-650, 220, -750],
  onSelect,
}) => {
  const rootRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const jetGroupRef = useRef<THREE.Group>(null);
  const diskMatRef = useRef<THREE.ShaderMaterial>(null);
  const beamMatRef1 = useRef<THREE.ShaderMaterial>(null);
  const beamMatRef2 = useRef<THREE.ShaderMaterial>(null);

  const softGlowMap = useMemo(() => AssetManager.getInstance().getSoftParticleMap(), []);

  const northBeamUniforms = useMemo(
    () => ({
      uTime: { value: 0.0 },
      uColorCore: { value: new THREE.Color('#ffffff') },
      uColorGlow: { value: new THREE.Color('#38bdf8') },
    }),
    []
  );

  const southBeamUniforms = useMemo(
    () => ({
      uTime: { value: 0.0 },
      uColorCore: { value: new THREE.Color('#ffffff') },
      uColorGlow: { value: new THREE.Color('#38bdf8') },
    }),
    []
  );

  const diskUniforms = useMemo(
    () => ({
      uTime: { value: 0.0 },
      uInnerRadius: { value: 3.6 },
      uOuterRadius: { value: 13.5 },
    }),
    []
  );

  useEffect(() => {
    const root = rootRef.current;
    return () => {
      root?.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
        const sprite = obj as THREE.Sprite;
        if (sprite.isSprite) {
          sprite.material?.dispose();
        }
      });
    };
  }, []);

  useFrame((_, delta) => {
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 4.5;
    }
    if (jetGroupRef.current) {
      jetGroupRef.current.rotation.y += delta * 1.65;
    }
    if (diskMatRef.current) {
      diskMatRef.current.uniforms.uTime.value += delta * 2.4;
    }
    if (beamMatRef1.current) {
      beamMatRef1.current.uniforms.uTime.value += delta;
    }
    if (beamMatRef2.current) {
      beamMatRef2.current.uniforms.uTime.value += delta;
    }
  });

  return (
    <group ref={rootRef} position={position} onClick={onSelect}>
      {/* Super-Dense Magnetized Neutron Star Crust */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[2.1, 40, 40]} />
        <meshStandardMaterial
          color="#f8fafc"
          emissive="#38bdf8"
          emissiveIntensity={4.2}
          roughness={0.08}
          metalness={0.92}
        />
      </mesh>

      {/* Seamless Radial Synchrotron Magnetosphere Corona */}
      <sprite scale={[14.5, 14.5, 1]} raycast={() => null}>
        <spriteMaterial
          map={softGlowMap}
          color="#38bdf8"
          transparent
          opacity={0.62}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>

      {/* Relativistic Magnetospheric Accretion Disk (Shader-Driven, Zero Plastic Torus) */}
      <mesh rotation={[Math.PI / 2.15, 0.12, 0]} raycast={() => null}>
        <planeGeometry args={[28, 28, 1, 1]} />
        <shaderMaterial
          ref={diskMatRef}
          vertexShader={accretionDiskVert}
          fragmentShader={accretionDiskFrag}
          uniforms={diskUniforms}
          transparent
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Precessing Relativistic Synchrotron Lighthouse Beams */}
      <group ref={jetGroupRef} rotation={[0, 0, THREE.MathUtils.degToRad(20)]}>
        <mesh position={[0, 32, 0]} raycast={() => null}>
          <cylinderGeometry args={[4.4, 0.55, 64, 40, 1, true]} />
          <shaderMaterial
            ref={beamMatRef1}
            vertexShader={beamVert}
            fragmentShader={beamFrag}
            uniforms={northBeamUniforms}
            transparent
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        <mesh position={[0, -32, 0]} rotation={[Math.PI, 0, 0]} raycast={() => null}>
          <cylinderGeometry args={[4.4, 0.55, 64, 40, 1, true]} />
          <shaderMaterial
            ref={beamMatRef2}
            vertexShader={beamVert}
            fragmentShader={beamFrag}
            uniforms={southBeamUniforms}
            transparent
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>

      <pointLight color="#38bdf8" intensity={3.5} distance={150} />
    </group>
  );
};
