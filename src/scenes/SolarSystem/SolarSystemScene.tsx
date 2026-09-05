import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Sun } from '@/entities/Sun/Sun';
import { Planet } from '@/entities/Planet/Planet';
import { OrbitLine } from '@/entities/Orbits/OrbitLine';
import { AsteroidBelt } from '@/entities/Asteroids/AsteroidBelt';
import { StarField } from '@/entities/StarField/StarField';
import { BlackHole } from '@/entities/BlackHole/BlackHole';
import { Wormhole } from '@/entities/Wormhole/Wormhole';
import { Pulsar } from '@/entities/Pulsar/Pulsar';
import { ISSCupola } from '@/entities/Spacecraft/ISSCupola';
import { JWST } from '@/entities/Spacecraft/JWST';
import { Voyager } from '@/entities/Spacecraft/Voyager';
import { MeteorImpact } from '@/entities/Impacts/MeteorImpact';
import { TidalDisruption } from '@/entities/Impacts/TidalDisruption';
import { Supernova } from '@/entities/Impacts/Supernova';
import { CELESTIAL_BODIES, PLANET_KEYS } from '@/data/celestialData';
import { useAppStore } from '@/stores/useAppStore';
import { CameraManager } from '@/engine/camera/CameraManager';

interface SolarSystemSceneProps {
  onSelectPlanet: (id: string) => void;
  onFocusPlanet: (id: string) => void;
  onEnterWormhole: () => void;
}

export const SolarSystemScene: React.FC<SolarSystemSceneProps> = ({
  onSelectPlanet,
  onFocusPlanet,
  onEnterWormhole
}) => {
  const selectedTarget = useAppStore((state) => state.targetId);
  const activeMeteor = useAppStore((state) => state.activeMeteor);
  const setActiveMeteor = useAppStore((state) => state.setActiveMeteor);
  const activeTidal = useAppStore((state) => state.activeTidal);
  const setActiveTidal = useAppStore((state) => state.setActiveTidal);
  const activeSupernova = useAppStore((state) => state.activeSupernova);
  const setActiveSupernova = useAppStore((state) => state.setActiveSupernova);

  const earthPosRef = useRef(new THREE.Vector3());

  useFrame(() => {
    CameraManager.getInstance().getLiveBodyPosition('earth', earthPosRef.current);
  });

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

      {/* 4D Spherical Wormhole near Saturn (Interstellar Portal) */}
      <Wormhole
        position={[190, 8, 120]}
        onEnterWormhole={onEnterWormhole}
      />

      {/* Relativistic High-Energy Pulsar / Neutron Star */}
      <Pulsar
        position={[-340, 160, -380]}
        onSelect={() => onFocusPlanet('pulsar')}
      />

      {/* International Space Station in Low Earth Orbit */}
      <ISSCupola
        earthPosition={earthPosRef.current}
        onFocus={() => onFocusPlanet('iss')}
      />

      {/* James Webb Space Telescope at Sun-Earth L2 */}
      <JWST
        earthPosition={earthPosRef.current}
        onFocus={() => onFocusPlanet('jwst')}
      />

      {/* Historic Voyager 1 & Voyager 2 Probes at the Heliopause border */}
      <Voyager id="voyager1" onFocus={() => onFocusPlanet('voyager1')} />
      <Voyager id="voyager2" onFocus={() => onFocusPlanet('voyager2')} />

      {/* Sandbox Cataclysms */}
      <MeteorImpact
        active={activeMeteor}
        targetPosition={[earthPosRef.current.x, earthPosRef.current.y, earthPosRef.current.z]}
        onComplete={() => setActiveMeteor(false)}
      />

      <TidalDisruption
        active={activeTidal}
        blackHolePosition={[0, 180, -1200]}
        onComplete={() => setActiveTidal(false)}
      />

      <Supernova
        active={activeSupernova}
        position={[-220, 90, -180]}
        onComplete={() => setActiveSupernova(false)}
      />
    </group>
  );
};
