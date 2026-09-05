import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import plasmaVert from '@/shaders/reentry/plasmaSheath.vert.glsl';
import plasmaFrag from '@/shaders/reentry/plasmaSheath.frag.glsl';

interface ReEntryPlasmaProps {
  active: boolean;
  intensity?: number;
}

export const ReEntryPlasma: React.FC<ReEntryPlasmaProps> = ({ active, intensity = 1.0 }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  useFrame((state, delta) => {
    if (!matRef.current || !meshRef.current) return;

    if (active) {
      meshRef.current.visible = true;
      matRef.current.uniforms.uTime.value += delta;
      
      // Interpolate intensity smoothly
      const currentIntensity = matRef.current.uniforms.uIntensity.value;
      matRef.current.uniforms.uIntensity.value = THREE.MathUtils.lerp(currentIntensity, intensity, delta * 4.0);

      // Lock position & orientation in front of camera
      meshRef.current.position.copy(state.camera.position);
      meshRef.current.quaternion.copy(state.camera.quaternion);

      // Aerodynamic camera shake
      const shakeAmount = 0.05 * intensity;
      state.camera.position.x += (Math.random() - 0.5) * shakeAmount;
      state.camera.position.y += (Math.random() - 0.5) * shakeAmount;
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
    <mesh ref={meshRef} visible={false}>
      {/* Front cone / teardrop geometry shielding the camera */}
      <coneGeometry args={[4.2, 10.0, 32, 1, true]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={plasmaVert}
        fragmentShader={plasmaFrag}
        uniforms={{
          uTime: { value: 0.0 },
          uIntensity: { value: 0.0 },
          uColorCore: { value: new THREE.Color('#ff3b00') },
          uColorRim: { value: new THREE.Color('#ffae00') }
        }}
        transparent
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
};
