import React from 'react';
import { Sun } from '@/entities/Sun/Sun';
import { Planet } from '@/entities/Planet/Planet';
import { OrbitLine } from '@/entities/Orbits/OrbitLine';
import { AsteroidBelt } from '@/entities/Asteroids/AsteroidBelt';
import { StarField } from '@/entities/StarField/StarField';
import { BlackHole } from '@/entities/BlackHole/BlackHole';
import { CELESTIAL_BODIES, PLANET_KEYS } from '@/data/celestialData';
import { useAppStore } from '@/stores/useAppStore';

interface SolarSystemSceneProps {
  onSelectPlanet: (id: string) => void;
  onFocusPlanet: (id: string) => void;
}

export const SolarSystemScene: React.FC<SolarSystemSceneProps> = ({
  onSelectPlanet,
  onFocusPlanet
}) => {
  const selectedTarget = useAppStore((state) => state.targetId);

  return (
    <group>
      {/* 360° Volumetric Starfield with Distant Galaxies and Nebulae */}
      <StarField />

      {/* Centerpiece Sun */}
      <Sun onSelect={() => onSelectPlanet('sun')} />

      {/* Planetary Orbits and Bodies (including hierarchical Moons) */}
      {PLANET_KEYS.map((key) => {
        const body = CELESTIAL_BODIES[key];
        const isSelected = selectedTarget === key;

        return (
          <React.Fragment key={key}>
            {/* Orbit Path Line matching exact Keplerian parameters */}
            <OrbitLine
              distance={body.visualDistance}
              color={body.color}
              isSelected={isSelected}
              eccentricity={body.type === 'rocky' ? 0.04 : 0.01}
              inclinationDeg={body.orbitalInclinationDeg ?? 0.0}
            />

            {/* Planet Body */}
            <Planet
              data={body}
              onSelect={onSelectPlanet}
              onFocus={onFocusPlanet}
            />
          </React.Fragment>
        );
      })}

      {/* Main Asteroid Belt between Mars and Jupiter */}
      <AsteroidBelt />

      {/* Supermassive Relativistic Black Hole Destination ("Gargantua") in Deep Space */}
      <BlackHole
        onSelect={onSelectPlanet}
        onFocus={onFocusPlanet}
      />
    </group>
  );
};
