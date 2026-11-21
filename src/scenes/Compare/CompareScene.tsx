import React, { useMemo } from 'react';
import { StarField } from '@/entities/StarField/StarField';
import { Planet } from '@/entities/Planet/Planet';
import { Sun } from '@/entities/Sun/Sun';
import { CELESTIAL_BODIES, CelestialBodyData } from '@/data/celestialData';
import { useAppStore } from '@/stores/useAppStore';

function scaleCompareBody(raw: CelestialBodyData, targetRadius: number): CelestialBodyData {
  const ratio = raw.visualRadius > 0 ? targetRadius / raw.visualRadius : 1;
  return {
    ...raw,
    visualRadius: targetRadius,
    visualDistance: 0,
    rings: raw.rings
      ? {
          ...raw.rings,
          innerRadius: raw.rings.innerRadius * ratio,
          outerRadius: raw.rings.outerRadius * ratio,
        }
      : undefined,
  };
}

export const CompareScene: React.FC = () => {
  const planetAId = useAppStore((state) => state.comparePlanetA);
  const planetBId = useAppStore((state) => state.comparePlanetB);
  const trueSize = useAppStore((state) => state.compareTrueSize);

  const rawDataA = CELESTIAL_BODIES[planetAId] || CELESTIAL_BODIES.earth;
  const rawDataB = CELESTIAL_BODIES[planetBId] || CELESTIAL_BODIES.jupiter;

  const { dataA, dataB, offsetX } = useMemo(() => {
    if (!trueSize) {
      const modA = { ...rawDataA, visualDistance: 0 };
      const modB = { ...rawDataB, visualDistance: 0 };
      const extA = modA.rings ? modA.rings.outerRadius : modA.visualRadius;
      const extB = modB.rings ? modB.rings.outerRadius : modB.visualRadius;
      return {
        dataA: modA,
        dataB: modB,
        offsetX: Math.max(20, (extA + extB) * 0.72 + 6),
      };
    }

    const maxDia = Math.max(rawDataA.diameterKm, rawDataB.diameterKm);
    const scaleFactor = 14.0 / maxDia;
    const radA = Math.max(0.22, rawDataA.diameterKm * scaleFactor);
    const radB = Math.max(0.22, rawDataB.diameterKm * scaleFactor);

    const modA = scaleCompareBody(rawDataA, radA);
    const modB = scaleCompareBody(rawDataB, radB);
    const extA = modA.rings ? modA.rings.outerRadius : modA.visualRadius;
    const extB = modB.rings ? modB.rings.outerRadius : modB.visualRadius;

    return {
      dataA: modA,
      dataB: modB,
      offsetX: Math.max(20, (extA + extB) * 0.75 + 6),
    };
  }, [rawDataA, rawDataB, trueSize]);

  return (
    <group>
      <StarField />
      <ambientLight intensity={0.4} color="#1a2540" />
      <directionalLight position={[50, 20, 50]} intensity={2.0} color="#ffffff" />

      {/* Body A on the Left */}
      <group position={[-offsetX, 0, 0]}>
        {dataA.id === 'sun' ? (
          <Sun key="compare-a-sun" radiusOverride={dataA.visualRadius} omitLights hideEvents />
        ) : (
          <Planet key={`compare-a-${dataA.id}`} data={dataA} hideMoons hideEvents sunPosition={[50, 20, 50]} />
        )}
      </group>

      {/* Body B on the Right */}
      <group position={[offsetX, 0, 0]}>
        {dataB.id === 'sun' ? (
          <Sun key="compare-b-sun" radiusOverride={dataB.visualRadius} omitLights hideEvents />
        ) : (
          <Planet key={`compare-b-${dataB.id}`} data={dataB} hideMoons hideEvents sunPosition={[50, 20, 50]} />
        )}
      </group>
    </group>
  );
};
