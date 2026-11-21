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
import { CelestialOverlay } from '@/entities/Constellations/CelestialOverlay';
import { SolarStormAurora } from '@/entities/Phenomena/SolarStormAurora';
import { HohmannMissionOverlay } from '@/entities/Missions/HohmannMissionOverlay';
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
  const solarStormActive = useAppStore((state) => state.solarStormActive);
  const missionPlannerOpen = useAppStore((state) => state.missionPlannerOpen);

  const earthPosRef = useRef(new THREE.Vector3());
  const solarGroupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    CameraManager.getInstance().getLiveBodyPosition('earth', earthPosRef.current);
  }, -1);

  useFrame(() => {
    const solarGroup = solarGroupRef.current;
    if (!solarGroup) return;

    const blend = CameraManager.getInstance().galaxyBlend;
    if (blend <= 0.001) {
      solarGroup.visible = true;
      solarGroup.scale.setScalar(1);
    } else if (blend >= 0.58) {
      solarGroup.visible = false;
    } else {
      solarGroup.visible = true;
      const t = blend / 0.58;
      const s = t * t * (3 - 2 * t);
      solarGroup.scale.setScalar(Math.max(0.015, Math.pow(1 - s, 2.2)));
    }
  });

  return (
    <group>
      {/* 360° Volumetric Starfield with Distant Galaxies and Nebulae (stays continuous across Solar System <-> Galaxy) */}
      <StarField />

      <group ref={solarGroupRef}>
      {/* 3D Constellation Sky-Map & Goldilocks Habitable Zone Overlay */}
      <CelestialOverlay />

      {/* Centerpiece Sun */}
      <Sun onSelect={() => onSelectPlanet('sun')} />

      {/* Planetary Orbits and Bodies (including hierarchical Moons) */}
      {PLANET_KEYS.map((key) => {
        const body = CELESTIAL_BODIES[key];
        const isSelected = selectedTarget === key;

        return (
          <React.Fragment key={key}>
            {/* Orbit Path Line matching exact Keplerian parameters (auto-hidden on non-Sun close focus for clean cinema portraits) */}
            <OrbitLine
              distance={body.visualDistance}
              color={body.color}
              isSelected={isSelected}
              dimmed={Boolean(selectedTarget && selectedTarget !== 'sun')}
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
        position={[-650, 220, -750]}
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

      {/* Live 3D Solar Storm, Dipole Magnetosphere & Polar Aurora System */}
      {solarStormActive && <SolarStormAurora earthPosRef={earthPosRef} />}

      {/* Live 3D Hohmann Transfer Orbit & Autonomous Probe Launcher */}
      {missionPlannerOpen && <HohmannMissionOverlay earthPosRef={earthPosRef} />}
      </group>
    </group>
  );
};
