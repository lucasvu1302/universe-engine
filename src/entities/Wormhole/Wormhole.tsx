import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AssetManager } from '@/engine/assets/AssetManager';
import wormholeVert from '@/shaders/wormhole/wormhole4d.vert.glsl';
import wormholeFrag from '@/shaders/wormhole/wormhole4d.frag.glsl';

interface WormholeProps {
  position?: [number, number, number];
  onEnterWormhole?: () => void;
}

export const Wormhole: React.FC<WormholeProps> = ({
  position = [195, 12, 110],
  onEnterWormhole,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const haloSpriteRef = useRef<THREE.Sprite>(null);
  const wormholeWorldPos = useRef(new THREE.Vector3());

  const softGlowMap = useMemo(() => AssetManager.getInstance().getSoftParticleMap(), []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0.0 },
      uColorA: { value: new THREE.Color('#0f172a') },
      uColorB: { value: new THREE.Color('#38bdf8') },
    }),
    []
  );

  useEffect(() => {
    const m = meshRef.current;
    const mat = matRef.current;
    const sprite = haloSpriteRef.current;
    return () => {
      m?.geometry?.dispose();
      mat?.dispose();
      sprite?.material?.dispose();
    };
  }, []);

  useFrame((state, delta) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value += delta;
    }

    if (meshRef.current && onEnterWormhole) {
      meshRef.current.getWorldPosition(wormholeWorldPos.current);
      const dist = state.camera.position.distanceTo(wormholeWorldPos.current);
      if (dist < 14.0) {
        onEnterWormhole();
      }
    }
  });

  return (
    <group position={position}>
      {/* Spherical 4D Ellis-Thorne Gravitational Crystal Throat */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          if (onEnterWormhole) onEnterWormhole();
        }}
      >
        <sphereGeometry args={[7.5, 64, 48]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={wormholeVert}
          fragmentShader={wormholeFrag}
          uniforms={uniforms}
          transparent
          side={THREE.FrontSide}
        />
      </mesh>

      {/* Subtle Optical Einstein-Ring Atmospheric Caustic Halo */}
      <sprite ref={haloSpriteRef} scale={[22, 22, 1]} raycast={() => null}>
        <spriteMaterial
          map={softGlowMap}
          color="#7dd3fc"
          transparent
          opacity={0.28}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>

      <pointLight color="#7dd3fc" intensity={2.2} distance={55} />
    </group>
  );
};
