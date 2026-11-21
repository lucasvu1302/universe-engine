import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import plasmaVert from '@/shaders/reentry/plasmaSheath.vert.glsl';
import plasmaFrag from '@/shaders/reentry/plasmaSheath.frag.glsl';
import { useAppStore } from '@/stores/useAppStore';

interface ReEntryPlasmaProps {
  active: boolean;
  intensity?: number;
}

export const ReEntryPlasma: React.FC<ReEntryPlasmaProps> = ({ active, intensity = 1.0 }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0.0 },
      uIntensity: { value: 0.0 },
      uColorCore: { value: new THREE.Color('#ff3b00') },
      uColorRim: { value: new THREE.Color('#ffae00') }
    }),
    []
  );

  useEffect(() => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    return () => {
      mesh?.geometry?.dispose();
      mat?.dispose();
    };
  }, []);

  useFrame((state, delta) => {
    if (!matRef.current || !meshRef.current) return;

    if (active) {
      meshRef.current.visible = true;
      matRef.current.uniforms.uTime.value += delta;

      const currentIntensity = matRef.current.uniforms.uIntensity.value;
      matRef.current.uniforms.uIntensity.value = THREE.MathUtils.lerp(
        currentIntensity,
        intensity,
        delta * 4.0
      );

      meshRef.current.position.copy(state.camera.position);
      meshRef.current.quaternion.copy(state.camera.quaternion);

      if (!useAppStore.getState().reducedMotion) {
        const shakeAmount = 0.04 * intensity;
        state.camera.position.x += (Math.random() - 0.5) * shakeAmount;
        state.camera.position.y += (Math.random() - 0.5) * shakeAmount;
      }
    } else {
      matRef.current.uniforms.uIntensity.value = THREE.MathUtils.lerp(
        matRef.current.uniforms.uIntensity.value,
        0.0,
        delta * 6.0
      );
      if (matRef.current.uniforms.uIntensity.value < 0.01) {
        meshRef.current.visible = false;
      }
    }
  });

  return (
    <mesh ref={meshRef} visible={false} raycast={() => null}>
      <coneGeometry args={[4.2, 10.0, 32, 1, true]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={plasmaVert}
        fragmentShader={plasmaFrag}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
};
