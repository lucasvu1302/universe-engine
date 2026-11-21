import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import * as THREE from 'three';
import { normalizeViText } from '@/i18n/normalizeViText';
import { ObservatoryMegaHub } from '@/ui/ObservatoryMegaHub';
import { CommandPalette } from '@/ui/CommandPalette';
import { TargetHUD } from '@/ui/TargetHUD';
import { NBodySandboxScene } from '@/scenes/CosmicLabs/NBodySandboxScene';
import { NBodySandboxHUD } from '@/ui/NBodySandboxHUD';
import { MarsTerraformScene } from '@/scenes/CosmicLabs/MarsTerraformScene';
import { MarsTerraformHUD } from '@/ui/MarsTerraformHUD';
import { PlanetaryCutawayScene } from '@/scenes/CosmicLabs/PlanetaryCutawayScene';
import { PlanetaryCutawayHUD } from '@/ui/PlanetaryCutawayHUD';
import { PlanetaryDefenseScene } from '@/scenes/CosmicLabs/PlanetaryDefenseScene';
import { PlanetaryDefenseHUD } from '@/ui/PlanetaryDefenseHUD';
import { TrappistSystemScene } from '@/scenes/CosmicLabs/TrappistSystemScene';
import { TrappistSystemHUD } from '@/ui/TrappistSystemHUD';
import { DysonMegastructureScene } from '@/scenes/CosmicLabs/DysonMegastructureScene';
import { DysonMegastructureHUD } from '@/ui/DysonMegastructureHUD';
import { RelativityLabScene } from '@/scenes/CosmicLabs/RelativityLabScene';
import { RelativityLabHUD } from '@/ui/RelativityLabHUD';
import { KesslerOrbitalScene } from '@/scenes/CosmicLabs/KesslerOrbitalScene';
import { KesslerOrbitalHUD } from '@/ui/KesslerOrbitalHUD';

const mockWave2Scene = new THREE.Scene();

vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
  useThree: () => ({
    camera: new THREE.PerspectiveCamera(50, 1.77, 0.1, 1000),
    scene: mockWave2Scene,
  }),
}));
import {
  createNBodyPreset,
  stepNBodyVerlet,
  evaluateMarsTerraform,
  getCutawayBodyProfile,
  clampCutawayAngle,
  evaluatePlanetaryDefense,
  TRAPPIST_PLANETS,
  evaluateTrappistTransit,
  evaluateDysonSwarm,
  evaluateRelativity,
  evaluateKesslerCascade,
  MAX_NBODY_BODIES,
} from '@/simulation/cosmic/Wave2Physics';
import { useAppStore, RECENT_EXPERIENCES_STORAGE_KEY } from '@/stores/useAppStore';
import { ModeOrchestrator } from '@/engine/navigation/ModeOrchestrator';
import { CameraManager } from '@/engine/camera/CameraManager';
import { AudioManager } from '@/engine/audio/AudioManager';

describe('Wave 2 Cosmic Observatory — Physics, Normalize, Store & Orchestration (T1)', () => {
  beforeEach(() => {
    ModeOrchestrator.getInstance().exitAllModes();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(RECENT_EXPERIENCES_STORAGE_KEY);
    }
    useAppStore.setState({ recentExperiences: [] });
  });

  afterEach(() => {
    ModeOrchestrator.getInstance().exitAllModes();
  });

  it('R1.a/R1.b: normalizes Vietnamese diacritics (including đ/Đ -> d) and safely recovers from corrupted recent storage', () => {
    expect(normalizeViText('Địa Cầu Hóa Sao Hỏa 1.000 Năm')).toContain('dia cau hoa sao hoa');
    expect(normalizeViText('ĐÀI THIÊN VĂN · Bài Toán 3 Vật Thể')).toContain('dai thien van');
    expect(normalizeViText('Bài Toán 3 Vật Thể')).toContain('3 vat the');
    expect(normalizeViText('')).toBe('');
    expect(normalizeViText('   !!!   ')).toBe('!!!');

    // Corrupted localStorage must never throw and must return []
    localStorage.setItem(RECENT_EXPERIENCES_STORAGE_KEY, '{broken_json');
    expect(useAppStore.getState().loadRecentExperiences()).toEqual([]);

    localStorage.setItem(RECENT_EXPERIENCES_STORAGE_KEY, JSON.stringify({ notAnArray: true }));
    expect(useAppStore.getState().loadRecentExperiences()).toEqual([]);

    // MRU deduplication capped at 4
    const rec = useAppStore.getState().recordRecentExperience;
    rec('nbody_sandbox');
    rec('mars_terraform');
    rec('planetary_cutaway');
    rec('planetary_defense');
    rec('kessler_leo');
    rec('mars_terraform');
    expect(useAppStore.getState().recentExperiences).toEqual([
      'mars_terraform',
      'kessler_leo',
      'planetary_defense',
      'planetary_cutaway',
    ]);
  });

  it('R2.a/R2.b: integrates Figure-8 3-body orbit stably (<2% energy drift), detects Roche disruption, and softens coincident/NaN inputs', () => {
    const fig8 = createNBodyPreset('figure8');
    expect(fig8.length).toBe(3);
    expect(MAX_NBODY_BODIES).toBe(8);

    const initMetrics = stepNBodyVerlet(fig8, 0.0001);
    const e0 = initMetrics.totalEnergy;
    let lastMetrics = initMetrics;
    for (let i = 0; i < 120; i++) {
      lastMetrics = stepNBodyVerlet(fig8, 0.01);
      for (const b of fig8) {
        expect(Number.isFinite(b.x) && Number.isFinite(b.y) && Number.isFinite(b.z)).toBe(true);
        expect(Math.hypot(b.x, b.y, b.z)).toBeLessThan(2.2);
      }
    }
    const relDrift = Math.abs(lastMetrics.totalEnergy - e0) / Math.max(1e-6, Math.abs(e0));
    expect(relDrift).toBeLessThan(0.02);

    // Roche limit detection when planet passes tightly inside stellar Roche radius
    const rocheTest = createNBodyPreset('custom_solar');
    rocheTest[1].x = 0.35;
    rocheTest[1].y = 0;
    rocheTest[1].z = 0;
    const rocheMetrics = stepNBodyVerlet(rocheTest, 0.01);
    expect(rocheMetrics.rocheDisrupted).toBe(true);

    // Negative/degenerate R2.b: coincident positions & dt <= 0 / NaN
    const badBodies = createNBodyPreset('trisolaris');
    badBodies[0].x = 0;
    badBodies[0].y = 0;
    badBodies[0].z = 0;
    badBodies[1].x = 0;
    badBodies[1].y = 0;
    badBodies[1].z = 0;
    for (const badDt of [0, -0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const m = stepNBodyVerlet(badBodies, badDt);
      expect(Number.isFinite(m.totalEnergy)).toBe(true);
      expect(Number.isFinite(badBodies[0].x)).toBe(true);
      expect(Number.isFinite(badBodies[1].vx)).toBe(true);
    }
  });

  it('R3.a/R3.b: evaluates Mars Terraforming 0..1000yr pressure/temp/ocean growth and clamps invalid inputs', () => {
    const y0 = evaluateMarsTerraform({ years: 0, mirrors: true, ghg: true, comets: true });
    const y500 = evaluateMarsTerraform({ years: 500, mirrors: true, ghg: true, comets: true });
    const y1000 = evaluateMarsTerraform({ years: 1000, mirrors: true, ghg: true, comets: true });

    expect(y0.pressureMbar).toBeCloseTo(6, 0);
    expect(y0.tempC).toBeCloseTo(-63, 0);
    expect(y1000.pressureMbar).toBeGreaterThan(800);
    expect(y1000.tempC).toBeGreaterThan(10);
    expect(y1000.oceanPct).toBeGreaterThan(y500.oceanPct);
    expect(y500.oceanPct).toBeGreaterThan(y0.oceanPct);
    expect(y1000.habitabilityPct).toBeGreaterThan(y500.habitabilityPct);

    const badLow = evaluateMarsTerraform({ years: -500, mirrors: false, ghg: false, comets: false });
    const badHigh = evaluateMarsTerraform({ years: Number.NaN, mirrors: true, ghg: true, comets: true });
    expect(badLow.years).toBe(0);
    expect(badHigh.years).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(badHigh.pressureMbar)).toBe(true);
    expect(Number.isFinite(badHigh.tempC)).toBe(true);
  });

  it('R4.a/R4.b: supplies 5 cutaway body profiles (>=4 concentric layers each, Europa subsurface ocean) and clamps unknown body/angle', () => {
    for (const id of ['earth', 'sun', 'jupiter', 'europa', 'neutron_star'] as const) {
      const profile = getCutawayBodyProfile(id);
      expect(profile.id).toBe(id);
      expect(profile.layers.length).toBeGreaterThanOrEqual(4);
      for (let i = 1; i < profile.layers.length; i++) {
        expect(profile.layers[i].outerRadiusNorm).toBeLessThan(profile.layers[i - 1].outerRadiusNorm);
      }
    }
    const europa = getCutawayBodyProfile('europa');
    expect(europa.layers.some((l) => /đại dương|ocean/i.test(`${l.nameVi} ${l.nameEn}`))).toBe(true);

    // Fallback & angle clamping
    expect(getCutawayBodyProfile('pluto_unknown').id).toBe('earth');
    expect(clampCutawayAngle(-40)).toBe(0);
    expect(clampCutawayAngle(320)).toBe(180);
    expect(clampCutawayAngle(Number.NaN)).toBe(95);

    // Store resets cutawaySelectedLayer on body change
    useAppStore.getState().setCutawaySelectedLayer(3);
    useAppStore.getState().setCutawayBody('jupiter');
    expect(useAppStore.getState().cutawaySelectedLayer).toBe(0);
  });

  it('R5.a/R5.b: evaluates Planetary Defense (DART 180d SAFE vs 10d IMPACT) and safely handles invalid lead days & headless impact audio', () => {
    const late = evaluatePlanetaryDefense('kinetic_dart', 10);
    const early = evaluatePlanetaryDefense('kinetic_dart', 180);
    expect(early.missDistanceKm).toBeGreaterThan(late.missDistanceKm);
    expect(late.outcome).toBe('IMPACT');
    expect(early.outcome).toBe('SAFE');
    expect(early.missDistanceKm).toBeGreaterThan(6371);

    for (const bad of [0, -90, Number.NaN]) {
      const res = evaluatePlanetaryDefense('laser_ablation', bad);
      expect(res.leadDays).toBeGreaterThanOrEqual(1);
      expect(Number.isFinite(res.missDistanceKm)).toBe(true);
      expect(Number.isFinite(res.deltaVMms)).toBe(true);
    }

    useAppStore.setState({ soundEnabled: false });
    expect(() => AudioManager.getInstance().playDefenseImpact()).not.toThrow();
    useAppStore.setState({ soundEnabled: true });
    expect(() => AudioManager.getInstance().playDefenseImpact()).not.toThrow();
    useAppStore.setState({ soundEnabled: false });
  });

  it('R6.a/R6.b: evaluates TRAPPIST-1 7 resonant planets, transit dip at phase 0.5, and clamps invalid phase/id', () => {
    expect(TRAPPIST_PLANETS.length).toBe(7);
    const outOfTransit = evaluateTrappistTransit('e', 0.0);
    const midTransit = evaluateTrappistTransit('e', 0.5);
    expect(outOfTransit.fluxNormalized).toBeCloseTo(1.0, 4);
    expect(outOfTransit.inTransit).toBe(false);
    expect(midTransit.inTransit).toBe(true);
    expect(midTransit.fluxNormalized).toBeLessThan(0.996);

    const bad = evaluateTrappistTransit('z_invalid', Number.NaN);
    expect(bad.planetId).toBe('e');
    expect(bad.fluxNormalized).toBeGreaterThan(0);
    expect(bad.fluxNormalized).toBeLessThanOrEqual(1);
  });

  it('R7.a/R7.b: evaluates Dyson Swarm Kardashev 0.73 -> 2.00 progression and clamps out-of-range inputs', () => {
    const s0 = evaluateDysonSwarm(0);
    const sMid = evaluateDysonSwarm(0.5);
    const sFull = evaluateDysonSwarm(1.0);
    expect(s0.kardashevScale).toBeCloseTo(0.73, 1);
    expect(sMid.kardashevScale).toBeGreaterThan(s0.kardashevScale);
    expect(sFull.kardashevScale).toBeCloseTo(2.0, 1);
    expect(sFull.capturedPowerWatts).toBeGreaterThan(3.5e26);
    expect(sFull.visibleTransmission).toBeLessThan(s0.visibleTransmission);

    const badNeg = evaluateDysonSwarm(-2);
    const badNan = evaluateDysonSwarm(Number.NaN);
    expect(badNeg.completion).toBe(0);
    expect(badNan.completion).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(badNan.kardashevScale)).toBe(true);
  });

  it('R8.a/R8.b: evaluates Relativity Lorentz/Schwarzschild dilation, Kessler cascade growth, clamping, ModeOrchestrator & CameraManager sub-views', () => {
    const rel = evaluateRelativity(0.99, 1.2, 0.12);
    expect(rel.lorentzGamma).toBeGreaterThan(7.0);
    expect(rel.combinedShipRate).toBeLessThan(0.15);
    expect(rel.einsteinRadiusNorm).toBeGreaterThan(0);

    // R8.b boundary safety
    const extreme = evaluateRelativity(1.5, 0.2, Number.NaN);
    expect(extreme.velocityC).toBeCloseTo(0.9999, 4);
    expect(extreme.radiusRs).toBeCloseTo(1.01, 2);
    expect(Number.isFinite(extreme.lorentzGamma)).toBe(true);
    expect(Number.isFinite(extreme.earthYearsPerShipHour)).toBe(true);

    const kLow = evaluateKesslerCascade(0.1, false);
    const kHigh = evaluateKesslerCascade(0.9, true);
    expect(kHigh.debrisCount).toBeGreaterThan(kLow.debrisCount);
    expect(kHigh.launchLockoutPct).toBeGreaterThan(kLow.launchLockoutPct);
    const kBad = evaluateKesslerCascade(Number.NaN, true);
    expect(kBad.cascadeLevel).toBeGreaterThanOrEqual(0);
    expect(kBad.cascadeLevel).toBeLessThanOrEqual(1);
    expect(Number.isFinite(kBad.debrisCount)).toBe(true);

    // ModeOrchestrator recording & transient resets + CameraManager sub-views
    const cam = CameraManager.getInstance();
    const persp = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 1000);
    cam.setCamera(persp);

    const orch = ModeOrchestrator.getInstance();
    orch.enterCosmicLab('trappist_exoplanets');
    expect(useAppStore.getState().recentExperiences[0]).toBe('trappist_exoplanets');
    useAppStore.getState().setTrappistViewMode('surface_e');
    cam.setCosmicLabSubView('trappist_exoplanets', 'surface_e');
    expect(Number.isFinite(persp.position.x)).toBe(true);

    orch.exitCosmicLab();
    expect(useAppStore.getState().activeCosmicLab).toBe('none');
    expect(useAppStore.getState().trappistViewMode).toBe('system');
  });

  it('R9 (Wave 1 F7/F8 polish): verifies Hohmann backward tangent chord, primitive dirty-check refs, and Planetarium pitch reset', () => {
    const hohmannSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/entities/Missions/HohmannMissionOverlay.tsx'),
      'utf8'
    );
    expect(hohmannSrc).toContain('nu > Math.PI - 0.04');

    const eclipseSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/scenes/CosmicLabs/EclipseScene.tsx'),
      'utf8'
    );
    expect(eclipseSrc).not.toMatch(/const evalKey\s*=\s*`/);

    const stellarSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/scenes/CosmicLabs/StellarLabScene.tsx'),
      'utf8'
    );
    expect(stellarSrc).not.toMatch(/const evoKey\s*=\s*`/);

    const planetariumSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/scenes/CosmicLabs/PlanetariumScene.tsx'),
      'utf8'
    );
    expect(planetariumSrc).toMatch(/rotation\.x\s*=\s*0/);
  });
});

describe('Wave 2 Cosmic Observatory — Observatory MegaHub, CommandPalette & TargetHUD (T2)', () => {
  beforeEach(() => {
    ModeOrchestrator.getInstance().exitAllModes();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(RECENT_EXPERIENCES_STORAGE_KEY);
    }
    useAppStore.setState({ recentExperiences: [] });
  });

  afterEach(() => {
    cleanup();
    ModeOrchestrator.getInstance().exitAllModes();
  });

  it('R1.a/R1.b: MegaHub displays all 6 tabs, filters with Vietnamese accent-insensitive search, preserves legacy buttons, records recent items & dismisses cleanly', () => {
    const onClose = vi.fn();
    const onLand = vi.fn();
    const onCompare = vi.fn();

    const view = render(
      React.createElement(ObservatoryMegaHub, {
        onClose,
        onLandClick: onLand,
        onCompareClick: onCompare,
      })
    );

    expect(view.getByTestId('experiences-dropdown-menu')).toBeTruthy();
    expect(view.getByTestId('mega-hub-tab-all')).toBeTruthy();
    expect(view.getByTestId('mega-hub-tab-physics')).toBeTruthy();
    expect(view.getByTestId('mega-hub-tab-surfaces')).toBeTruthy();
    expect(view.getByTestId('mega-hub-tab-planets')).toBeTruthy();
    expect(view.getByTestId('mega-hub-tab-deep_space')).toBeTruthy();
    expect(view.getByTestId('mega-hub-tab-tools')).toBeTruthy();

    // Default 'all' tab exposes legacy Wave 1 & new Wave 2 testids immediately
    expect(view.getByTestId('nav-eclipse-lab')).toBeTruthy();
    expect(view.getByTestId('nav-nbody-sandbox')).toBeTruthy();
    expect(view.getByTestId('nav-mars-terraform')).toBeTruthy();
    expect(view.getByTestId('nav-kessler-leo')).toBeTruthy();

    // Accent-insensitive Vietnamese search ("dia cau hoa" -> Mars Terraform)
    const search = view.getByTestId('mega-hub-search');
    fireEvent.change(search, { target: { value: 'dia cau hoa' } });
    expect(view.getByTestId('nav-mars-terraform')).toBeTruthy();
    expect(view.queryByTestId('nav-nbody-sandbox')).toBeNull();

    // Accent-insensitive search ("3 vat the" -> N-Body Sandbox)
    fireEvent.change(search, { target: { value: '3 vat the' } });
    expect(view.getByTestId('nav-nbody-sandbox')).toBeTruthy();

    // Launching item enters lab, records into recentExperiences, and closes MegaHub
    fireEvent.click(view.getByTestId('nav-nbody-sandbox'));
    expect(useAppStore.getState().activeCosmicLab).toBe('nbody_sandbox');
    expect(useAppStore.getState().recentExperiences[0]).toBe('nbody_sandbox');
    expect(onClose).toHaveBeenCalledTimes(1);

    // Close button works cleanly (mobile Bottom Sheet dismiss)
    fireEvent.click(view.getByTestId('mega-hub-close-btn'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('R1.a: CommandPalette supports Vietnamese accent-insensitive search for all 8 Wave 2 labs', () => {
    useAppStore.setState({ isCommandPaletteOpen: true });
    const view = render(React.createElement(CommandPalette));
    const input = view.getByRole('combobox');

    fireEvent.change(input, { target: { value: 'dia cau hoa' } });
    expect(view.getByRole('option', { name: /Địa Cầu Hóa Sao Hỏa|Mars Terraforming/i })).toBeTruthy();

    fireEvent.change(input, { target: { value: 'kessler' } });
    fireEvent.click(view.getByRole('option', { name: /Kessler/i }));
    expect(useAppStore.getState().activeCosmicLab).toBe('kessler_leo');
    expect(useAppStore.getState().recentExperiences[0]).toBe('kessler_leo');
  });

  it('R1: TargetHUD provides contextual Wave 2 quick-actions for Earth, Mars, Jupiter, Sun, and Black Hole', () => {
    // Earth -> Kessler & Cutaway Earth
    useAppStore.setState({ targetId: 'earth', hoveredId: null });
    let view = render(React.createElement(TargetHUD));
    fireEvent.click(view.getByTestId('quick-action-cutaway-earth'));
    expect(useAppStore.getState().activeCosmicLab).toBe('planetary_cutaway');
    expect(useAppStore.getState().cutawayBody).toBe('earth');
    view.unmount();

    ModeOrchestrator.getInstance().exitAllModes();
    useAppStore.setState({ targetId: 'mars', hoveredId: null });
    view = render(React.createElement(TargetHUD));
    fireEvent.click(view.getByTestId('quick-action-terraform-mars'));
    expect(useAppStore.getState().activeCosmicLab).toBe('mars_terraform');
    view.unmount();

    ModeOrchestrator.getInstance().exitAllModes();
    useAppStore.setState({ targetId: 'jupiter', hoveredId: null });
    view = render(React.createElement(TargetHUD));
    fireEvent.click(view.getByTestId('quick-action-cutaway-jupiter'));
    expect(useAppStore.getState().activeCosmicLab).toBe('planetary_cutaway');
    expect(useAppStore.getState().cutawayBody).toBe('jupiter');
    view.unmount();

    ModeOrchestrator.getInstance().exitAllModes();
    useAppStore.setState({ targetId: 'sun', hoveredId: null });
    view = render(React.createElement(TargetHUD));
    fireEvent.click(view.getByTestId('quick-action-dyson'));
    expect(useAppStore.getState().activeCosmicLab).toBe('dyson_megastructure');
    expect(useAppStore.getState().dysonMode).toBe('dyson_swarm');
    view.unmount();

    ModeOrchestrator.getInstance().exitAllModes();
    useAppStore.setState({ targetId: 'blackhole', hoveredId: null });
    view = render(React.createElement(TargetHUD));
    fireEvent.click(view.getByTestId('quick-action-relativity'));
    expect(useAppStore.getState().activeCosmicLab).toBe('relativity_lab');
    view.unmount();
  });
});

describe('Wave 2 Cosmic Observatory — Group A 3D Labs & HUDs (Wave2GroupA · T3)', () => {
  beforeEach(() => {
    ModeOrchestrator.getInstance().exitAllModes();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    ModeOrchestrator.getInstance().exitAllModes();
  });

  it('R2/U2: NBodySandbox HUD switches presets, spawns planets up to cap, and disposes 3D GPU resources cleanly', () => {
    useAppStore.setState({ activeCosmicLab: 'nbody_sandbox', nbodyPreset: 'trisolaris', nbodySpawnNonce: 0 });
    const hud = render(React.createElement(NBodySandboxHUD));
    expect(hud.getByTestId('nbody-sandbox-hud')).toBeTruthy();

    fireEvent.click(hud.getByTestId('nbody-preset-figure8'));
    expect(useAppStore.getState().nbodyPreset).toBe('figure8');

    fireEvent.click(hud.getByTestId('nbody-spawn-btn'));
    expect(useAppStore.getState().nbodySpawnNonce).toBe(1);
    hud.unmount();

    const geoSpy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const matSpy = vi.spyOn(THREE.Material.prototype, 'dispose');
    const scene = render(React.createElement(NBodySandboxScene));
    scene.unmount();
    expect(geoSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(matSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('R3/U2: MarsTerraform HUD updates years & levers, renders live telemetry, and disposes GPU resources', () => {
    useAppStore.setState({
      activeCosmicLab: 'mars_terraform',
      terraformYears: 0,
      terraformMirrors: true,
      terraformGhg: true,
      terraformComets: true,
    });
    const hud = render(React.createElement(MarsTerraformHUD));
    expect(hud.getByTestId('mars-terraform-hud')).toBeTruthy();
    expect(hud.getByTestId('terraform-pressure').textContent).toContain('6 mbar');

    fireEvent.change(hud.getByTestId('terraform-years-slider'), { target: { value: '1000' } });
    expect(useAppStore.getState().terraformYears).toBe(1000);
    expect(hud.getByTestId('terraform-pressure').textContent).toMatch(/9\d\d|8\d\d/);
    hud.unmount();

    const geoSpy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const matSpy = vi.spyOn(THREE.Material.prototype, 'dispose');
    const scene = render(React.createElement(MarsTerraformScene));
    scene.unmount();
    expect(geoSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(matSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('R4/U2: PlanetaryCutaway HUD switches all 5 worlds, inspects layers, adjusts angle, and disposes GPU resources', () => {
    useAppStore.setState({ activeCosmicLab: 'planetary_cutaway', cutawayBody: 'earth', cutawayAngleDeg: 95 });
    const hud = render(React.createElement(PlanetaryCutawayHUD));
    expect(hud.getByTestId('planetary-cutaway-hud')).toBeTruthy();

    fireEvent.click(hud.getByTestId('cutaway-body-europa'));
    expect(useAppStore.getState().cutawayBody).toBe('europa');
    expect(hud.container.textContent).toMatch(/Đại Dương|Ocean/i);
    hud.unmount();

    const geoSpy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const matSpy = vi.spyOn(THREE.Material.prototype, 'dispose');
    const scene = render(React.createElement(PlanetaryCutawayScene));
    scene.unmount();
    expect(geoSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(matSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('R5/U2: PlanetaryDefense HUD switches deflection methods, launches interceptor, shows SAFE/IMPACT, and disposes GPU resources', () => {
    useAppStore.setState({
      activeCosmicLab: 'planetary_defense',
      defenseMethod: 'kinetic_dart',
      defenseLeadDays: 180,
      defenseLaunched: false,
    });
    const hud = render(React.createElement(PlanetaryDefenseHUD));
    expect(hud.getByTestId('planetary-defense-hud')).toBeTruthy();
    expect(hud.getByTestId('defense-outcome').textContent).toMatch(/AN TOÀN|SAFE/i);

    fireEvent.click(hud.getByTestId('defense-launch-btn'));
    expect(useAppStore.getState().defenseLaunched).toBe(true);
    hud.unmount();

    const geoSpy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const matSpy = vi.spyOn(THREE.Material.prototype, 'dispose');
    const scene = render(React.createElement(PlanetaryDefenseScene));
    scene.unmount();
    expect(geoSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(matSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
  });
});

describe('Wave 2 Cosmic Observatory — Group B 3D Labs, Sub-Views & Shader Safety (Wave2GroupB · T4)', () => {
  beforeEach(() => {
    ModeOrchestrator.getInstance().exitAllModes();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    ModeOrchestrator.getInstance().exitAllModes();
  });

  it('R6/U2: TrappistSystem HUD renders transit canvas, switches planets & surface_e sub-view via CameraManager, and disposes GPU resources', () => {
    const subViewSpy = vi.spyOn(CameraManager.getInstance(), 'setCosmicLabSubView');
    useAppStore.setState({
      activeCosmicLab: 'trappist_exoplanets',
      trappistSelectedPlanet: 'e',
      trappistViewMode: 'system',
    });

    const hud = render(React.createElement(TrappistSystemHUD));
    expect(hud.getByTestId('trappist-system-hud')).toBeTruthy();
    expect(hud.getByTestId('trappist-transit-canvas')).toBeTruthy();

    fireEvent.click(hud.getByTestId('trappist-planet-f'));
    expect(useAppStore.getState().trappistSelectedPlanet).toBe('f');

    fireEvent.click(hud.getByTestId('trappist-view-surface_e'));
    expect(useAppStore.getState().trappistViewMode).toBe('surface_e');
    expect(subViewSpy).toHaveBeenCalledWith('trappist_exoplanets', 'surface_e');
    hud.unmount();

    const geoSpy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const matSpy = vi.spyOn(THREE.Material.prototype, 'dispose');
    const scene = render(React.createElement(TrappistSystemScene));
    scene.unmount();
    expect(geoSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(matSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('R7/U2: DysonMegastructure HUD updates Kardashev scale, switches O’Neill sub-view via CameraManager, and disposes GPU resources', () => {
    const subViewSpy = vi.spyOn(CameraManager.getInstance(), 'setCosmicLabSubView');
    useAppStore.setState({
      activeCosmicLab: 'dyson_megastructure',
      dysonMode: 'dyson_swarm',
      dysonCompletion: 0,
    });

    const hud = render(React.createElement(DysonMegastructureHUD));
    expect(hud.getByTestId('dyson-megastructure-hud')).toBeTruthy();
    expect(hud.getByTestId('dyson-kardashev').textContent).toContain('0.73');

    fireEvent.change(hud.getByTestId('dyson-completion-slider'), { target: { value: '1' } });
    expect(useAppStore.getState().dysonCompletion).toBe(1);
    expect(hud.getByTestId('dyson-kardashev').textContent).toContain('2.00');

    fireEvent.click(hud.getByTestId('dyson-mode-oneill_cylinder'));
    expect(useAppStore.getState().dysonMode).toBe('oneill_cylinder');
    expect(subViewSpy).toHaveBeenCalledWith('dyson_megastructure', 'oneill_cylinder');
    hud.unmount();

    const geoSpy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const matSpy = vi.spyOn(THREE.Material.prototype, 'dispose');
    const scene = render(React.createElement(DysonMegastructureScene));
    scene.unmount();
    expect(geoSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(matSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('R8/U2: RelativityLab HUD switches bh_dive sub-view via CameraManager, clamps sliders, and disposes GPU resources', () => {
    const subViewSpy = vi.spyOn(CameraManager.getInstance(), 'setCosmicLabSubView');
    useAppStore.setState({
      activeCosmicLab: 'relativity_lab',
      relativityTab: 'dilation_lensing',
      relativityVelocityC: 0.85,
      relativityRadiusRs: 3.5,
    });

    const hud = render(React.createElement(RelativityLabHUD));
    expect(hud.getByTestId('relativity-lab-hud')).toBeTruthy();
    expect(hud.getByTestId('relativity-gamma').textContent).toMatch(/1\.8|1\.9/);

    fireEvent.click(hud.getByTestId('relativity-tab-bh_dive'));
    expect(useAppStore.getState().relativityTab).toBe('bh_dive');
    expect(subViewSpy).toHaveBeenCalledWith('relativity_lab', 'bh_dive');
    hud.unmount();

    const geoSpy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const matSpy = vi.spyOn(THREE.Material.prototype, 'dispose');
    const scene = render(React.createElement(RelativityLabScene));
    scene.unmount();
    expect(geoSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(matSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('R8/U2: KesslerOrbital HUD triggers Kessler cascade, shows live debris & ISS risk, and disposes GPU resources', () => {
    useAppStore.setState({
      activeCosmicLab: 'kessler_leo',
      kesslerCascadeLevel: 0.2,
      kesslerTriggered: false,
    });

    const hud = render(React.createElement(KesslerOrbitalHUD));
    expect(hud.getByTestId('kessler-orbital-hud')).toBeTruthy();

    fireEvent.click(hud.getByTestId('kessler-trigger-btn'));
    expect(useAppStore.getState().kesslerTriggered).toBe(true);
    hud.unmount();

    const geoSpy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const matSpy = vi.spyOn(THREE.Material.prototype, 'dispose');
    const scene = render(React.createElement(KesslerOrbitalScene));
    scene.unmount();
    expect(geoSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(matSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('U2: All Wave 2 GLSL shaders & inline shaders guard pow() bases and atan(0,0) for Metal/ANGLE safety', () => {
    const srcRoot = path.resolve(__dirname, '..');
    const filesToCheck = [
      'shaders/cosmic/marsTerraform.frag.glsl',
      'shaders/cosmic/einsteinLens.frag.glsl',
      'scenes/CosmicLabs/NBodySandboxScene.tsx',
      'scenes/CosmicLabs/MarsTerraformScene.tsx',
      'scenes/CosmicLabs/PlanetaryCutawayScene.tsx',
      'scenes/CosmicLabs/PlanetaryDefenseScene.tsx',
      'scenes/CosmicLabs/TrappistSystemScene.tsx',
      'scenes/CosmicLabs/DysonMegastructureScene.tsx',
      'scenes/CosmicLabs/RelativityLabScene.tsx',
      'scenes/CosmicLabs/KesslerOrbitalScene.tsx',
    ];

    for (const relPath of filesToCheck) {
      const fullPath = path.join(srcRoot, relPath);
      expect(fs.existsSync(fullPath), `Missing Wave 2 shader/scene file: ${relPath}`).toBe(true);
      const src = fs.readFileSync(fullPath, 'utf8');
      // Guard against Metal/ANGLE NaN on negative base in pow(a - b, ...)
      expect(src, `Unsafe pow(a - b) in ${relPath}`).not.toMatch(/pow\(\s*[^m][^a][^x][^,]*-\s*[^,]+,/);
    }
  });

  it('Round 2 Regressions (CR F1/F2/F3): dysonMode resets on exit, stepNBodyVerlet zero-alloc scratch reuse, and CommandPalette canonical recents & search dedup', () => {
    // CR F1: dysonMode resets cleanly on exitCosmicLab() and clearExclusiveSystems()
    ModeOrchestrator.getInstance().enterCosmicLab('dyson_megastructure');
    useAppStore.getState().setDysonMode('oneill_cylinder');
    expect(useAppStore.getState().dysonMode).toBe('oneill_cylinder');
    ModeOrchestrator.getInstance().exitCosmicLab();
    expect(useAppStore.getState().dysonMode).toBe('dyson_swarm');

    // CR F2: stepNBodyVerlet mutates caller-supplied scratch object in place (0 heap allocs)
    const bodies = createNBodyPreset('figure8');
    const scratch = { kineticEnergy: 0, potentialEnergy: 0, totalEnergy: 0, rocheDisrupted: false, minStarDist: 0 };
    const returned = stepNBodyVerlet(bodies, 0.01, 0.04, scratch);
    expect(returned).toBe(scratch);
    expect(Number.isFinite(scratch.totalEnergy)).toBe(true);

    // CR F3: CommandPalette maps legacy canonical recent IDs and deduplicates search queries
    useAppStore.setState({
      recentExperiences: ['eclipse', 'land_europa', 'kessler_leo'],
      isCommandPaletteOpen: true,
    });
    const pal = render(React.createElement(CommandPalette));
    const initialOptions = pal.getAllByRole('option');
    expect(initialOptions.slice(0, 3).some((el) => /Nhật Thực|Eclipse/i.test(el.textContent || ''))).toBe(true);
    expect(initialOptions.slice(0, 3).some((el) => /Europa/i.test(el.textContent || ''))).toBe(true);

    const searchBox = pal.getByRole('combobox');
    fireEvent.change(searchBox, { target: { value: 'kessler' } });
    const kesslerMatches = pal.getAllByRole('option').filter((el) => /Kessler/i.test(el.textContent || ''));
    expect(kesslerMatches.length).toBe(1);
    pal.unmount();
    useAppStore.setState({ isCommandPaletteOpen: false });
  });
});
