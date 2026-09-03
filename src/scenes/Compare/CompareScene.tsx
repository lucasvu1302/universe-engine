import React, { useMemo } from 'react';
import { StarField } from '@/entities/StarField/StarField';
import { Planet } from '@/entities/Planet/Planet';
import { CELESTIAL_BODIES, CelestialBodyData } from '@/data/celestialData';
import { useAppStore } from '@/stores/useAppStore';

export const CompareScene: React.FC = () => {
  const planetAId = useAppStore((state) => state.comparePlanetA);
  const planetBId = useAppStore((state) => state.comparePlanetB);
  const trueSize = useAppStore((state) => state.compareTrueSize);

  const rawDataA = CELESTIAL_BODIES[planetAId] || CELESTIAL_BODIES.earth;
  const rawDataB = CELESTIAL_BODIES[planetBId] || CELESTIAL_BODIES.jupiter;

  // Scale computation
  const { dataA, dataB } = useMemo(() => {
    if (!trueSize) {
      // Normal visual scale
      return {
        dataA: { ...rawDataA, visualDistance: 0 },
        dataB: { ...rawDataB, visualDistance: 0 }
      };
    }

    // True relative size based on actual diameter in KM
    const maxDia = Math.max(rawDataA.diameterKm, rawDataB.diameterKm);
    const scaleFactor = 14.0 / maxDia;

    const modA: CelestialBodyData = {
      ...rawDataA,
      visualRadius: Math.max(0.5, rawDataA.diameterKm * scaleFactor),
      visualDistance: 0
    };
    const modB: CelestialBodyData = {
      ...rawDataB,
      visualRadius: Math.max(0.5, rawDataB.diameterKm * scaleFactor),
      visualDistance: 0
    };

    return { dataA: modA, dataB: modB };
  }, [rawDataA, rawDataB, trueSize]);

  return (
    <group>
      <StarField />
      <ambientLight intensity={0.4} color="#1a2540" />
      <directionalLight position={[50, 20, 50]} intensity={2.0} color="#ffffff" />

      {/* Planet A on the Left */}
      <group position={[-20, 0, 0]}>
        <Planet data={dataA} />
      </group>

      {/* Planet B on the Right */}
      <group position={[20, 0, 0]}>
        <Planet data={dataB} />
      </group>
    </group>
  );
};
