import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AssetManager } from '@/engine/assets/AssetManager';
import beamVert from '@/shaders/pulsar/pulsarBeam.vert.glsl';
import beamFrag from '@/shaders/pulsar/pulsarBeam.frag.glsl';

interface TidalDisruptionProps {
  active: boolean;
  blackHolePosition?: [number, number, number];
  onComplete?: () => void;
}

export const TidalDisruption: React.FC<TidalDisruptionProps> = ({
  active,
  blackHolePosition = [0, 180, -1200],
  onComplete,
}) => {
  const visualGroupRef = useRef<THREE.Group>(null);
  const streamRef = useRef<THREE.Points>(null);
  const jetGroupRef = useRef<THREE.Group>(null);
  const northJetMatRef = useRef<THREE.ShaderMaterial>(null);
  const southJetMatRef = useRef<THREE.ShaderMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const timeRef = useRef(0);

  const softParticleMap = useMemo(() => AssetManager.getInstance().getSoftParticleMap(), []);

  // 1,200 spaghettified stellar plasma knots spiraling from outer tidal tail into white-hot ISCO
  const { streamPositions, streamColors } = useMemo(() => {
    const count = 1200;
    const pos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    const hotISCO = new THREE.Color('#e0f2fe');
    const warmMid = new THREE.Color('#fbbf24');
    const coolTail = new THREE.Color('#ea580c');
    const tmp = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const u = i / count;
      const angle = u * Math.PI * 5.2;
      const radius = 14.0 + Math.pow(u, 1.15) * 58.0;
      const spread = (1.0 - u * 0.5) * 2.8;
      pos[i * 3] = Math.cos(angle) * radius + Math.sin(i * 19.1) * spread;
      pos[i * 3 + 1] = Math.cos(i * 13.7) * spread * 0.7;
      pos[i * 3 + 2] = Math.sin(angle) * radius + Math.cos(i * 11.3) * spread;

      if (u < 0.35) {
        tmp.copy(hotISCO).lerp(warmMid, u / 0.35);
      } else {
        tmp.copy(warmMid).lerp(coolTail, (u - 0.35) / 0.65);
      }
      cols[i * 3] = tmp.r;
      cols[i * 3 + 1] = tmp.g;
      cols[i * 3 + 2] = tmp.b;
    }
    return { streamPositions: pos, streamColors: cols };
  }, []);

  const northJetUniforms = useMemo(
    () => ({
      uTime: { value: 0.0 },
      uColorCore: { value: new THREE.Color('#ffffff') },
      uColorGlow: { value: new THREE.Color('#38bdf8') },
    }),
    []
  );

  const southJetUniforms = useMemo(
    () => ({
      uTime: { value: 0.0 },
      uColorCore: { value: new THREE.Color('#ffffff') },
      uColorGlow: { value: new THREE.Color('#38bdf8') },
    }),
    []
  );

  useEffect(() => {
    if (active) {
      timeRef.current = 0;
      if (visualGroupRef.current) visualGroupRef.current.visible = true;
      if (streamRef.current) streamRef.current.scale.setScalar(1);
      if (jetGroupRef.current) jetGroupRef.current.scale.set(1, 0.02, 1);
      if (lightRef.current) lightRef.current.intensity = 18.0;
    } else {
      timeRef.current = 0;
      if (visualGroupRef.current) visualGroupRef.current.visible = false;
      if (lightRef.current) lightRef.current.intensity = 0;
    }
  }, [active]);

  useEffect(() => {
    const stream = streamRef.current;
    const jets = jetGroupRef.current;
    return () => {
      stream?.geometry?.dispose();
      (stream?.material as THREE.Material | undefined)?.dispose();
      jets?.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry?.dispose();
          (mesh.material as THREE.Material | undefined)?.dispose();
        }
      });
    };
  }, []);

  useFrame((_, delta) => {
    if (!active) {
      if (lightRef.current && lightRef.current.intensity !== 0) {
        lightRef.current.intensity = 0;
      }
      return;
    }
    timeRef.current += delta;
    const t = timeRef.current;

    if (streamRef.current) {
      streamRef.current.rotation.y += delta * 3.2;
      const scale = Math.max(0.08, 1.0 - t * 0.14);
      streamRef.current.scale.setScalar(scale);
    }

    if (jetGroupRef.current) {
      const jetScaleY = Math.min(2.4, t * 1.25);
      const fadeX = Math.max(0.1, 1.0 - Math.max(0.0, t - 3.5) * 0.35);
      jetGroupRef.current.scale.set(fadeX, jetScaleY, fadeX);
    }
    if (northJetMatRef.current) northJetMatRef.current.uniforms.uTime.value += delta;
    if (southJetMatRef.current) southJetMatRef.current.uniforms.uTime.value += delta;

    if (lightRef.current) {
      lightRef.current.intensity = Math.max(0.0, 18.0 - t * 2.8);
    }

    if (t > 6.0 && onComplete) {
      timeRef.current = 0;
      if (visualGroupRef.current) visualGroupRef.current.visible = false;
      if (lightRef.current) lightRef.current.intensity = 0;
      onComplete();
    }
  });

  return (
    <group position={blackHolePosition}>
      {/* Persistent accretion flash light modulated via intensity (INV3) */}
      <pointLight ref={lightRef} color="#fb923c" intensity={0} distance={180} />

      <group ref={visualGroupRef} visible={active}>
        {/* 1. Soft Gaussian Spaghettified Stellar Debris Stream */}
        <points ref={streamRef}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[streamPositions, 3]} />
            <bufferAttribute attach="attributes-color" args={[streamColors, 3]} />
          </bufferGeometry>
          <pointsMaterial
            map={softParticleMap}
            vertexColors
            size={2.6}
            transparent
            opacity={0.92}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>

        {/* 2. Seamless Fresnel Relativistic Bipolar Gamma-Ray Burst Jets */}
        <group ref={jetGroupRef}>
          <mesh position={[0, 42, 0]}>
            <cylinderGeometry args={[4.6, 0.8, 84, 32, 1, true]} />
            <shaderMaterial
              ref={northJetMatRef}
              vertexShader={beamVert}
              fragmentShader={beamFrag}
              uniforms={northJetUniforms}
              transparent
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, -42, 0]} rotation={[Math.PI, 0, 0]}>
            <cylinderGeometry args={[4.6, 0.8, 84, 32, 1, true]} />
            <shaderMaterial
              ref={southJetMatRef}
              vertexShader={beamVert}
              fragmentShader={beamFrag}
              uniforms={southJetUniforms}
              transparent
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
};
