import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import wormholeVert from '@/shaders/wormhole/wormhole4d.vert.glsl';
import wormholeFrag from '@/shaders/wormhole/wormhole4d.frag.glsl';

interface WormholeProps {
  position?: [number, number, number];
  onEnterWormhole?: () => void;
}

export const Wormhole: React.FC<WormholeProps> = ({
  position = [195, 12, 110],
  onEnterWormhole
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value += delta;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.2;
    }

    // Proximity check to camera
    if (meshRef.current && onEnterWormhole) {
      const dist = state.camera.position.distanceTo(meshRef.current.position);
      if (dist < 14.0) {
        onEnterWormhole();
      }
    }
  });

  return (
    <group position={position}>
      {/* 4D Gravitational Lensing Throat Sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          if (onEnterWormhole) onEnterWormhole();
        }}
      >
        <sphereGeometry args={[7.5, 64, 32]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={wormholeVert}
          fragmentShader={wormholeFrag}
          uniforms={{
            uTime: { value: 0.0 },
            uColorA: { value: new THREE.Color('#1e1b4b') },
            uColorB: { value: new THREE.Color('#0369a1') }
          }}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Optical Accretion Halos */}
      <mesh ref={ringRef} rotation={[Math.PI / 3, 0, 0]}>
        <ringGeometry args={[8.0, 12.5, 64]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Interactive Tag / Beacon */}
      <pointLight color="#38bdf8" intensity={2.5} distance={50} />
    </group>
  );
};
