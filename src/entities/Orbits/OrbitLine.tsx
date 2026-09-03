import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore';

interface OrbitLineProps {
  distance: number;
  color?: string;
  isSelected?: boolean;
  eccentricity?: number;
  inclinationDeg?: number;
}

export const OrbitLine: React.FC<OrbitLineProps> = ({
  distance,
  color = '#38bdf8',
  isSelected = false,
  eccentricity = 0.01,
  inclinationDeg = 1.5
}) => {
  const showOrbits = useAppStore((state) => state.showOrbits);

  const lineObject = useMemo(() => {
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

    const geometry = new THREE.BufferGeometry().setFromPoints(pts);
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: isSelected ? 0.45 : 0.16
    });

    return new THREE.Line(geometry, material);
  }, [distance, color, isSelected, eccentricity, inclinationDeg]);

  if (!showOrbits) return null;

  return <primitive object={lineObject} />;
};
