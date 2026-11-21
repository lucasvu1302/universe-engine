import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AssetManager } from '@/engine/assets/AssetManager';

interface SupernovaProps {
  active: boolean;
  position?: [number, number, number];
  onComplete?: () => void;
}

export const Supernova: React.FC<SupernovaProps> = ({
  active,
  position = [-220, 90, -180],
  onComplete,
}) => {
  const visualGroupRef = useRef<THREE.Group>(null);
  const blastMeshRef = useRef<THREE.Mesh>(null);
  const coreSpriteRef = useRef<THREE.Sprite>(null);
  const flashLightRef = useRef<THREE.PointLight>(null);
  const nebulaRingRef = useRef<THREE.Points>(null);
  const timeRef = useRef(0);

  const assets = useMemo(() => AssetManager.getInstance(), []);
  const unitSphere32 = useMemo(() => assets.getUnitSphereGeometry(32), [assets]);
  const softParticleMap = useMemo(() => assets.getSoftParticleMap(), [assets]);

  // 1,600 multi-spectral filamentary supernova remnant ejecta (O III cyan, S II gold, H-alpha rose)
  const { nebulaPositions, nebulaColors } = useMemo(() => {
    const count = 1600;
    const pos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    const o3Cyan = new THREE.Color('#38bdf8');
    const s2Gold = new THREE.Color('#fbbf24');
    const hAlphaRose = new THREE.Color('#f43f5e');
    const tmp = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const u = ((i * 0.61803398875) % 1.0);
      const v = (i + 0.5) / count;
      const theta = u * 2.0 * Math.PI * 7.0;
      const phi = Math.acos(2.0 * v - 1.0);
      const filament = 1.0 + 0.28 * Math.sin(4.0 * theta) * Math.cos(3.0 * phi);
      const r = (1.8 + ((i * 17) % 23) * 0.09) * filament;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      const band = r / 4.8;
      if (band < 0.5) {
        tmp.copy(o3Cyan).lerp(s2Gold, band / 0.5);
      } else {
        tmp.copy(s2Gold).lerp(hAlphaRose, Math.min(1.0, (band - 0.5) / 0.5));
      }
      cols[i * 3] = tmp.r;
      cols[i * 3 + 1] = tmp.g;
      cols[i * 3 + 2] = tmp.b;
    }
    return { nebulaPositions: pos, nebulaColors: cols };
  }, []);

  useEffect(() => {
    if (active) {
      timeRef.current = 0;
      if (visualGroupRef.current) visualGroupRef.current.visible = true;
      if (blastMeshRef.current) blastMeshRef.current.scale.setScalar(2.5);
      if (nebulaRingRef.current) nebulaRingRef.current.scale.setScalar(1);
    } else {
      timeRef.current = 0;
      if (visualGroupRef.current) visualGroupRef.current.visible = false;
      if (flashLightRef.current) flashLightRef.current.intensity = 0;
    }
  }, [active]);

  useEffect(() => {
    const blast = blastMeshRef.current;
    const core = coreSpriteRef.current;
    const neb = nebulaRingRef.current;
    return () => {
      (blast?.material as THREE.Material | undefined)?.dispose();
      core?.material?.dispose();
      neb?.geometry?.dispose();
      (neb?.material as THREE.Material | undefined)?.dispose();
    };
  }, []);

  useFrame((_, delta) => {
    if (!active) {
      if (flashLightRef.current && flashLightRef.current.intensity !== 0) {
        flashLightRef.current.intensity = 0;
      }
      return;
    }
    timeRef.current += delta;
    const t = timeRef.current;

    if (flashLightRef.current) {
      flashLightRef.current.intensity = Math.max(0.0, 32.0 - t * 6.0);
    }

    if (coreSpriteRef.current) {
      const flashScale = Math.max(12.0, 56.0 - t * 8.5);
      coreSpriteRef.current.scale.set(flashScale, flashScale, 1);
      coreSpriteRef.current.material.opacity = Math.max(0.0, 0.95 - t * 0.17);
    }

    if (blastMeshRef.current) {
      const scale = 2.5 * (1.0 + t * 26.0);
      blastMeshRef.current.scale.setScalar(scale);
      const mat = blastMeshRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0.0, 0.55 - t * 0.1);
    }

    if (nebulaRingRef.current) {
      const scale = 1.0 + t * 21.0;
      nebulaRingRef.current.scale.setScalar(scale);
      nebulaRingRef.current.rotation.y += delta * 0.25;
      const pMat = nebulaRingRef.current.material as THREE.PointsMaterial;
      pMat.opacity = Math.max(0.0, 0.92 - t * 0.14);
    }

    if (t > 5.5 && onComplete) {
      timeRef.current = 0;
      if (visualGroupRef.current) visualGroupRef.current.visible = false;
      if (flashLightRef.current) flashLightRef.current.intensity = 0;
      onComplete();
    }
  });

  return (
    <group position={position}>
      {/* Persistent Flash Light modulated via intensity (INV3) */}
      <pointLight ref={flashLightRef} color="#e0f2fe" intensity={0} distance={420} />

      <group ref={visualGroupRef} visible={active}>
        {/* Blinding Core-Collapse Neutrino/Photon Flash Halo */}
        <sprite ref={coreSpriteRef} scale={[48, 48, 1]}>
          <spriteMaterial
            map={softParticleMap}
            color="#bae6fd"
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>

        {/* Leading Relativistic Forward Shock Envelope */}
        <mesh ref={blastMeshRef} geometry={unitSphere32} scale={2.5}>
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.55}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Soft Gaussian Multi-Spectral Supernova Remnant Filaments */}
        <points ref={nebulaRingRef}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[nebulaPositions, 3]} />
            <bufferAttribute attach="attributes-color" args={[nebulaColors, 3]} />
          </bufferGeometry>
          <pointsMaterial
            map={softParticleMap}
            vertexColors
            size={2.8}
            transparent
            opacity={0.9}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
      </group>
    </group>
  );
};
