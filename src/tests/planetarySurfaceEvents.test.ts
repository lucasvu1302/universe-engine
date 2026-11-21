import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, screen } from '@testing-library/react';
import { PLANET_KEYS, CELESTIAL_BODIES } from '@/data/celestialData';
import { CameraManager } from '@/engine/camera/CameraManager';
import { PerformanceManager } from '@/engine/performance/PerformanceManager';
import { AudioManager } from '@/engine/audio/AudioManager';
import { SimulationClock } from '@/engine/simulation/SimulationClock';
import { useAppStore } from '@/stores/useAppStore';
import { TargetHUD } from '@/ui/TargetHUD';

const SRC_ROOT = path.resolve(__dirname, '..');

async function loadEventsDataModule() {
  const filePath = path.join(SRC_ROOT, 'data/planetaryEventsData.ts');
  expect(fs.existsSync(filePath), 'Missing src/data/planetaryEventsData.ts').toBe(true);
  const moduleSpecifier = '../data/planetaryEventsData';
  return await import(/* @vite-ignore */ moduleSpecifier);
}

describe('Planetary Surface & Atmospheric Events — Data, Store, Camera, Performance & Audio (SPEC-009 T1)', () => {
  beforeEach(() => {
    const cam = CameraManager.getInstance();
    const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 80000);
    camera.position.set(110, 35, 95);
    cam.setCamera(camera);
    cam.cancelActiveTransition();
    cam.exitGalaxyMode(true);
    cam.activeFocusId = null;
    cam.state = 'ORBIT';
    SimulationClock.getInstance().simulationTime = 12.5;
    useAppStore.setState({
      cameraMode: 'ORBIT',
      targetId: 'sun',
      soundEnabled: false,
      activeSurface: 'none',
      activeCosmicLab: 'none',
      inExoSystem: false,
      compareMode: false,
    });
  });

  it('R1.a: covers all 16 bodies (8 planets + Sun + 7 active moons) with 44 unique bilingual events and exact spherical/world-normal rotation math', async () => {
    const mod = await loadEventsDataModule();

    const expectedBodies = [
      ...PLANET_KEYS,
      'sun',
      'moon',
      'io',
      'europa',
      'ganymede',
      'titan',
      'enceladus',
      'triton',
    ];

    expect(mod.PLANETARY_EVENT_BODIES).toHaveLength(16);
    for (const id of expectedBodies) {
      expect(mod.PLANETARY_EVENT_BODIES).toContain(id);
      const events = mod.getPlanetaryEvents(id);
      expect(events.length, `Expected events for ${id}`).toBeGreaterThanOrEqual(
        (PLANET_KEYS as readonly string[]).includes(id) ? 3 : 1
      );
    }

    expect(mod.PLANETARY_EVENTS).toHaveLength(44);

    // Every event has unique id, valid bodyId, finite lat/lon, bilingual strings & metrics
    const seenIds = new Set<string>();
    for (const ev of mod.PLANETARY_EVENTS) {
      expect(seenIds.has(ev.id), `Duplicate event id ${ev.id}`).toBe(false);
      seenIds.add(ev.id);
      expect(CELESTIAL_BODIES[ev.bodyId], `Unknown bodyId ${ev.bodyId}`).toBeDefined();
      expect(ev.latDeg).toBeGreaterThanOrEqual(-90);
      expect(ev.latDeg).toBeLessThanOrEqual(90);
      expect(ev.lonDeg).toBeGreaterThanOrEqual(-180);
      expect(ev.lonDeg).toBeLessThanOrEqual(180);
      expect(ev.titleVi.trim().length).toBeGreaterThan(2);
      expect(ev.titleEn.trim().length).toBeGreaterThan(2);
      expect(ev.summaryVi.trim().length).toBeGreaterThan(10);
      expect(ev.summaryEn.trim().length).toBeGreaterThan(10);
      expect(ev.metricLabelVi.trim().length).toBeGreaterThan(1);
      expect(ev.metricValueVi.trim().length).toBeGreaterThan(1);
      expect(mod.getPlanetaryEventById(ev.id)?.id).toBe(ev.id);
    }

    // Prime meridian (0°, 0°) -> (+1, 0, 0), North pole (90°, 0°) -> (0, 1, 0), 90°E -> (0, 0, -1)
    const prime = mod.latLonToLocalNormal(0, 0);
    expect(prime.x).toBeCloseTo(1, 5);
    expect(prime.y).toBeCloseTo(0, 5);
    expect(prime.z).toBeCloseTo(0, 5);

    const north = mod.latLonToLocalNormal(90, 0);
    expect(north.y).toBeCloseTo(1, 5);
    expect(north.length()).toBeCloseTo(1, 5);

    const east90 = mod.latLonToLocalNormal(0, 90);
    expect(east90.z).toBeCloseTo(-1, 5);
    expect(east90.length()).toBeCloseTo(1, 5);

    // World normal matches exact R_x(axialTiltDeg) * R_y(rotAngle) order for spin (including superRotation !== 1 on tilted Uranus/Earth)
    const simTime = 24.0;
    const axisX = new THREE.Vector3(1, 0, 0);
    const axisY = new THREE.Vector3(0, 1, 0);

    const checkSpinOrder = (bodyId: string, latDeg: number, lonDeg: number, superRotation: number) => {
      const body = CELESTIAL_BODIES[bodyId];
      const rotAngle = SimulationClock.calculateRotationAngle(body.rotationSpeed * superRotation, simTime);
      const tiltRad = THREE.MathUtils.degToRad(body.axialTiltDeg ?? 0);

      // Reference: first spin around local Y, then tilt around X -> R_x(tilt) * R_y(rot)
      const expected = mod.latLonToLocalNormal(latDeg, lonDeg)
        .applyAxisAngle(axisY, rotAngle)
        .applyAxisAngle(axisX, tiltRad)
        .normalize();

      const actual = mod.computeHotspotWorldNormal(bodyId, latDeg, lonDeg, simTime, {
        frameMode: 'spin',
        superRotation,
      });
      expect(actual.length()).toBeCloseTo(1, 5);
      expect(actual.distanceTo(expected)).toBeLessThan(1e-5);

      // Reversed order R_y * R_x must differ significantly on tilted Uranus (97.77 deg)
      if (Math.abs(body.axialTiltDeg ?? 0) > 20) {
        const wrongOrder = mod.latLonToLocalNormal(latDeg, lonDeg)
          .applyAxisAngle(axisX, tiltRad)
          .applyAxisAngle(axisY, rotAngle)
          .normalize();
        expect(actual.distanceTo(wrongOrder)).toBeGreaterThan(0.05);
      }
    };

    checkSpinOrder('jupiter', -22, -45, 1.0);
    checkSpinOrder('uranus', 38, -20, 1.35);
    checkSpinOrder('earth', 18, 134, 1.08);

    const satHexT0 = mod.computeHotspotWorldNormal('saturn', 78, 0, 0, { frameMode: 'tilt_locked' });
    const satHexT24 = mod.computeHotspotWorldNormal('saturn', 78, 0, 24, { frameMode: 'tilt_locked' });
    expect(satHexT0.distanceTo(satHexT24)).toBeLessThan(1e-5);

    const antiSolar = mod.computeHotspotWorldNormal('mercury', 0, 180, simTime, {
      frameMode: 'antisolar',
      bodyWorldPos: new THREE.Vector3(32, 0, 0),
    });
    expect(antiSolar.x).toBeCloseTo(1, 5);

    // LOD thresholds: Sun overview (264u) culls cleanly (> 10R=180u, > 12.5R=225u) while Sun focus (60.3u) is inside fadeStart (108u)
    const sunLod = mod.getPlanetaryLodThresholds('sun', 18, false);
    expect(sunLod.fadeStart).toBeCloseTo(108, 3);
    expect(sunLod.cullDist).toBeCloseTo(180, 3);
    expect(264).toBeGreaterThan(sunLod.cullDist);
    expect(60.3).toBeLessThan(sunLod.fadeStart);

    const earthLodSelected = mod.getPlanetaryLodThresholds('earth', 2.5, true);
    expect(earthLodSelected.fadeStart).toBeCloseTo(2.5 * 14 * 1.25, 3);
    expect(earthLodSelected.cullDist).toBeCloseTo(2.5 * 20 * 1.25, 3);
  });

  it('R1.b (neg): handles non-surface bodyIds, NaN/Infinity coordinates, and out-of-window burst timestamps safely', async () => {
    const mod = await loadEventsDataModule();

    for (const invalidId of ['blackhole', 'pulsar', 'iss', 'constellation_orion', '', 'unknown_xyz']) {
      expect(mod.getPlanetaryEvents(invalidId)).toEqual([]);
    }

    const nanVec = mod.latLonToLocalNormal(Number.NaN, Number.POSITIVE_INFINITY);
    expect(Number.isFinite(nanVec.x)).toBe(true);
    expect(Number.isFinite(nanVec.y)).toBe(true);
    expect(Number.isFinite(nanVec.z)).toBe(true);
    expect(nanVec.length()).toBeCloseTo(1, 5);

    // Burst multiplier curve: peak 2.2 in 0..800ms, smooth decay 800..6000ms, 1.0 outside or invalid
    const burst = { eventId: 'jupiter_great_red_spot', nonce: 1, triggeredAt: 10000 };
    expect(mod.evaluateEventBurstMultiplier(null, 'jupiter_great_red_spot', 10200)).toBe(1.0);
    expect(mod.evaluateEventBurstMultiplier(burst, 'other_event', 10200)).toBe(1.0);
    expect(mod.evaluateEventBurstMultiplier(burst, 'jupiter_great_red_spot', 9999)).toBe(1.0);
    expect(mod.evaluateEventBurstMultiplier(burst, 'jupiter_great_red_spot', Number.NaN)).toBe(1.0);
    expect(mod.evaluateEventBurstMultiplier(burst, 'jupiter_great_red_spot', 10400)).toBeCloseTo(2.2, 4);
    const decaying = mod.evaluateEventBurstMultiplier(burst, 'jupiter_great_red_spot', 13000);
    expect(decaying).toBeGreaterThan(1.0);
    expect(decaying).toBeLessThan(2.2);
    expect(mod.evaluateEventBurstMultiplier(burst, 'jupiter_great_red_spot', 16000)).toBe(1.0);
  });

  it('R3.a: store actions, QualityProfile.planetaryEventParticleScale, and zero-allocation CameraManager.focusPlanetHotspot', async () => {
    const mod = await loadEventsDataModule();

    // 1. Store defaults, clamping & burst nonce
    const store = useAppStore.getState() as unknown as Record<string, unknown>;
    expect(store.planetaryEventsEnabled).toBe(true);
    expect(store.planetaryEventIntensity).toBe(1.0);
    expect(store.selectedPlanetaryEventId).toBeNull();
    expect(typeof store.setPlanetaryEventsEnabled).toBe('function');
    expect(typeof store.setPlanetaryEventIntensity).toBe('function');
    expect(typeof store.setSelectedPlanetaryEventId).toBe('function');
    expect(typeof store.triggerPlanetaryEventBurst).toBe('function');

    (store.setPlanetaryEventIntensity as (v: number) => void)(5.0);
    expect((useAppStore.getState() as unknown as { planetaryEventIntensity: number }).planetaryEventIntensity).toBe(1.6);
    (store.setPlanetaryEventIntensity as (v: number) => void)(0.1);
    expect((useAppStore.getState() as unknown as { planetaryEventIntensity: number }).planetaryEventIntensity).toBe(0.6);
    (store.setPlanetaryEventIntensity as (v: number) => void)(1.0);

    (store.triggerPlanetaryEventBurst as (id: string) => void)('jupiter_great_red_spot');
    const b1 = (useAppStore.getState() as unknown as { planetaryEventBurst: { eventId: string; nonce: number } | null }).planetaryEventBurst;
    expect(b1?.eventId).toBe('jupiter_great_red_spot');
    expect(b1?.nonce).toBeGreaterThanOrEqual(1);
    (store.triggerPlanetaryEventBurst as (id: string) => void)('jupiter_great_red_spot');
    const b2 = (useAppStore.getState() as unknown as { planetaryEventBurst: { nonce: number } | null }).planetaryEventBurst;
    expect(b2?.nonce).toBe((b1?.nonce ?? 0) + 1);

    // 2. PerformanceManager QualityProfile adds planetaryEventParticleScale across LOW..ULTRA
    const pm = PerformanceManager.getInstance();
    expect((pm.getQualityProfile('LOW', 1) as unknown as { planetaryEventParticleScale?: number }).planetaryEventParticleScale).toBe(0.4);
    expect((pm.getQualityProfile('MEDIUM', 2) as unknown as { planetaryEventParticleScale?: number }).planetaryEventParticleScale).toBe(0.7);
    expect((pm.getQualityProfile('HIGH', 3) as unknown as { planetaryEventParticleScale?: number }).planetaryEventParticleScale).toBe(1.0);
    expect((pm.getQualityProfile('ULTRA', 4) as unknown as { planetaryEventParticleScale?: number }).planetaryEventParticleScale).toBe(1.25);

    // 3. CameraManager.focusPlanetHotspot glides onto hotspot hemisphere with >= minDistance & zero allocations in updateOrbit
    const cam = CameraManager.getInstance() as CameraManager & {
      focusPlanetHotspot?: (
        bodyId: string,
        latDeg: number,
        lonDeg: number,
        options?: { superRotation?: number; frameMode?: 'spin' | 'tilt_locked' | 'antisolar'; distanceMultiplier?: number }
      ) => void;
    };
    expect(typeof cam.focusPlanetHotspot).toBe('function');

    cam.focusPlanetHotspot?.('jupiter', -22, -45, { frameMode: 'spin', superRotation: 1.0 });
    expect(cam.activeFocusId).toBe('jupiter');
    expect(cam.state).toBe('TRANSITIONING');

    for (let i = 0; i < 45; i++) {
      cam.updateTransition(0.05);
    }
    expect(cam.state).toBe('ORBIT');

    const jupPos = cam.getLiveBodyPosition('jupiter');
    const camOffset = cam.camera!.position.clone().sub(jupPos);
    expect(camOffset.length()).toBeGreaterThanOrEqual(cam.getAdaptiveMinDistance() - 0.1);

    const hotspotWorldNormal = mod.computeHotspotWorldNormal(
      'jupiter',
      -22,
      -45,
      SimulationClock.getInstance().simulationTime,
      { frameMode: 'spin', superRotation: 1.0 }
    );
    // Camera must sit in the hotspot's visible hemisphere (positive dot product > 0.6)
    expect(camOffset.clone().normalize().dot(hotspotWorldNormal)).toBeGreaterThan(0.6);

    // Zero Vector3 allocations / clones across 100 frames of updateOrbit after hotspot arrival
    const cloneSpy = vi.spyOn(THREE.Vector3.prototype, 'clone');
    for (let i = 0; i < 100; i++) {
      cam.updateOrbit(0.016);
    }
    expect(cloneSpy).not.toHaveBeenCalled();
    cloneSpy.mockRestore();
  });

  it('R3.b (neg): focusPlanetHotspot ignores invalid bodies/NaN and AudioManager.playPlanetaryEventCue is safe when muted/headless', () => {
    const cam = CameraManager.getInstance() as CameraManager & {
      focusPlanetHotspot?: (bodyId: string, latDeg: number, lonDeg: number) => void;
    };
    const prevState = cam.state;
    const prevFocus = cam.activeFocusId;

    expect(() => cam.focusPlanetHotspot?.('blackhole', 0, 0)).not.toThrow();
    expect(() => cam.focusPlanetHotspot?.('constellation_orion', 10, 20)).not.toThrow();
    expect(() => cam.focusPlanetHotspot?.('earth', Number.NaN, 10)).not.toThrow();
    expect(cam.state).toBe(prevState);
    expect(cam.activeFocusId).toBe(prevFocus);

    const audio = AudioManager.getInstance() as AudioManager & {
      playPlanetaryEventCue?: (archetype: string) => void;
    };
    expect(typeof audio.playPlanetaryEventCue).toBe('function');
    expect(() => audio.playPlanetaryEventCue?.('volcanic_plume')).not.toThrow();
    expect(() => audio.playPlanetaryEventCue?.('lightning_storm')).not.toThrow();
    expect(() => audio.playPlanetaryEventCue?.('polar_aurora')).not.toThrow();
  });

  it('F1/F2 regression: focusPlanetHotspot clears Sun/Saturn surfaces on antipodal hops, ignores GALAXY 80u minDist, and preserves activeFocusId when camera is null', async () => {
    const mod = await loadEventsDataModule();
    const cam = CameraManager.getInstance() as CameraManager & {
      camera: THREE.PerspectiveCamera | null;
      activeFocusId: string | null;
      focusPlanetHotspot?: (
        bodyId: string,
        latDeg: number,
        lonDeg: number,
        options?: { superRotation?: number; frameMode?: string; distanceMultiplier?: number }
      ) => void;
    };

    const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 20000);
    cam.setCamera(camera);

    // 1. F1: Sun opposite-hemisphere hop (sun_cme_eruption -12,-65 -> sun_sunspot_ar -18,+110) must never clip inside Sun R=18
    cam.focusPlanetHotspot?.('sun', -12, -65, { frameMode: 'spin', superRotation: 1.0 });
    for (let i = 0; i < 60; i++) cam.updateTransition(0.05);

    const sunCenter = new THREE.Vector3(0, 0, 0);
    cam.focusPlanetHotspot?.('sun', -18, 110, { frameMode: 'spin', superRotation: 1.0 });
    for (let i = 0; i < 60; i++) {
      cam.updateTransition(0.05);
      const dist = camera.position.distanceTo(sunCenter);
      expect(dist, `Sun antipodal hop clipped photosphere at step ${i}: ${dist}`).toBeGreaterThan(
        CELESTIAL_BODIES.sun.visualRadius * 1.45
      );
    }

    // Saturn polar hop (+78 -> -76) must never clip inside Saturn R=5.5
    const satPos = cam.getLiveBodyPosition('saturn', new THREE.Vector3());
    cam.focusPlanetHotspot?.('saturn', 78, 0, { frameMode: 'tilt_locked' });
    for (let i = 0; i < 60; i++) cam.updateTransition(0.05);

    cam.focusPlanetHotspot?.('saturn', -76, 140, { frameMode: 'tilt_locked' });
    for (let i = 0; i < 60; i++) {
      cam.updateTransition(0.05);
      const liveSat = cam.getLiveBodyPosition('saturn', new THREE.Vector3());
      const dist = camera.position.distanceTo(liveSat);
      expect(dist, `Saturn pole-to-pole hop clipped body at step ${i}: ${dist}`).toBeGreaterThan(
        CELESTIAL_BODIES.saturn.visualRadius * 1.45
      );
    }
    expect(satPos.length()).toBeGreaterThan(0);

    // 2. F2a: Calling focusPlanetHotspot from GALAXY mode must NOT inherit GALAXY's 80u minDist (must land well inside Earth LOD cullDist)
    cam.flyToGalaxyView();
    for (let i = 0; i < 60; i++) cam.updateTransition(0.05);
    expect(cam.state).toBe('GALAXY');

    cam.focusPlanetHotspot?.('earth', 18, 134, { frameMode: 'spin', superRotation: 1.08 });
    for (let i = 0; i < 60; i++) cam.updateTransition(0.05);
    const liveEarth = cam.getLiveBodyPosition('earth', new THREE.Vector3());
    const earthArrivalDist = camera.position.distanceTo(liveEarth);
    const earthLod = mod.getPlanetaryLodThresholds('earth', CELESTIAL_BODIES.earth.visualRadius, true);
    expect(earthArrivalDist).toBeLessThan(earthLod.fadeStart);
    expect(earthArrivalDist).toBeGreaterThanOrEqual(CELESTIAL_BODIES.earth.visualRadius * 1.6);

    // 3. F2b: When camera === null, focusPlanetHotspot must NOT corrupt activeFocusId
    const prevFocus = cam.activeFocusId;
    cam.camera = null;
    cam.focusPlanetHotspot?.('mars', -32, 70);
    expect(cam.activeFocusId).toBe(prevFocus);
    cam.setCamera(camera);

    // 4. U3/U5 & front-3/4 plume framing: volcanic_plume frames clearly on front-3/4 face (0.65 < dot < 0.80)
    // while solar_flare_loop frames at grazing limb silhouette (0.45 < dot < 0.65)
    const ioPos = cam.getLiveBodyPosition('io', new THREE.Vector3());
    (cam.focusPlanetHotspot as (
      id: string,
      lat: number,
      lon: number,
      opts?: { frameMode?: string; superRotation?: number; archetype?: string }
    ) => void)('io', -19, -105, { frameMode: 'spin', superRotation: 1.0, archetype: 'volcanic_plume' });
    for (let i = 0; i < 60; i++) cam.updateTransition(0.05);
    const liveIo = cam.getLiveBodyPosition('io', new THREE.Vector3());
    const ioCamDir = camera.position.clone().sub(liveIo).normalize();
    const ioNormal = mod.computeHotspotWorldNormal('io', -19, -105, SimulationClock.getInstance().simulationTime, {
      frameMode: 'spin',
      superRotation: 1.0,
    });
    const limbDot = ioCamDir.dot(ioNormal);
    expect(ioPos.length()).toBeGreaterThan(0);
    expect(limbDot).toBeGreaterThan(0.65);
    expect(limbDot).toBeLessThan(0.80);

    (cam.focusPlanetHotspot as (
      id: string,
      lat: number,
      lon: number,
      opts?: { frameMode?: string; superRotation?: number; archetype?: string }
    ) => void)('sun', 16, 25, { frameMode: 'spin', superRotation: 1.0, archetype: 'solar_flare_loop' });
    for (let i = 0; i < 60; i++) cam.updateTransition(0.05);
    const sunCamDir = camera.position.clone().normalize();
    const sunFlareNormal = mod.computeHotspotWorldNormal('sun', 16, 25, SimulationClock.getInstance().simulationTime, {
      frameMode: 'spin',
      superRotation: 1.0,
    });
    const sunLimbDot = sunCamDir.dot(sunFlareNormal);
    expect(sunLimbDot).toBeGreaterThan(0.45);
    expect(sunLimbDot).toBeLessThan(0.68);
    // isViewingHotspot must recognize already-framed grazing solar flare & front-3/4 plumes (no redundant re-tween on Trigger Surge)
    expect(
      cam.isViewingHotspot('sun', 16, 25, {
        frameMode: 'spin',
        superRotation: 1.0,
        archetype: 'solar_flare_loop',
      })
    ).toBe(true);
    expect(
      cam.isViewingHotspot('sun', -16, -155, {
        frameMode: 'spin',
        superRotation: 1.0,
        archetype: 'solar_flare_loop',
      })
    ).toBe(false);

    // 5. Post-arrival spin co-rotation tracking in updateOrbit (keeps focused hotspot facing camera as SimulationClock advances, releases on rotateOrbit)
    SimulationClock.getInstance().simulationTime = 10.0;
    (cam.focusPlanetHotspot as (
      id: string,
      lat: number,
      lon: number,
      opts?: { frameMode?: string; superRotation?: number; archetype?: string }
    ) => void)('jupiter', -22.5, -92, { frameMode: 'spin', superRotation: 1.0, archetype: 'cyclone_vortex' });
    for (let i = 0; i < 60; i++) cam.updateTransition(0.05);

    const jupAtArrival = cam.getLiveBodyPosition('jupiter', new THREE.Vector3());
    const grsAtArrival = mod.computeHotspotWorldNormal('jupiter', -22.5, -92, SimulationClock.getInstance().simulationTime, {
      frameMode: 'spin',
      superRotation: 1.0,
    });
    const arrivalDot = camera.position.clone().sub(jupAtArrival).normalize().dot(grsAtArrival);
    expect(arrivalDot).toBeGreaterThan(0.88);

    // Advance simulation clock ~10 simulated seconds (Jupiter rotates ~2.25 rad = 129 deg!) while running updateOrbit
    for (let i = 0; i < 60; i++) {
      SimulationClock.getInstance().simulationTime += 0.16;
      cam.updateOrbit(0.016);
    }
    const jupAfterSpin = cam.getLiveBodyPosition('jupiter', new THREE.Vector3());
    const grsAfterSpin = mod.computeHotspotWorldNormal('jupiter', -22.5, -92, SimulationClock.getInstance().simulationTime, {
      frameMode: 'spin',
      superRotation: 1.0,
    });
    const trackedDot = camera.position.clone().sub(jupAfterSpin).normalize().dot(grsAfterSpin);
    expect(trackedDot, 'Hotspot rotated out of view during updateOrbit instead of co-rotating').toBeGreaterThan(0.85);

    // Manual drag (rotateOrbit) must immediately release hotspot spin-lock so camera never fights the user
    cam.rotateOrbit(0.4, 0);
    const thetaBeforeSpin = cam.targetSpherical.theta;
    SimulationClock.getInstance().simulationTime += 4.0;
    cam.updateOrbit(0.016);
    expect(Math.abs(cam.targetSpherical.theta - thetaBeforeSpin)).toBeLessThan(1e-4);
  });

  it('R2.a/R2.b/U2: 5 custom GLSL shaders + PlanetaryEventsLayer enforce NOOP_RAYCAST, zero dynamic lights, GPU disposal, QualityProfile particle scaling, Distance LOD, Sun SimulationClock+tilt sync, Earth solarStormActive yield, reducedMotion, and CompareScene hideEvents', () => {
    const requiredShaders = [
      'shaders/phenomena/planetaryVortex.vert.glsl',
      'shaders/phenomena/planetaryVortex.frag.glsl',
      'shaders/phenomena/planetaryPlume.vert.glsl',
      'shaders/phenomena/planetaryPlume.frag.glsl',
      'shaders/phenomena/planetaryAurora.frag.glsl',
    ];
    for (const rel of requiredShaders) {
      const fullPath = path.join(SRC_ROOT, rel);
      expect(fs.existsSync(fullPath), `Missing shader: ${rel}`).toBe(true);
    }

    const layerPath = path.join(SRC_ROOT, 'entities/Phenomena/PlanetaryEventsLayer.tsx');
    expect(fs.existsSync(layerPath), 'Missing PlanetaryEventsLayer.tsx').toBe(true);
    const layerSrc = fs.readFileSync(layerPath, 'utf8');

    // GPU hygiene: EVERY <mesh>, <points>, and <lineSegments> primitive must carry raycast={NOOP_RAYCAST}
    const primitiveTags = layerSrc.match(/<(?:mesh|points|lineSegments)\b[\s\S]*?\/>/g) ?? [];
    expect(primitiveTags.length).toBeGreaterThanOrEqual(9);
    for (const tag of primitiveTags) {
      expect(tag, `Missing NOOP_RAYCAST on JSX primitive:\n${tag}`).toContain('raycast={NOOP_RAYCAST}');
    }
    expect(layerSrc).not.toMatch(/<pointLight|<spotLight/);
    expect(layerSrc).toContain('.dispose()');
    expect(layerSrc).not.toContain('softParticleMap.dispose()');
    expect(layerSrc).toContain('planetaryEventParticleScale');
    expect(layerSrc).toContain('getPlanetaryLodThresholds');
    expect(layerSrc).toContain('solarStormActive');
    expect(layerSrc).toContain('reducedMotion');
    expect(layerSrc).toContain('planetaryEventsEnabled');
    expect(layerSrc).toContain('auroraCurtain.vert.glsl');
    expect(layerSrc).toContain('planetaryAurora.frag.glsl');

    // F3 GLSL ES safety & U1–U5 photorealism invariants
    const vortexFragSrc = fs.readFileSync(
      path.join(SRC_ROOT, 'shaders/phenomena/planetaryVortex.frag.glsl'),
      'utf8'
    );
    const plumeVertSrc = fs.readFileSync(
      path.join(SRC_ROOT, 'shaders/phenomena/planetaryPlume.vert.glsl'),
      'utf8'
    );
    const auroraFragSrc = fs.readFileSync(
      path.join(SRC_ROOT, 'shaders/phenomena/planetaryAurora.frag.glsl'),
      'utf8'
    );
    const vortexVertSrc = fs.readFileSync(
      path.join(SRC_ROOT, 'shaders/phenomena/planetaryVortex.vert.glsl'),
      'utf8'
    );
    expect(vortexVertSrc).toContain('normalize(position)');
    expect(layerSrc).toContain('indices.push(a, b, c, b, d, c)');
    expect(vortexFragSrc).not.toMatch(/float angle = atan\(p\.y, p\.x\);/);
    expect(vortexFragSrc).not.toMatch(/float eAngle = atan\(ep\.y, ep\.x\);/);
    expect(vortexFragSrc).not.toMatch(/pow\(\s*0\.5\s*\+/);
    expect(vortexFragSrc).toContain('solarLit');
    expect(vortexFragSrc).toContain('uHasEye');
    expect(plumeVertSrc).not.toMatch(/pow\(\s*age\s*,/);
    expect(plumeVertSrc).not.toMatch(/pow\(\s*max\(\s*0\.0/);
    expect(plumeVertSrc).toContain('uVisualRadius');
    expect(auroraFragSrc).toContain('ringCoord');
    expect(auroraFragSrc).toContain('grazingSoft');
    expect(layerSrc).toContain('buildSolarArcadeTubeGeometry');
    expect(layerSrc).toContain("ev.id === 'neptune_supersonic_storm'");
    expect(layerSrc).not.toContain('neptune_dark_spot');

    // U2/U4/U6/U9 astronomical alignment invariants
    const dataSrc = fs.readFileSync(path.join(SRC_ROOT, 'data/planetaryEventsData.ts'), 'utf8');
    expect(dataSrc).toContain('latDeg: -22.5');
    expect(dataSrc).toContain('lonDeg: -92');
    expect(dataSrc).not.toContain("primaryColor: '#38bdf8',\n    secondaryColor: '#f59e0b',\n    titleVi: 'Dòng Tia Lục Giác");

    // Planet.tsx mounts PlanetaryEventsLayer inside axial tilt container & forwards hideEvents to moons
    const planetSrc = fs.readFileSync(path.join(SRC_ROOT, 'entities/Planet/Planet.tsx'), 'utf8');
    expect(planetSrc).toContain('PlanetaryEventsLayer');
    expect(planetSrc).toContain('hideEvents');

    // Sun.tsx aligns rotation with SimulationClock, wraps in axialTiltDeg, scales by sunRadius, supports hideEvents
    const sunSrc = fs.readFileSync(path.join(SRC_ROOT, 'entities/Sun/Sun.tsx'), 'utf8');
    expect(sunSrc).toContain('PlanetaryEventsLayer');
    expect(sunSrc).toContain('SimulationClock.calculateRotationAngle');
    expect(sunSrc).toContain('axialTiltDeg');
    expect(sunSrc).toContain('hideEvents');

    // CompareScene.tsx passes hideEvents to both <Sun> and <Planet>
    const compareSrc = fs.readFileSync(path.join(SRC_ROOT, 'scenes/Compare/CompareScene.tsx'), 'utf8');
    expect(compareSrc).toMatch(/<Sun[^>]*hideEvents/);
    expect(compareSrc).toMatch(/<Planet[^>]*hideEvents/);
  });

  describe('TargetHUD Live Surface Events Panel (SPEC-009 T3)', () => {
    afterEach(() => {
      cleanup();
    });

    it('R4.a: renders planetary-events-section below quick actions for Jupiter/Earth/Sun, handles chip selection, focus hotspot, burst surge, intensity presets, target fallback, and auto-re-enable', () => {
      // Desktop width >= 640px so events section opens expanded by default
      Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1440 });
      useAppStore.setState({
        targetId: 'jupiter',
        hoveredId: null,
        planetaryEventsEnabled: false,
        planetaryEventIntensity: 1.0,
        selectedPlanetaryEventId: 'earth_pacific_typhoon', // stale event from another body -> must fall back to Jupiter's first event
        planetaryEventBurst: null,
      });

      const hotspotSpy = vi.spyOn(CameraManager.getInstance(), 'focusPlanetHotspot');
      const { rerender } = render(React.createElement(TargetHUD));

      const section = screen.getByTestId('planetary-events-section');
      expect(section).toBeTruthy();

      // Must render AFTER Jupiter's quick-action-cutaway-jupiter button in DOM order
      const quickBtn = screen.getByTestId('quick-action-cutaway-jupiter');
      expect(Boolean(quickBtn.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);

      // SPEC-010 Hybrid A1: clicking an orbital event chip selects it, auto-enables events, and smoothly focuses the 3D hotspot
      const grsChip = screen.getByTestId('planetary-event-chip-jupiter_great_red_spot');
      fireEvent.click(grsChip);
      expect(useAppStore.getState().selectedPlanetaryEventId).toBe('jupiter_great_red_spot');
      expect(useAppStore.getState().planetaryEventsEnabled).toBe(true);
      expect(hotspotSpy).toHaveBeenCalledTimes(1);
      expect(hotspotSpy).toHaveBeenLastCalledWith(
        'jupiter',
        -22.5,
        -92,
        expect.objectContaining({ frameMode: 'spin', superRotation: 1.0, archetype: 'cyclone_vortex' })
      );

      // Clicking a surface-classified chip auto-dives into PlanetaryEventSurfaceScene (SPEC-010 A1)
      const boltChip = screen.getByTestId('planetary-event-chip-jupiter_ammonia_superbolts');
      fireEvent.click(boltChip);
      expect(useAppStore.getState().selectedPlanetaryEventId).toBe('jupiter_ammonia_superbolts');
      expect(useAppStore.getState().activeEventSurfaceId).toBe('jupiter_ammonia_superbolts');
      useAppStore.setState({ activeEventSurfaceId: null });

      // Clicking Focus Hotspot while disabled must also auto-re-enable planetaryEventsEnabled and invoke focusPlanetHotspot
      useAppStore.setState({ planetaryEventsEnabled: false });
      hotspotSpy.mockClear();
      fireEvent.click(screen.getByTestId('planetary-event-focus-btn'));
      expect(useAppStore.getState().planetaryEventsEnabled).toBe(true);
      expect(hotspotSpy).toHaveBeenCalledWith(
        'jupiter',
        12,
        35,
        expect.objectContaining({ frameMode: 'spin', superRotation: 1.08, archetype: 'lightning_storm' })
      );

      // U7/U8/U10: Pinned header outside scroll body + ARIA states + hemisphere coordinates
      expect(screen.getByTestId('target-hud-header')).toBeTruthy();
      expect(screen.getByTestId('planetary-events-toggle').getAttribute('aria-expanded')).toBe('true');
      expect(screen.getByTestId('planetary-events-toggle').getAttribute('aria-controls')).toBe(
        'planetary-events-panel-body'
      );
      expect(screen.getByTestId('planetary-events-active-toggle').getAttribute('aria-pressed')).toBe('true');
      expect(boltChip.getAttribute('aria-pressed')).toBe('true');
      expect(section.textContent).toContain('12°N · 35°E');

      // Clicking Burst Surge while off-angle auto-focuses the hotspot, increments nonce & keeps events enabled
      useAppStore.setState({ planetaryEventsEnabled: false });
      hotspotSpy.mockClear();
      fireEvent.click(screen.getByTestId('planetary-event-burst-btn'));
      expect(useAppStore.getState().planetaryEventsEnabled).toBe(true);
      expect(useAppStore.getState().planetaryEventBurst?.eventId).toBe('jupiter_ammonia_superbolts');
      expect(useAppStore.getState().planetaryEventBurst?.nonce).toBeGreaterThanOrEqual(1);
      expect(hotspotSpy).toHaveBeenCalledWith(
        'jupiter',
        12,
        35,
        expect.objectContaining({ frameMode: 'spin', superRotation: 1.08, archetype: 'lightning_storm' })
      );

      // Intensity presets: Low (0.6), Normal (1.0), Extreme (1.6) with aria-pressed
      fireEvent.click(screen.getByTestId('planetary-event-intensity-extreme'));
      expect(useAppStore.getState().planetaryEventIntensity).toBe(1.6);
      expect(screen.getByTestId('planetary-event-intensity-extreme').getAttribute('aria-pressed')).toBe('true');
      fireEvent.click(screen.getByTestId('planetary-event-intensity-low'));
      expect(useAppStore.getState().planetaryEventIntensity).toBe(0.6);

      // Switching target to Sun falls back cleanly to Sun's events & shows Planets (not Moons) metric (U11)
      useAppStore.setState({ targetId: 'sun' });
      rerender(React.createElement(TargetHUD));
      expect(screen.getByTestId('planetary-event-chip-sun_xclass_flare')).toBeTruthy();
      expect(screen.getByTestId('target-hud-scroll').textContent).toMatch(/Hành Tinh|Planets/i);

      hotspotSpy.mockRestore();
    });

    it('R4.b (neg): omits planetary-events-section for blackhole, pulsar, iss, and constellation_orion while keeping existing testids intact, and defaults collapsed on 390px mobile', () => {
      for (const nonEventId of ['blackhole', 'pulsar', 'iss', 'constellation_orion']) {
        useAppStore.setState({ targetId: nonEventId, hoveredId: null });
        const { unmount } = render(React.createElement(TargetHUD));
        expect(screen.queryByTestId('planetary-events-section')).toBeNull();
        expect(screen.getByTestId('light-delay-readout')).toBeTruthy();
        unmount();
      }

      // Mobile 390px viewport: section renders collapsed by default (toggle visible, chips hidden until tapped)
      Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 390 });
      useAppStore.setState({ targetId: 'earth', hoveredId: null });
      const { unmount } = render(React.createElement(TargetHUD));
      expect(screen.getByTestId('planetary-events-toggle')).toBeTruthy();
      expect(screen.queryByTestId('planetary-event-focus-btn')).toBeNull();
      fireEvent.click(screen.getByTestId('planetary-events-toggle'));
      expect(screen.getByTestId('planetary-event-focus-btn')).toBeTruthy();
      unmount();
    });
  });
});
