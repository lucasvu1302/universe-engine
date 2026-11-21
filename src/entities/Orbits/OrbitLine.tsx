import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore';

interface OrbitLineProps {
  distance: number;
  color?: string;
  isSelected?: boolean;
  dimmed?: boolean;
  eccentricity?: number;
  inclinationDeg?: number;
}

export const OrbitLine: React.FC<OrbitLineProps> = ({
  distance,
  color = '#38bdf8',
  isSelected = false,
  dimmed = false,
  eccentricity = 0.01,
  inclinationDeg = 1.5
}) => {
  const showOrbits = useAppStore((state) => state.showOrbits);

  const geometry = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segments = 256;
    const incRad = THREE.MathUtils.degToRad(inclinationDeg);

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const r = distance * ((1 - eccentricity * eccentricity) / (1 + eccentricity * Math.cos(theta)));
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      const y = -z * Math.sin(incRad);
      const zFinal = z * Math.cos(incRad);

      pts.push(new THREE.Vector3(x, y, zFinal));
    }

    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [distance, eccentricity, inclinationDeg]);

  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        transparent: true,
        opacity: 0.16
      }),
    []
  );

  material.color.set(color);
  material.opacity = dimmed ? 0.0 : isSelected ? 0.22 : 0.16;

  const lineObject = useMemo(() => new THREE.Line(geometry, material), [geometry, material]);
  lineObject.visible = !dimmed;

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  if (!showOrbits) return null;

  return <primitive object={lineObject} />;
};
