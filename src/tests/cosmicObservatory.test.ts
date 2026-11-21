import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import * as THREE from 'three';
import {
  evaluateSolarStorm,
  evaluateEclipse,
  evaluateBinaryMerger,
  evaluateStellarEvolution,
} from '@/simulation/cosmic/CosmicPhysics';
import { computeHohmannTransfer } from '@/engine/ephemeris/HohmannPhysics';
import {
  computeHorizontalCoords,
  PLANETARIUM_CITIES,
} from '@/engine/ephemeris/PlanetariumPhysics';
import { BRIGHT_NAV_STARS, CONSTELLATION_SPECS } from '@/data/starCatalog';
import { CELESTIAL_BODIES } from '@/data/celestialData';
import { AudioManager } from '@/engine/audio/AudioManager';
import { ModeOrchestrator } from '@/engine/navigation/ModeOrchestrator';
import { SimulationManager } from '@/simulation/core/SimulationManager';
import { useAppStore } from '@/stores/useAppStore';
import { SolarStormAurora } from '@/entities/Phenomena/SolarStormAurora';
import { SolarStormHUD } from '@/ui/SolarStormHUD';
import { HohmannMissionOverlay } from '@/entities/Missions/HohmannMissionOverlay';
import { MissionPlannerHUD } from '@/ui/MissionPlannerHUD';
import { EclipseScene } from '@/scenes/CosmicLabs/EclipseScene';
import { EclipseHUD } from '@/ui/EclipseHUD';
import { BinaryBlackHoleScene } from '@/scenes/CosmicLabs/BinaryBlackHoleScene';
import { BinaryMergerHUD } from '@/ui/BinaryMergerHUD';
import { AssetManager } from '@/engine/assets/AssetManager';
import { SurfaceHUD } from '@/ui/SurfaceHUD';
import { TargetHUD } from '@/ui/TargetHUD';
import { EuropaSurfaceScene } from '@/entities/Surfaces/EuropaSurfaceScene';
import { TitanSurfaceScene } from '@/entities/Surfaces/TitanSurfaceScene';
import { StellarLabScene } from '@/scenes/CosmicLabs/StellarLabScene';
import { StellarLabHUD } from '@/ui/StellarLabHUD';
import { PlanetariumScene } from '@/scenes/CosmicLabs/PlanetariumScene';
import { PlanetariumHUD } from '@/ui/PlanetariumHUD';
import { CameraManager } from '@/engine/camera/CameraManager';

const mockThreeScene = new THREE.Scene();

vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
  useThree: () => ({
    camera: new THREE.PerspectiveCamera(50, 1.77, 0.1, 1000),
    scene: mockThreeScene,
  }),
}));

describe('Cosmic Observatory Expansion — Physics & Core Orchestration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    ModeOrchestrator.getInstance().exitAllModes();
  });

  afterEach(() => {
    ModeOrchestrator.getInstance().cancelPendingTakeoff();
    vi.useRealTimers();
  });

  it('evaluates Solar Storm G1–G5 Kp index, wind speed, and clamps invalid intensity', () => {
    const g1 = evaluateSolarStorm(0.2);
    const g5 = evaluateSolarStorm(1.0);
    expect(g1.stormLevel).toBe('G1');
    expect(g1.kpIndex).toBeGreaterThanOrEqual(5);
    expect(g5.stormLevel).toBe('G5');
    expect(g5.kpIndex).toBe(9);
    expect(g5.solarWindKms).toBeGreaterThan(g1.solarWindKms);

    const nanState = evaluateSolarStorm(Number.NaN);
    expect(Number.isFinite(nanState.kpIndex)).toBe(true);
    expect(Number.isFinite(nanState.solarWindKms)).toBe(true);
    expect(nanState.intensity).toBeGreaterThanOrEqual(0.2);
    expect(nanState.intensity).toBeLessThanOrEqual(1.0);
  });

  it('evaluates Eclipse totality, diamond ring contacts (0.45 / 0.55), blood moon, and clamps NaN/out-of-range phases (R2.a, R2.b)', () => {
    const totality = evaluateEclipse('solar_ground', 0.5);
    expect(totality.isTotality).toBe(true);
    expect(totality.coronaIntensity).toBeGreaterThan(0.8);
    expect(totality.obscurationPct).toBeCloseTo(100, 0);

    const contact2 = evaluateEclipse('solar_ground', 0.45);
    const contact3 = evaluateEclipse('solar_ground', 0.55);
    expect(contact2.diamondRingIntensity).toBeGreaterThan(0.6);
    expect(contact3.diamondRingIntensity).toBeGreaterThan(0.6);

    const orbitMax = evaluateEclipse('solar_orbit', 0.5);
    expect(orbitMax.umbraStrength).toBeGreaterThan(0.8);

    const bloodMax = evaluateEclipse('lunar_blood', 0.5);
    expect(bloodMax.isBloodMoon).toBe(true);
    expect(bloodMax.rayleighRedness).toBeGreaterThan(0.8);

    // R2.b negative boundary clamping
    for (const bad of [Number.NaN, -3.5, 9.2, Number.POSITIVE_INFINITY]) {
      const res = evaluateEclipse('solar_ground', bad);
      expect(res.phase).toBeGreaterThanOrEqual(0);
      expect(res.phase).toBeLessThanOrEqual(1);
      expect(Number.isFinite(res.coronaIntensity)).toBe(true);
      expect(Number.isFinite(res.diamondRingIntensity)).toBe(true);
      expect(Number.isFinite(res.obscurationPct)).toBe(true);
    }
  });

  it('evaluates Binary Black Hole Merger inspiral -> merger -> ringdown and monotonic separation decrease (R3.a)', () => {
    const p0 = evaluateBinaryMerger(0.0);
    const pMid = evaluateBinaryMerger(0.5);
    const pPeak = evaluateBinaryMerger(0.78);
    const pEnd = evaluateBinaryMerger(1.0);

    expect(p0.stage).toBe('inspiral');
    expect(pPeak.stage).toBe('merger');
    expect(pEnd.stage).toBe('ringdown');

    expect(p0.separationUnits).toBeGreaterThan(pMid.separationUnits);
    expect(pMid.separationUnits).toBeGreaterThan(pPeak.separationUnits);
    expect(pEnd.separationUnits).toBe(0);

    expect(pPeak.frequencyHz).toBeGreaterThan(p0.frequencyHz);
    expect(Math.abs(pPeak.strainEnvelope)).toBeGreaterThan(Math.abs(pEnd.strainEnvelope));
  });

  it('handles AudioManager.playLigoChirp and playSolarStormPulse safely when muted or headless (R3.b)', () => {
    useAppStore.setState({ soundEnabled: false });
    const audio = AudioManager.getInstance();
    expect(() => audio.playLigoChirp()).not.toThrow();
    expect(() => audio.playSolarStormPulse()).not.toThrow();

    useAppStore.setState({ soundEnabled: true });
    expect(() => audio.playLigoChirp()).not.toThrow();
    expect(() => audio.playSolarStormPulse()).not.toThrow();
    useAppStore.setState({ soundEnabled: false });
  });

  it('computes two-regime Hohmann transfers (heliocentric Mars/Jupiter/Saturn & geocentric Moon), Gravity Assist, and invalid fallbacks (R5.a, R5.b)', () => {
    const mars = computeHohmannTransfer({ destination: 'mars', gravityAssist: false });
    expect(mars.valid).toBe(true);
    expect(mars.regime).toBe('heliocentric');
    expect(mars.semiMajorAxisAU).toBeCloseTo(1.262, 2);
    expect(mars.transferDays).toBeGreaterThan(259 * 0.95);
    expect(mars.transferDays).toBeLessThan(259 * 1.05);
    expect(mars.gravityAssistSupported).toBe(false);
    expect(mars.totalDeltaVKms).toBeGreaterThan(4.0);

    const moon = computeHohmannTransfer({ destination: 'moon', gravityAssist: false });
    expect(moon.valid).toBe(true);
    expect(moon.regime).toBe('geocentric');
    expect(moon.transferDays).toBeGreaterThanOrEqual(3.5);
    expect(moon.transferDays).toBeLessThanOrEqual(6.5);
    expect(moon.gravityAssistSupported).toBe(false);

    const jupBase = computeHohmannTransfer({ destination: 'jupiter', gravityAssist: false });
    const jupAssist = computeHohmannTransfer({ destination: 'jupiter', gravityAssist: true });
    expect(jupBase.gravityAssistSupported).toBe(true);
    expect(jupAssist.totalDeltaVKms).toBeCloseTo(jupBase.totalDeltaVKms * 0.82, 2);
    expect(jupAssist.transferDays).toBeCloseTo(jupBase.transferDays * 0.88, 0);

    // R5.b negative fallback tests
    const sameOrbit = computeHohmannTransfer({
      originRadiusAU: 1.0,
      targetRadiusAU: 1.0,
      destination: 'mars',
    });
    expect(sameOrbit.valid).toBe(false);
    expect(sameOrbit.totalDeltaVKms).toBe(0);
    expect(sameOrbit.transferDays).toBe(0);

    const badRadius = computeHohmannTransfer({
      originRadiusAU: -1,
      targetRadiusAU: Number.NaN,
      destination: 'mars',
    });
    expect(badRadius.valid).toBe(false);
    expect(Number.isFinite(badRadius.totalDeltaVKms)).toBe(true);
    expect(Number.isFinite(badRadius.transferDays)).toBe(true);
  });

  it('evaluates Stellar Evolution end states (WHITE_DWARF / NEUTRON_STAR / BLACK_HOLE) and clamps invalid mass/progress (R6.a, R6.b)', () => {
    const sunEnd = evaluateStellarEvolution(1.0, 1.0);
    const massiveEnd = evaluateStellarEvolution(12.0, 1.0);
    const hyperEnd = evaluateStellarEvolution(30.0, 1.0);

    expect(sunEnd.remnantType).toBe('WHITE_DWARF');
    expect(massiveEnd.remnantType).toBe('NEUTRON_STAR');
    expect(hyperEnd.remnantType).toBe('BLACK_HOLE');

    for (const state of [sunEnd, massiveEnd, hyperEnd]) {
      expect(state.temperatureK).toBeGreaterThan(0);
      expect(Number.isFinite(state.temperatureK)).toBe(true);
      expect(state.luminositySolar).toBeGreaterThan(0);
      expect(Number.isFinite(state.luminositySolar)).toBe(true);
    }

    const clampedLow = evaluateStellarEvolution(-15, Number.NaN);
    const clampedHigh = evaluateStellarEvolution(500, 4.5);
    expect(clampedLow.massSolar).toBe(0.5);
    expect(clampedLow.progress).toBe(0);
    expect(clampedHigh.massSolar).toBe(40);
    expect(clampedHigh.progress).toBe(1);
    expect(Number.isFinite(clampedLow.temperatureK)).toBe(true);
    expect(Number.isFinite(clampedHigh.temperatureK)).toBe(true);
  });

  it('computes offline Alt/Az coordinates using shared starCatalog (Polaris in Hanoi vs Antarctica) and handles invalid dates/coords (R7.a, R7.b)', () => {
    expect(CONSTELLATION_SPECS.length).toBe(8);
    const polaris = BRIGHT_NAV_STARS.find((s) => s.id === 'polaris');
    expect(polaris).toBeDefined();
    expect(polaris!.raHours).toBeCloseTo(2.53, 2);
    expect(polaris!.decDeg).toBeCloseTo(89.26, 2);

    const hanoi = PLANETARIUM_CITIES.find((c) => c.id === 'hanoi')!;
    const antarctica = PLANETARIUM_CITIES.find((c) => c.id === 'antarctica')!;
    const utcDate = new Date('2026-11-21T14:00:00Z');

    const polarisHanoi = computeHorizontalCoords(
      polaris!.raHours,
      polaris!.decDeg,
      hanoi.latDeg,
      hanoi.lonDeg,
      utcDate
    );
    const polarisAntarctica = computeHorizontalCoords(
      polaris!.raHours,
      polaris!.decDeg,
      antarctica.latDeg,
      antarctica.lonDeg,
      utcDate
    );

    expect(polarisHanoi.altitudeDeg).toBeGreaterThan(18);
    expect(polarisHanoi.altitudeDeg).toBeLessThan(24);
    expect(polarisAntarctica.altitudeDeg).toBeLessThan(-60);

    // R7.b invalid date & out-of-range coordinates fallback
    const bad = computeHorizontalCoords(
      polaris!.raHours,
      polaris!.decDeg,
      140,
      540,
      new Date('invalid-date')
    );
    expect(bad.clampedLatDeg).toBe(90);
    expect(bad.wrappedLonDeg).toBeGreaterThanOrEqual(-180);
    expect(bad.wrappedLonDeg).toBeLessThanOrEqual(180);
    expect(bad.usedJ2000Fallback).toBe(true);
    expect(Number.isFinite(bad.altitudeDeg)).toBe(true);
    expect(Number.isFinite(bad.azimuthDeg)).toBe(true);
  });

  it('aligns Europa surface temperature to -171 C and enforces ModeOrchestrator exclusivity & takeoff timer cancellation (R4.a, R4.b)', () => {
    expect(CELESTIAL_BODIES.europa.meanTemperatureC).toBe(-171);

    const orchestrator = ModeOrchestrator.getInstance();
    orchestrator.enterSurface('europa');
    expect(useAppStore.getState().activeSurface).toBe('europa');
    expect(useAppStore.getState().activeCosmicLab).toBe('none');

    // Start 1800ms takeoff countdown, then jump straight into Eclipse Lab before timer fires
    orchestrator.startSurfaceTakeoff();
    expect(useAppStore.getState().reEntryActive).toBe(true);

    orchestrator.enterCosmicLab('eclipse');
    expect(useAppStore.getState().activeSurface).toBe('none');
    expect(useAppStore.getState().activeCosmicLab).toBe('eclipse');
    expect(useAppStore.getState().reEntryActive).toBe(false);

    // Advance timers beyond 1800ms -> takeoff callback MUST NOT reset activeCosmicLab!
    vi.advanceTimersByTime(2500);
    expect(useAppStore.getState().activeCosmicLab).toBe('eclipse');

    // Solar storm and Mission planner exclusivity in Solar System
    orchestrator.toggleSolarStorm(true);
    expect(useAppStore.getState().activeCosmicLab).toBe('none');
    expect(useAppStore.getState().solarStormActive).toBe(true);
    expect(useAppStore.getState().missionPlannerOpen).toBe(false);

    orchestrator.toggleMissionPlanner(true);
    expect(useAppStore.getState().missionPlannerOpen).toBe(true);
    expect(useAppStore.getState().solarStormActive).toBe(false);
  });
});

describe('Cosmic Observatory Expansion — SolarStorm & Hohmann Overlays (T2)', () => {
  beforeEach(() => {
    ModeOrchestrator.getInstance().exitAllModes();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('SolarStorm disposes all internal BufferGeometry and Material instances on unmount (R1.b)', () => {
    useAppStore.setState({ solarStormActive: true, solarStormIntensity: 0.85 });
    const geoDisposeSpy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const matDisposeSpy = vi.spyOn(THREE.Material.prototype, 'dispose');
    const earthPosRef = { current: new THREE.Vector3(68, 0, 0) };

    const view = render(React.createElement(SolarStormAurora, { earthPosRef }));
    view.unmount();

    expect(geoDisposeSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(matDisposeSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('SolarStorm HUD displays G1–G5 scale, Kp, solar wind speed, and triggers CME bursts (R1.a)', () => {
    useAppStore.setState({ solarStormActive: true, solarStormIntensity: 1.0, solarStormCmeNonce: 0 });
    const view = render(React.createElement(SolarStormHUD));

    expect(view.getByTestId('solar-storm-hud')).toBeTruthy();
    expect(view.getByTestId('solar-storm-level').textContent).toContain('G5');
    expect(view.getByTestId('solar-storm-kp').textContent).toContain('9');
    expect(view.getByTestId('solar-storm-wind').textContent).toContain('km/s');

    fireEvent.click(view.getByTestId('trigger-cme-btn'));
    expect(useAppStore.getState().solarStormCmeNonce).toBe(1);
  });

  it('Hohmann MissionPlannerHUD switches regimes (Moon vs Mars vs Jupiter), toggles Gravity Assist, and disposes 3D overlay GPU resources (R5.a, U2)', () => {
    useAppStore.setState({
      missionPlannerOpen: true,
      missionDestination: 'mars',
      missionGravityAssist: false,
      missionLaunching: false,
    });
    const view = render(React.createElement(MissionPlannerHUD));
    expect(view.getByTestId('mission-planner-hud')).toBeTruthy();
    expect(view.getByTestId('mission-tof').textContent).toMatch(/259|258/);

    // Switch to Jupiter and verify Gravity Assist drops total delta-v
    fireEvent.click(view.getByTestId('mission-dest-jupiter'));
    const baseDvText = view.getByTestId('mission-total-dv').textContent ?? '';
    const baseDv = parseFloat(baseDvText);

    fireEvent.click(view.getByTestId('mission-gravity-assist'));
    const assistDvText = view.getByTestId('mission-total-dv').textContent ?? '';
    const assistDv = parseFloat(assistDvText);
    expect(assistDv).toBeLessThan(baseDv);

    // Switch to Moon (geocentric regime ~4.9 days)
    fireEvent.click(view.getByTestId('mission-dest-moon'));
    expect(view.getByTestId('mission-tof').textContent).toMatch(/4\.9|5\.0/);

    // Launch spacecraft
    fireEvent.click(view.getByTestId('mission-launch-btn'));
    expect(useAppStore.getState().missionLaunching).toBe(true);

    // Verify 3D Hohmann overlay deterministic GPU cleanup
    const geoDisposeSpy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const matDisposeSpy = vi.spyOn(THREE.Material.prototype, 'dispose');
    const earthPosRef = { current: new THREE.Vector3(68, 0, 0) };
    const overlay = render(React.createElement(HohmannMissionOverlay, { earthPosRef }));
    overlay.unmount();
    expect(geoDisposeSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(matDisposeSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Cosmic Observatory Expansion — Eclipse & BinaryMerger Labs (T3)', () => {
  beforeEach(() => {
    ModeOrchestrator.getInstance().exitAllModes();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('Eclipse HUD switches all 3 modes (solar_ground, solar_orbit, lunar_blood) at totality 0.5 and disposes EclipseScene GPU resources (R2.a, U2)', () => {
    useAppStore.setState({ activeCosmicLab: 'eclipse', eclipseMode: 'solar_ground', eclipsePhase: 0.5, eclipsePlaying: false });
    const view = render(React.createElement(EclipseHUD));
    expect(view.getByTestId('eclipse-hud')).toBeTruthy();
    expect(view.getByTestId('eclipse-status').textContent).toMatch(/Toàn Phần|Totality/i);

    fireEvent.click(view.getByTestId('eclipse-mode-solar_orbit'));
    expect(useAppStore.getState().eclipseMode).toBe('solar_orbit');
    expect(view.getByTestId('eclipse-status').textContent).toMatch(/Umbra/i);

    fireEvent.click(view.getByTestId('eclipse-mode-lunar_blood'));
    expect(useAppStore.getState().eclipseMode).toBe('lunar_blood');
    expect(view.getByTestId('eclipse-status').textContent).toMatch(/Trăng Máu|Blood Moon/i);

    const geoDisposeSpy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const matDisposeSpy = vi.spyOn(THREE.Material.prototype, 'dispose');
    const scene = render(React.createElement(EclipseScene));
    scene.unmount();
    expect(geoDisposeSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(matDisposeSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('BinaryMerger HUD displays LIGO strain waveform canvas, replays merger, triggers chirp audio, and disposes GPU resources (R3.a, U2)', () => {
    useAppStore.setState({ activeCosmicLab: 'binary_merger', mergerProgress: 0.78, mergerPlaying: false, mergerNonce: 0 });
    const chirpSpy = vi.spyOn(AudioManager.getInstance(), 'playLigoChirp');
    const view = render(React.createElement(BinaryMergerHUD));

    expect(view.getByTestId('binary-merger-hud')).toBeTruthy();
    expect(view.getByTestId('ligo-waveform-canvas')).toBeTruthy();
    expect(view.getByTestId('merger-stage-badge').textContent).toMatch(/HỢP NHẤT|MERGER/i);

    fireEvent.click(view.getByTestId('play-ligo-chirp-btn'));
    expect(chirpSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(view.getByTestId('replay-merger-btn'));
    expect(useAppStore.getState().mergerNonce).toBe(1);
    expect(useAppStore.getState().mergerProgress).toBe(0);

    const geoDisposeSpy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const matDisposeSpy = vi.spyOn(THREE.Material.prototype, 'dispose');
    const scene = render(React.createElement(BinaryBlackHoleScene));
    scene.unmount();
    expect(geoDisposeSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(matDisposeSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
  });
});

describe('Cosmic Observatory Expansion — Surfaces, StellarLab & Planetarium (T4)', () => {
  beforeEach(() => {
    ModeOrchestrator.getInstance().exitAllModes();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('Surfaces extends SurfaceHUD and AssetManager for Europa & Titan and disposes 3D surface GPU resources (R4.a, U2)', () => {
    const assets = AssetManager.getInstance();
    const europaTex = assets.getRegolithAlbedoMap('europa');
    const titanTex = assets.getRegolithAlbedoMap('titan');
    expect(europaTex).toBeTruthy();
    expect(titanTex).toBeTruthy();
    expect(europaTex).not.toBe(titanTex);

    const onTakeoff = vi.fn();
    const europaView = render(
      React.createElement(SurfaceHUD, { location: 'europa', onTakeoff })
    );
    expect(europaView.container.textContent).toContain('0.134 g');
    expect(europaView.container.textContent).toContain('-171 °C');
    expect(europaView.container.textContent).toContain('10⁻¹² atm');
    europaView.unmount();

    const titanView = render(
      React.createElement(SurfaceHUD, { location: 'titan', onTakeoff })
    );
    expect(titanView.container.textContent).toContain('0.138 g');
    expect(titanView.container.textContent).toContain('-179 °C');
    expect(titanView.container.textContent).toContain('1.45 atm');
    titanView.unmount();

    const geoSpy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const matSpy = vi.spyOn(THREE.Material.prototype, 'dispose');
    const eu = render(React.createElement(EuropaSurfaceScene, { visible: true }));
    eu.unmount();
    const ti = render(React.createElement(TitanSurfaceScene, { visible: true }));
    ti.unmount();
    expect(geoSpy.mock.calls.length).toBeGreaterThanOrEqual(6);
    expect(matSpy.mock.calls.length).toBeGreaterThanOrEqual(6);
  });

  it('StellarLab switches between Nebula (M16/M1) & Lifecycle tabs with live H-R diagram and disposes GPU resources (R6.a, U2)', () => {
    useAppStore.setState({
      activeCosmicLab: 'stellar_lab',
      stellarLabTab: 'nebula',
      stellarNebulaId: 'pillars',
      stellarMassSolar: 30,
      stellarAgeProgress: 1.0,
    });
    const view = render(React.createElement(StellarLabHUD));
    expect(view.getByTestId('stellar-lab-hud')).toBeTruthy();

    fireEvent.click(view.getByTestId('stellar-nebula-crab'));
    expect(useAppStore.getState().stellarNebulaId).toBe('crab');

    fireEvent.click(view.getByTestId('stellar-tab-lifecycle'));
    expect(useAppStore.getState().stellarLabTab).toBe('lifecycle');
    expect(view.getByTestId('hr-diagram-svg')).toBeTruthy();
    expect(view.getByTestId('stellar-remnant-badge').textContent).toMatch(/HỐ ĐEN|BLACK HOLE/i);

    const geoSpy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const matSpy = vi.spyOn(THREE.Material.prototype, 'dispose');
    const scene = render(React.createElement(StellarLabScene));
    scene.unmount();
    expect(geoSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(matSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('Planetarium switches Hanoi -> Antarctica updating Polaris altitude, toggles Meteor Showers & Telescope FOV 14 deg, and disposes GPU resources (R7.a, R7.b, U2)', () => {
    const cam = CameraManager.getInstance();
    const persp = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 1000);
    cam.setCamera(persp);

    useAppStore.setState({
      activeCosmicLab: 'planetarium',
      planetariumCityId: 'hanoi',
      planetariumLatDeg: 21.0285,
      planetariumLonDeg: 105.8542,
      planetariumUtcHours: 14.0,
      planetariumMeteorShower: 'perseids',
      planetariumTelescopeTarget: 'none',
    });

    const view = render(React.createElement(PlanetariumHUD));
    expect(view.getByTestId('planetarium-hud')).toBeTruthy();
    const hanoiAlt = parseFloat(view.getByTestId('planetarium-polaris-alt').textContent ?? '0');
    expect(hanoiAlt).toBeGreaterThan(18);

    fireEvent.click(view.getByTestId('planetarium-city-antarctica'));
    const antAlt = parseFloat(view.getByTestId('planetarium-polaris-alt').textContent ?? '0');
    expect(antAlt).toBeLessThan(-60);

    fireEvent.click(view.getByTestId('planetarium-telescope-saturn'));
    expect(useAppStore.getState().planetariumTelescopeTarget).toBe('saturn');
    expect(view.getByTestId('telescope-reticle')).toBeTruthy();
    expect(persp.fov).toBeCloseTo(14, 1);

    const geoSpy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const matSpy = vi.spyOn(THREE.Material.prototype, 'dispose');
    const scene = render(React.createElement(PlanetariumScene));
    scene.unmount();
    expect(geoSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(matSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
  });
});

describe('Cosmic Observatory Expansion — Round 2 Hardening Regressions (F1–F6 & U11)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    ModeOrchestrator.getInstance().exitAllModes();
  });

  afterEach(() => {
    cleanup();
    ModeOrchestrator.getInstance().cancelPendingTakeoff();
    SimulationManager.getInstance().exitScenario();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('F1/F4: cosmic GLSL and inline shaders avoid negative-base pow(), unguarded atan(), and view/world space mismatches', () => {
    const shaderFiles = [
      'src/shaders/cosmic/auroraCurtain.frag.glsl',
      'src/shaders/cosmic/eclipseCorona.frag.glsl',
      'src/shaders/cosmic/spacetimeWave.vert.glsl',
      'src/shaders/cosmic/spacetimeWave.frag.glsl',
      'src/shaders/cosmic/nebulaPillar.frag.glsl',
      'src/scenes/CosmicLabs/BinaryBlackHoleScene.tsx',
      'src/scenes/CosmicLabs/EclipseScene.tsx',
      'src/scenes/CosmicLabs/StellarLabScene.tsx',
      'src/scenes/CosmicLabs/PlanetariumScene.tsx',
      'src/entities/Surfaces/EuropaSurfaceScene.tsx',
      'src/entities/Surfaces/TitanSurfaceScene.tsx',
    ];

    for (const rel of shaderFiles) {
      const fullPath = path.resolve(process.cwd(), rel);
      const src = fs.readFileSync(fullPath, 'utf8');
      // Guard against Metal/ANGLE pow(negative, 2.0) NaN poison
      expect(src, `${rel} contains negative-prone pow(a - b, ...)`).not.toMatch(
        /pow\(\s*[a-zA-Z0-9_.]+\s*-\s*[a-zA-Z0-9_.]+/
      );
      // Guard against view-space vector paired with world-space normal
      expect(src, `${rel} mixes -mvPos.xyz into vViewDir`).not.toMatch(/vViewDir\s*=\s*normalize\(\s*-mvPos\.xyz/);
    }
  });

  it('F2: starting a SimulationManager scenario mid-takeoff cancels pending takeoff timer cleanly', () => {
    const orchestrator = ModeOrchestrator.getInstance();
    const sim = SimulationManager.getInstance();

    orchestrator.enterSurface('titan');
    orchestrator.startSurfaceTakeoff();
    expect(useAppStore.getState().reEntryActive).toBe(true);

    sim.startScenario('earth_launch');
    expect(sim.getActiveScenario()).toBe('earth_launch');
    expect(useAppStore.getState().activeSurface).toBe('none');
    expect(useAppStore.getState().reEntryActive).toBe(false);

    vi.advanceTimersByTime(2500);
    expect(sim.getActiveScenario()).toBe('earth_launch');
  });

  it('F3/F6: HohmannMissionOverlay uses world-space tangent lookAt and TitanSurfaceScene binds & restores scene.fog', () => {
    const hohmannSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/entities/Missions/HohmannMissionOverlay.tsx'),
      'utf8'
    );
    expect(hohmannSrc).toContain('localToWorld');
    expect(hohmannSrc).toContain('updateMatrixWorld');

    mockThreeScene.fog = null;
    const titan = render(React.createElement(TitanSurfaceScene, { visible: true }));
    expect(mockThreeScene.fog).toBeInstanceOf(THREE.FogExp2);
    titan.unmount();
    expect(mockThreeScene.fog).toBeNull();
  });

  it('U11: TargetHUD offers direct surface landing for Europa & Titan and Solar Storm quick-action for Earth', () => {
    useAppStore.setState({ targetId: 'europa', hoveredId: null });
    const euView = render(React.createElement(TargetHUD));
    const euLandBtn = euView.getByTestId('quick-action-land');
    expect(euLandBtn).toBeTruthy();
    fireEvent.click(euLandBtn);
    expect(useAppStore.getState().activeSurface).toBe('europa');
    euView.unmount();

    ModeOrchestrator.getInstance().exitAllModes();
    useAppStore.setState({ targetId: 'titan', hoveredId: null });
    const tiView = render(React.createElement(TargetHUD));
    fireEvent.click(tiView.getByTestId('quick-action-land'));
    expect(useAppStore.getState().activeSurface).toBe('titan');
    tiView.unmount();

    ModeOrchestrator.getInstance().exitAllModes();
    useAppStore.setState({ targetId: 'earth', hoveredId: null });
    const eaView = render(React.createElement(TargetHUD));
    fireEvent.click(eaView.getByTestId('quick-action-solar-storm'));
    expect(useAppStore.getState().solarStormActive).toBe(true);
    eaView.unmount();
  });
});
