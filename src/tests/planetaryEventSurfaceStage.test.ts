import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

const vector3Counter = vi.hoisted(() => ({ count: 0 }));

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  class TrackedVector3 extends actual.Vector3 {
    constructor(x?: number, y?: number, z?: number) {
      super(x, y, z);
      vector3Counter.count += 1;
    }
  }
  return {
    ...actual,
    Vector3: TrackedVector3,
  };
});

import * as THREE from 'three';
import {
  PLANETARY_EVENTS,
  PLANETARY_EVENT_BODIES,
  evaluateEventBurstMultiplier,
  getPlanetaryEventById,
  getSurfaceStageConfig,
  type EventSurfaceBiome,
  type PlanetaryEventArchetype,
  type PlanetaryEventViewMode,
  type PlanetarySurfaceEvent,
} from '@/data/planetaryEventsData';
import { useAppStore } from '@/stores/useAppStore';
import { ModeOrchestrator } from '@/engine/navigation/ModeOrchestrator';
import { CameraManager } from '@/engine/camera/CameraManager';
import { SimulationManager } from '@/simulation/core/SimulationManager';
import { AudioManager } from '@/engine/audio/AudioManager';
import { EventSurfaceHUD } from '@/ui/EventSurfaceHUD';
import { TargetHUD } from '@/ui/TargetHUD';
import { EVENT_SURFACE_ARCHETYPE_STAGE } from '@/scenes/EventSurface/PlanetaryEventSurfaceScene';

const VALID_VIEWS: readonly PlanetaryEventViewMode[] = ['orbital', 'surface'];
const VALID_BIOMES: readonly EventSurfaceBiome[] = [
  'volcanic_lava',
  'cryo_ice_geyser',
  'dust_impact_desert',
  'gas_giant_clouds',
  'polar_aurora_sky',
];

const ORBITAL_ARCHETYPES = new Set([
  'cyclone_vortex',
  'polar_hexagon',
  'ice_cloud_veil',
  'plasma_tail',
  'ring_spokes',
  'solar_flare_loop',
]);

const ORBITAL_OVERRIDES = new Set([
  'mars_global_dust_storm',
  'sun_cme_eruption',
  'sun_sunspot_ar',
  'jupiter_polar_aurora',
  'saturn_polar_aurora',
  'uranus_tilted_aurora',
]);

function expectedRecommendedView(ev: PlanetarySurfaceEvent): PlanetaryEventViewMode {
  if (ORBITAL_ARCHETYPES.has(ev.archetype) || ORBITAL_OVERRIDES.has(ev.id)) {
    return 'orbital';
  }
  return 'surface';
}

function expectedSurfaceBiome(ev: PlanetarySurfaceEvent): EventSurfaceBiome {
  if (ev.archetype === 'polar_aurora') return 'polar_aurora_sky';
  if (
    ev.bodyId === 'jupiter' ||
    ev.bodyId === 'saturn' ||
    ev.bodyId === 'uranus' ||
    ev.bodyId === 'neptune' ||
    ev.archetype === 'cyclone_vortex' ||
    ev.archetype === 'lightning_storm'
  ) {
    return 'gas_giant_clouds';
  }
  if (
    ev.archetype === 'volcanic_plume' ||
    ev.archetype === 'solar_flare_loop' ||
    (ev.archetype === 'thermal_fissure' && ev.bodyId !== 'europa')
  ) {
    return 'volcanic_lava';
  }
  if (
    ev.archetype === 'cryo_geyser' ||
    ev.bodyId === 'europa' ||
    ev.bodyId === 'ganymede' ||
    ev.bodyId === 'enceladus' ||
    ev.bodyId === 'triton'
  ) {
    return 'cryo_ice_geyser';
  }
  return 'dust_impact_desert';
}

describe('SPEC-010 T1 — Deterministic View/Biome Classification, Stage Config & Mode State Machine', () => {
  beforeEach(() => {
    const cam = CameraManager.getInstance();
    const mockCam = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 10000);
    mockCam.position.set(0, 40, 120);
    cam.setCamera(mockCam);
    SimulationManager.getInstance().exitScenario();
    useAppStore.setState({
      activeEventSurfaceId: null,
      activeSurface: 'none',
      activeCosmicLab: 'none',
      inExoSystem: false,
      compareMode: false,
      activeTour: false,
      photoMode: false,
      cinemaMode: false,
      solarStormActive: false,
      missionPlannerOpen: false,
      planetaryEventsEnabled: true,
      selectedPlanetaryEventId: null,
      planetaryEventIntensity: 1.0,
      planetaryEventBurst: null,
      targetId: 'sun',
      cameraMode: 'ORBIT',
      reducedMotion: false,
    });
  });

  it('R1.a: classifies all 44 events deterministically (20 orbital / 24 surface and 6+15+8+7+8 biomes)', () => {
    expect(PLANETARY_EVENTS).toHaveLength(44);

    let orbitalCount = 0;
    let surfaceCount = 0;
    const biomeCounts: Record<EventSurfaceBiome, number> = {
      polar_aurora_sky: 0,
      gas_giant_clouds: 0,
      volcanic_lava: 0,
      cryo_ice_geyser: 0,
      dust_impact_desert: 0,
    };

    for (const ev of PLANETARY_EVENTS) {
      expect(VALID_VIEWS).toContain(ev.recommendedView);
      expect(VALID_BIOMES).toContain(ev.surfaceBiome);
      expect(ev.recommendedView).toBe(expectedRecommendedView(ev));
      expect(ev.surfaceBiome).toBe(expectedSurfaceBiome(ev));

      if (ev.recommendedView === 'orbital') orbitalCount += 1;
      else surfaceCount += 1;
      biomeCounts[ev.surfaceBiome] += 1;
    }

    expect(orbitalCount).toBe(20);
    expect(surfaceCount).toBe(24);
    expect(biomeCounts).toEqual({
      polar_aurora_sky: 6,
      gas_giant_clouds: 15,
      volcanic_lava: 8,
      cryo_ice_geyser: 7,
      dust_impact_desert: 8,
    });

    // Spot-check key showcase anchors
    expect(getPlanetaryEventById('venus_maat_mons_volcano')?.recommendedView).toBe('surface');
    expect(getPlanetaryEventById('venus_maat_mons_volcano')?.surfaceBiome).toBe('volcanic_lava');
    expect(getPlanetaryEventById('jupiter_great_red_spot')?.recommendedView).toBe('orbital');
    expect(getPlanetaryEventById('jupiter_ammonia_superbolts')?.recommendedView).toBe('surface');
    expect(getPlanetaryEventById('enceladus_tiger_stripes')?.surfaceBiome).toBe('cryo_ice_geyser');
    expect(getPlanetaryEventById('mars_jezero_dust_devils')?.recommendedView).toBe('surface');
    expect(getPlanetaryEventById('mars_global_dust_storm')?.recommendedView).toBe('orbital');
    expect(getPlanetaryEventById('earth_polar_aurora')?.recommendedView).toBe('surface');
    expect(getPlanetaryEventById('jupiter_polar_aurora')?.recommendedView).toBe('orbital');
  });

  it('R1.a: provides complete 16-body SurfaceStageConfig with exact parent horizons and required boolean horizonHasRings', () => {
    expect(PLANETARY_EVENT_BODIES).toHaveLength(16);

    const expectedHorizon: Record<string, string | null> = {
      sun: null,
      mercury: null,
      venus: null,
      earth: null,
      mars: null,
      jupiter: null,
      saturn: null,
      uranus: null,
      neptune: null,
      moon: 'earth',
      io: 'jupiter',
      europa: 'jupiter',
      ganymede: 'jupiter',
      titan: 'saturn',
      enceladus: 'saturn',
      triton: 'neptune',
    };

    const ringedBodies = new Set(['saturn', 'enceladus', 'titan']);

    for (const bodyId of PLANETARY_EVENT_BODIES) {
      const cfg = getSurfaceStageConfig(bodyId);
      expect(cfg.bodyId).toBe(bodyId);
      expect(cfg.horizonBodyId).toBe(expectedHorizon[bodyId]);
      expect(typeof cfg.horizonHasRings).toBe('boolean');
      expect(cfg.horizonHasRings).toBe(ringedBodies.has(bodyId));

      for (const [key, val] of Object.entries(cfg)) {
        expect(val, `${bodyId}.${key} must not be undefined`).not.toBeUndefined();
      }
      expect(cfg.horizonScale).toBeGreaterThan(0);
      expect(cfg.starfieldOpacity).toBeGreaterThanOrEqual(0);
      expect(cfg.starfieldOpacity).toBeLessThanOrEqual(1);
    }
  });

  it('R1.a: ModeOrchestrator enterEventSurface -> exitEventSurface syncs store, zoom bounds, fov, and returns to parent body', () => {
    const cam = CameraManager.getInstance();
    const focusSpy = vi.spyOn(cam, 'focusPlanet');
    const fovSpy = vi.spyOn(cam, 'setFov');

    // Seed conflicting exclusive states to verify cleanup
    useAppStore.setState({
      activeSurface: 'mars',
      activeCosmicLab: 'eclipse',
      inExoSystem: true,
      compareMode: true,
      planetaryEventsEnabled: false,
      selectedPlanetaryEventId: null,
    });

    ModeOrchestrator.getInstance().enterEventSurface('venus_maat_mons_volcano');
    const entered = useAppStore.getState();
    expect(entered.activeEventSurfaceId).toBe('venus_maat_mons_volcano');
    expect(entered.selectedPlanetaryEventId).toBe('venus_maat_mons_volcano');
    expect(entered.planetaryEventsEnabled).toBe(true);
    expect(entered.targetId).toBe('venus');
    expect(entered.activeSurface).toBe('none');
    expect(entered.activeCosmicLab).toBe('none');
    expect(entered.inExoSystem).toBe(false);
    expect(entered.compareMode).toBe(false);
    expect(cam.getAdaptiveMinDistance()).toBe(4.0);
    expect(cam.getAdaptiveMaxDistance()).toBe(46.0);
    // F5: initial pose distance must start strictly inside [4.0, 46.0] for both standard and aurora-sky biomes
    const stdDist = cam.camera!.position.distanceTo(cam.target);
    expect(stdDist).toBeGreaterThanOrEqual(4.0);
    expect(stdDist).toBeLessThanOrEqual(46.0);

    ModeOrchestrator.getInstance().enterEventSurface('earth_polar_aurora');
    const auroraDist = cam.camera!.position.distanceTo(cam.target);
    expect(auroraDist).toBeGreaterThanOrEqual(4.0);
    expect(auroraDist).toBeLessThanOrEqual(46.0);

    // Return to Venus event before testing exitEventSurface -> focusPlanet('venus')
    ModeOrchestrator.getInstance().enterEventSurface('venus_maat_mons_volcano');
    focusSpy.mockClear();
    fovSpy.mockClear();

    ModeOrchestrator.getInstance().exitEventSurface();
    const exited = useAppStore.getState();
    expect(exited.activeEventSurfaceId).toBeNull();
    expect(exited.selectedPlanetaryEventId).toBe('venus_maat_mons_volcano');
    expect(fovSpy).toHaveBeenCalledWith(50);
    expect(focusSpy).toHaveBeenCalledWith('venus');

    focusSpy.mockRestore();
    fovSpy.mockRestore();
  });

  it('R1.b (neg): invalid IDs, empty exit, reverse mutual exclusion, unknown stage config, and 0 Vector3 allocs in updateOrbit', () => {
    const cam = CameraManager.getInstance();
    const focusSpy = vi.spyOn(cam, 'focusPlanet');

    // Invalid IDs are safe no-ops
    expect(() => ModeOrchestrator.getInstance().enterEventSurface('invalid_event')).not.toThrow();
    expect(() => ModeOrchestrator.getInstance().enterEventSurface('')).not.toThrow();
    expect(() => cam.setEventSurfaceMode('invalid_event')).not.toThrow();
    expect(useAppStore.getState().activeEventSurfaceId).toBeNull();

    // exitEventSurface when already null is a safe no-op
    expect(() => ModeOrchestrator.getInstance().exitEventSurface()).not.toThrow();
    expect(focusSpy).not.toHaveBeenCalled();

    // Unknown body stage config falls back cleanly with zero undefined fields
    const fallback = getSurfaceStageConfig('blackhole');
    expect(fallback).toBeDefined();
    expect(typeof fallback.horizonHasRings).toBe('boolean');
    for (const val of Object.values(fallback)) {
      expect(val).not.toBeUndefined();
    }

    // Reverse mutual exclusion: exitAllModes, enterCosmicLab, enterSurface, focusConstellation all clear activeEventSurfaceId
    ModeOrchestrator.getInstance().enterEventSurface('io_pele_volcano');
    expect(useAppStore.getState().activeEventSurfaceId).toBe('io_pele_volcano');
    ModeOrchestrator.getInstance().exitAllModes();
    expect(useAppStore.getState().activeEventSurfaceId).toBeNull();

    ModeOrchestrator.getInstance().enterEventSurface('io_pele_volcano');
    ModeOrchestrator.getInstance().enterCosmicLab('eclipse');
    expect(useAppStore.getState().activeEventSurfaceId).toBeNull();

    ModeOrchestrator.getInstance().enterEventSurface('io_pele_volcano');
    ModeOrchestrator.getInstance().enterSurface('mars');
    expect(useAppStore.getState().activeEventSurfaceId).toBeNull();

    ModeOrchestrator.getInstance().enterEventSurface('io_pele_volcano');
    cam.focusConstellation('constellation_orion');
    expect(useAppStore.getState().activeEventSurfaceId).toBeNull();

    // Zero Vector3 allocations in updateOrbit while activeEventSurfaceId !== null
    ModeOrchestrator.getInstance().enterEventSurface('enceladus_tiger_stripes');
    const cloneSpy = vi.spyOn(THREE.Vector3.prototype, 'clone');
    vector3Counter.count = 0;
    for (let i = 0; i < 60; i++) {
      cam.updateOrbit(0.016);
    }
    expect(vector3Counter.count).toBe(0);
    expect(cloneSpy).toHaveBeenCalledTimes(0);

    cloneSpy.mockRestore();
    focusSpy.mockRestore();
  });
});

const SRC_ROOT = path.resolve(__dirname, '..');
const readSrc = (relPath: string): string => fs.readFileSync(path.join(SRC_ROOT, relPath), 'utf8');

const ALL_14_ARCHETYPES: readonly PlanetaryEventArchetype[] = [
  'cyclone_vortex',
  'polar_hexagon',
  'dust_storm',
  'ice_cloud_veil',
  'volcanic_plume',
  'cryo_geyser',
  'lightning_storm',
  'impact_flash',
  'thermal_fissure',
  'polar_aurora',
  'plasma_tail',
  'ring_spokes',
  'diamond_shimmer',
  'solar_flare_loop',
];

describe('SPEC-010 T2 — Shaders, PlanetaryEventSurfaceScene, EventSurfaceHUD & App Wiring', () => {
  beforeEach(() => {
    cleanup();
    const cam = CameraManager.getInstance();
    const mockCam = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 10000);
    mockCam.position.set(0, 40, 120);
    cam.setCamera(mockCam);
    SimulationManager.getInstance().exitScenario();
    useAppStore.setState({
      activeEventSurfaceId: null,
      activeSurface: 'none',
      activeCosmicLab: 'none',
      inExoSystem: false,
      compareMode: false,
      activeTour: false,
      photoMode: false,
      cinemaMode: false,
      solarStormActive: false,
      missionPlannerOpen: false,
      planetaryEventsEnabled: true,
      selectedPlanetaryEventId: null,
      planetaryEventIntensity: 1.0,
      planetaryEventBurst: null,
      targetId: 'venus',
      cameraMode: 'ORBIT',
      reducedMotion: false,
    });
  });

  it('R2.a: 3 GLSL shaders exist and are GLSL ES NaN-safe; scene obeys GPU light/raycast/dispose contracts & maps all 14 archetypes', () => {
    const terrainVert = readSrc('shaders/phenomena/eventSurfaceTerrain.vert.glsl');
    const terrainFrag = readSrc('shaders/phenomena/eventSurfaceTerrain.frag.glsl');
    const skyFrag = readSrc('shaders/phenomena/eventSurfaceSky.frag.glsl');
    const sceneSrc = readSrc('scenes/EventSurface/PlanetaryEventSurfaceScene.tsx');

    // Extract inline GLSL shader template literals from PlanetaryEventSurfaceScene.tsx (F2)
    const inlineShaders = Array.from(sceneSrc.matchAll(/\/\*\s*glsl\s*\*\/\s*`([\s\S]*?)`/g)).map(
      (m, idx) => [`inline-glsl-${idx}`, m[1]] as const
    );
    expect(inlineShaders.length).toBeGreaterThanOrEqual(6);

    for (const [name, glsl] of [
      ['eventSurfaceTerrain.vert.glsl', terrainVert],
      ['eventSurfaceTerrain.frag.glsl', terrainFrag],
      ['eventSurfaceSky.frag.glsl', skyFrag],
      ...inlineShaders,
    ]) {
      expect(glsl.length, `${name} must be non-empty`).toBeGreaterThan(60);
      expect(glsl, `${name} must not call pow with literal 0 or negative base`).not.toMatch(/pow\s*\(\s*-?\d*\.?0+\s*,/);
      expect(glsl, `${name} must not pass max(0.0,...) into pow`).not.toMatch(/pow\s*\(\s*max\s*\(\s*0\.0/);
      expect(glsl, `${name} must not pass unguarded subtraction into pow`).not.toMatch(/pow\s*\(\s*\(?[a-zA-Z0-9_.]+\s*-/);
      expect(glsl, `${name} must not call raw unguarded atan`).not.toMatch(/atan\s*\(\s*0/);
    }
    expect(terrainVert).toContain('uBiome');
    expect(terrainVert).toContain('uTime');
    expect(terrainFrag).toContain('uBiome');
    expect(terrainFrag).toContain('uBurst');
    expect(skyFrag).toContain('uSkyZenith');
    expect(skyFrag).toContain('uSkyHorizon');

    // Scene architectural invariants (F1 timebase, F3 targeted disposal, zero dynamic lights)
    expect(sceneSrc).not.toContain('<pointLight');
    expect(sceneSrc).not.toContain('<spotLight');
    expect(sceneSrc).toContain('NOOP_RAYCAST');
    expect(sceneSrc).toContain('.dispose()');
    expect(sceneSrc).not.toContain('root?.traverse');
    expect(sceneSrc).toContain('auroraCurtain.vert.glsl');
    expect(sceneSrc).toContain('planetaryAurora.frag.glsl');
    expect(sceneSrc).toContain('evaluateEventBurstMultiplier');
    expect(sceneSrc).toContain('performance.now()');
    expect(sceneSrc).toContain('reducedMotion');

    // F1 runtime check: triggerPlanetaryEventBurst monotonic clock matches evaluateEventBurstMultiplier
    useAppStore.getState().triggerPlanetaryEventBurst('venus_maat_mons_volcano');
    const burstNow = typeof performance !== 'undefined' ? performance.now() : Date.now();
    expect(
      evaluateEventBurstMultiplier(
        useAppStore.getState().planetaryEventBurst,
        'venus_maat_mons_volcano',
        burstNow
      )
    ).toBeGreaterThan(1.8);

    // All 14 archetypes mapped cleanly
    for (const arch of ALL_14_ARCHETYPES) {
      const stage = EVENT_SURFACE_ARCHETYPE_STAGE[arch];
      expect(stage, `Missing archetype stage mapping for ${arch}`).toBeDefined();
      expect(stage.layerKind.length).toBeGreaterThan(0);
    }
    expect(Object.keys(EVENT_SURFACE_ARCHETYPE_STAGE)).toHaveLength(14);
  });

  it('R2.a: EventSurfaceHUD renders telemetry, triggers burst + audio, switches same-body events, sets 3 intensity presets, and exits cleanly', () => {
    const audioSpy = vi.spyOn(AudioManager.getInstance(), 'playPlanetaryEventCue').mockImplementation(() => {});
    const exitSpy = vi.spyOn(ModeOrchestrator.getInstance(), 'exitEventSurface');
    const enterSpy = vi.spyOn(ModeOrchestrator.getInstance(), 'enterEventSurface');

    ModeOrchestrator.getInstance().enterEventSurface('venus_maat_mons_volcano');
    enterSpy.mockClear();

    const { getByTestId, rerender } = render(React.createElement(EventSurfaceHUD));

    expect(getByTestId('event-surface-hud')).toBeTruthy();
    expect(getByTestId('event-surface-exit-btn')).toBeTruthy();
    expect(getByTestId('event-surface-burst-btn')).toBeTruthy();
    expect(getByTestId('event-surface-switch-venus_super_vortex')).toBeTruthy();
    expect(getByTestId('event-surface-switch-venus_acid_lightning')).toBeTruthy();
    expect(getByTestId('event-surface-switch-venus_maat_mons_volcano')).toBeTruthy();

    // Burst button triggers store burst + Web Audio cue
    fireEvent.click(getByTestId('event-surface-burst-btn'));
    expect(useAppStore.getState().planetaryEventBurst?.eventId).toBe('venus_maat_mons_volcano');
    expect(audioSpy).toHaveBeenCalledWith('volcanic_plume');

    // Intensity presets update planetaryEventIntensity to 0.6 / 1.0 / 1.6 with aria-pressed
    fireEvent.click(getByTestId('event-surface-intensity-low'));
    expect(useAppStore.getState().planetaryEventIntensity).toBeCloseTo(0.6, 2);
    rerender(React.createElement(EventSurfaceHUD));
    expect(getByTestId('event-surface-intensity-low').getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(getByTestId('event-surface-intensity-extreme'));
    expect(useAppStore.getState().planetaryEventIntensity).toBeCloseTo(1.6, 2);
    rerender(React.createElement(EventSurfaceHUD));
    expect(getByTestId('event-surface-intensity-extreme').getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(getByTestId('event-surface-intensity-normal'));
    expect(useAppStore.getState().planetaryEventIntensity).toBeCloseTo(1.0, 2);
    rerender(React.createElement(EventSurfaceHUD));
    expect(getByTestId('event-surface-intensity-normal').getAttribute('aria-pressed')).toBe('true');

    // Event switcher transitions to another event on the same world
    fireEvent.click(getByTestId('event-surface-switch-venus_acid_lightning'));
    expect(enterSpy).toHaveBeenCalledWith('venus_acid_lightning');
    expect(useAppStore.getState().activeEventSurfaceId).toBe('venus_acid_lightning');

    // Exit button calls ModeOrchestrator.exitEventSurface()
    fireEvent.click(getByTestId('event-surface-exit-btn'));
    expect(exitSpy).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().activeEventSurfaceId).toBeNull();

    audioSpy.mockRestore();
    exitSpy.mockRestore();
    enterSpy.mockRestore();
  });

  it('R2.b (neg): EventSurfaceHUD returns null when inactive, compareMode, or scenario active; App.tsx wires lazy scene, isStandaloneView & ESC exit', () => {
    // Inactive -> null
    const { container, rerender } = render(React.createElement(EventSurfaceHUD));
    expect(container.firstChild).toBeNull();

    // Active, then blocked by compareMode
    useAppStore.setState({ activeEventSurfaceId: 'venus_maat_mons_volcano', compareMode: true });
    rerender(React.createElement(EventSurfaceHUD));
    expect(container.firstChild).toBeNull();

    // Active, then blocked by scenario
    useAppStore.setState({ activeEventSurfaceId: 'venus_maat_mons_volcano', compareMode: false });
    rerender(React.createElement(EventSurfaceHUD, { scenarioActive: true }));
    expect(container.firstChild).toBeNull();

    // App.tsx wiring checks
    const appSrc = readSrc('App.tsx');
    expect(appSrc).toContain('PlanetaryEventSurfaceScene');
    expect(appSrc).toContain('EventSurfaceHUD');
    expect(appSrc).toContain('activeEventSurfaceId');
    expect(appSrc).toContain('exitEventSurface');
  });
});

describe('SPEC-010 T3 — Orbital Visual Punch-Up & Hybrid TargetHUD Routing', () => {
  beforeEach(() => {
    cleanup();
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1440 });
    const cam = CameraManager.getInstance();
    const mockCam = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 10000);
    mockCam.position.set(0, 40, 120);
    cam.setCamera(mockCam);
    SimulationManager.getInstance().exitScenario();
    useAppStore.setState({
      activeEventSurfaceId: null,
      activeSurface: 'none',
      activeCosmicLab: 'none',
      inExoSystem: false,
      compareMode: false,
      targetId: 'venus',
      hoveredId: null,
      planetaryEventsEnabled: true,
      selectedPlanetaryEventId: null,
      planetaryEventIntensity: 1.0,
      planetaryEventBurst: null,
      cameraMode: 'ORBIT',
    });
  });

  it('R3.a: orbital shaders & PlanetaryEventsLayer meet quantitative punch-up targets while preserving SPEC-009 invariants', () => {
    const vortexFrag = readSrc('shaders/phenomena/planetaryVortex.frag.glsl');
    const plumeFrag = readSrc('shaders/phenomena/planetaryPlume.frag.glsl');
    const auroraFrag = readSrc('shaders/phenomena/planetaryAurora.frag.glsl');
    const layerSrc = readSrc('entities/Phenomena/PlanetaryEventsLayer.tsx');

    // Vortex punch-up targets + SPEC-009 invariants
    const swirlMatch = vortexFrag.match(/-\s*uTime\s*\*\s*(\d+\.\d+)/);
    expect(swirlMatch).not.toBeNull();
    expect(Number(swirlMatch![1])).toBeGreaterThanOrEqual(0.8);
    const maxAlphaMatch = vortexFrag.match(/maxStormAlpha\s*=\s*mix\(\s*(\d+\.\d+)\s*,\s*(\d+\.\d+)/);
    expect(maxAlphaMatch).not.toBeNull();
    expect(Number(maxAlphaMatch![1])).toBeGreaterThanOrEqual(0.62);
    expect(vortexFrag).toContain('0.74');
    expect(vortexFrag).toContain('0.76');
    expect(vortexFrag).toContain('0.94');
    expect(vortexFrag).toContain('uTime * 0.34');
    expect(vortexFrag).toContain('solarLit');
    expect(vortexFrag).toContain('uHasEye');

    // Plume punch-up targets
    const plumeCap = plumeFrag.match(/clamp\(\s*alpha\s*,\s*0\.0\s*,\s*(\d+\.\d+)\s*\)/);
    expect(plumeCap).not.toBeNull();
    expect(Number(plumeCap![1])).toBeGreaterThanOrEqual(0.92);
    expect(plumeFrag).toContain('core * 0.76');

    // Aurora punch-up targets + SPEC-009 invariants
    const auroraCap = auroraFrag.match(/clamp\(\s*alpha\s*,\s*0\.0\s*,\s*(\d+\.\d+)\s*\)/);
    expect(auroraCap).not.toBeNull();
    expect(Number(auroraCap![1])).toBeGreaterThanOrEqual(0.64);
    expect(auroraFrag).toContain('uTime * 0.38');
    expect(auroraFrag).toContain('ringCoord');
    expect(auroraFrag).toContain('grazingSoft');

    // PlanetaryEventsLayer punch-up targets + Earth aurora yield invariant
    const boostMatch = layerSrc.match(/selectedBoost\s*=\s*store\.selectedPlanetaryEventId\s*===\s*ev\.id\s*\?\s*(\d+\.\d+)/);
    expect(boostMatch).not.toBeNull();
    expect(Number(boostMatch![1])).toBeGreaterThanOrEqual(1.4);
    const boltsMatch = layerSrc.match(/const\s+bolts\s*=\s*(\d+)/);
    expect(boltsMatch).not.toBeNull();
    expect(Number(boltsMatch![1])).toBeGreaterThanOrEqual(10);
    const floorMatch = layerSrc.match(/const\s+burstFloor\s*=\s*burstMult\s*>\s*1\.05\s*\?\s*\d+\.\d+\s*:\s*(\d+\.\d+)/);
    expect(floorMatch).not.toBeNull();
    expect(Number(floorMatch![1])).toBeGreaterThanOrEqual(0.2);
    expect(layerSrc).toContain('uVisualRadius');
    expect(layerSrc).toContain('yieldEarthAurora');
  });

  it('R3.a: TargetHUD shows Quỹ Đạo / Bề Mặt badges, auto-dives on surface chips, focuses orbit on orbital chips, and dives manually via planetary-event-dive-btn', () => {
    const enterSpy = vi.spyOn(ModeOrchestrator.getInstance(), 'enterEventSurface');
    const hotspotSpy = vi.spyOn(CameraManager.getInstance(), 'focusPlanetHotspot');

    // 1. Venus: clicking surface-classified chip auto-dives immediately
    useAppStore.setState({ targetId: 'venus', hoveredId: null });
    const { getByTestId, rerender } = render(React.createElement(TargetHUD));
    expect(getByTestId('planetary-event-view-badge-venus_maat_mons_volcano').textContent).toMatch(/Bề Mặt|Surface/i);
    expect(getByTestId('planetary-event-view-badge-venus_super_vortex').textContent).toMatch(/Quỹ Đạo|Orbital/i);

    fireEvent.click(getByTestId('planetary-event-chip-venus_maat_mons_volcano'));
    expect(enterSpy).toHaveBeenCalledWith('venus_maat_mons_volcano');
    expect(useAppStore.getState().activeEventSurfaceId).toBe('venus_maat_mons_volcano');

    // 2. Jupiter: clicking orbital chip focuses hotspot WITHOUT entering surface stage until manual dive button clicked
    ModeOrchestrator.getInstance().exitAllModes();
    enterSpy.mockClear();
    hotspotSpy.mockClear();
    useAppStore.setState({ targetId: 'jupiter', hoveredId: null });
    rerender(React.createElement(TargetHUD));

    expect(getByTestId('planetary-event-view-badge-jupiter_great_red_spot').textContent).toMatch(/Quỹ Đạo|Orbital/i);
    expect(getByTestId('planetary-event-view-badge-jupiter_ammonia_superbolts').textContent).toMatch(/Bề Mặt|Surface/i);

    fireEvent.click(getByTestId('planetary-event-chip-jupiter_great_red_spot'));
    expect(hotspotSpy).toHaveBeenCalledWith(
      'jupiter',
      expect.any(Number),
      expect.any(Number),
      expect.objectContaining({ archetype: 'cyclone_vortex' })
    );
    expect(enterSpy).not.toHaveBeenCalled();
    expect(useAppStore.getState().activeEventSurfaceId).toBeNull();

    // Clicking manual Lặn Bề Mặt 3D button opens surface stage for that orbital event too
    fireEvent.click(getByTestId('planetary-event-dive-btn'));
    expect(enterSpy).toHaveBeenCalledWith('jupiter_great_red_spot');
    expect(useAppStore.getState().activeEventSurfaceId).toBe('jupiter_great_red_spot');

    enterSpy.mockRestore();
    hotspotSpy.mockRestore();
  });

  it('R3.b (neg): omits planetary-events-section and planetary-event-dive-btn for non-event bodies', () => {
    for (const id of ['blackhole', 'pulsar', 'iss', 'constellation_orion']) {
      useAppStore.setState({ targetId: id, hoveredId: null });
      const { queryByTestId, unmount } = render(React.createElement(TargetHUD));
      expect(queryByTestId('planetary-events-section')).toBeNull();
      expect(queryByTestId('planetary-event-dive-btn')).toBeNull();
      unmount();
    }
  });
});


