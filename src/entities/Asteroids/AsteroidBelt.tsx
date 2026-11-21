import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SimulationClock } from '@/engine/simulation/SimulationClock';
import { useAppStore } from '@/stores/useAppStore';
import { PerformanceManager } from '@/engine/performance/PerformanceManager';

interface AsteroidBeltProps {
  count?: number;
  innerRadius?: number;
  outerRadius?: number;
}

export const AsteroidBelt: React.FC<AsteroidBeltProps> = ({
  count,
  innerRadius = 105,
  outerRadius = 125
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const quality = useAppStore((state) => state.graphicsQuality);
  const detectedGPUTier = useAppStore((state) => state.detectedGPUTier);

  const effectiveCount = useMemo(
    () => count ?? PerformanceManager.getInstance().getQualityProfile(quality, detectedGPUTier).asteroidCount,
    [count, quality, detectedGPUTier]
  );

  // Scratch objects for matrix calculations
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Precompute orbital parameters for each asteroid instance
  const asteroidData = useMemo(() => {
    const data = [];
    for (let i = 0; i < effectiveCount; i++) {
      const radius = THREE.MathUtils.lerp(innerRadius, outerRadius, Math.random());
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.35 / Math.sqrt(radius)) * (0.8 + Math.random() * 0.4);
      const verticalOffset = (Math.random() - 0.5) * 4.5;
      const scale = 0.15 + Math.random() * 0.35;
      const rotSpeedX = (Math.random() - 0.5) * 2;
      const rotSpeedY = (Math.random() - 0.5) * 2;

      data.push({
        radius,
        angle,
        speed,
        verticalOffset,
        scale,
        rotSpeedX,
        rotSpeedY
      });
    }
    return data;
  }, [effectiveCount, innerRadius, outerRadius]);

  useEffect(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < effectiveCount; i++) {
      const item = asteroidData[i];
      dummy.position.set(
        Math.cos(item.angle) * item.radius,
        item.verticalOffset,
        Math.sin(item.angle) * item.radius
      );
      dummy.scale.set(item.scale, item.scale, item.scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [asteroidData, effectiveCount, dummy]);

  const asteroidGeo = useMemo(() => new THREE.DodecahedronGeometry(1, 0), []);
  const asteroidMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#736b63',
        roughness: 0.9,
        metalness: 0.1
      }),
    []
  );

  useEffect(() => {
    return () => {
      asteroidGeo.dispose();
      asteroidMat.dispose();
    };
  }, [asteroidGeo, asteroidMat]);

  useEffect(() => {
    const mesh = meshRef.current;
    return () => {
      mesh?.dispose?.();
    };
  }, [effectiveCount]);

  useFrame(() => {
    if (!meshRef.current) return;
    const simTime = SimulationClock.getInstance().simulationTime;

    // Slow orbital rotation of the entire asteroid belt
    meshRef.current.rotation.y = simTime * 0.015;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[asteroidGeo, asteroidMat, effectiveCount]}
    />
  );
};
