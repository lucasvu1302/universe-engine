import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { describe, it, expect, beforeEach } from 'vitest';
import { CameraManager } from '@/engine/camera/CameraManager';
import { ModeOrchestrator } from '@/engine/navigation/ModeOrchestrator';
import { useAppStore, type CameraMode } from '@/stores/useAppStore';

const SRC_ROOT = path.resolve(__dirname, '..');

function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relPath), 'utf8');
}

describe('Smooth Zero-Flash Galaxy Transition (SPEC V2 Bugfix)', () => {
  beforeEach(() => {
    const cam = CameraManager.getInstance();
    const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 80000);
    camera.position.set(110, 35, 95);
    cam.setCamera(camera);
    cam.cancelActiveTransition();
    useAppStore.setState({
      cameraMode: 'ORBIT',
      targetId: 'sun',
      activeSurface: 'none',
      activeCosmicLab: 'none',
      inExoSystem: false,
      compareMode: false,
    });
    if (typeof (cam as unknown as { exitGalaxyMode?: (imm?: boolean) => void }).exitGalaxyMode === 'function') {
      (cam as unknown as { exitGalaxyMode: (imm?: boolean) => void }).exitGalaxyMode(true);
    }
  });

  it('R1.a: flyToGalaxyView smoothly ramps galaxyBlend from 0 -> 1 during TRANSITIONING and arrives directly in GALAXY without flashing ORBIT', () => {
    const cam = CameraManager.getInstance() as CameraManager & {
      galaxyBlend?: number;
      isGalaxyTargetActive?: () => boolean;
    };

    expect(typeof cam.isGalaxyTargetActive).toBe('function');
    expect(cam.galaxyBlend).toBe(0);

    const observedModes: CameraMode[] = [];
    const unsubscribe = useAppStore.subscribe((state, prev) => {
      if (state.cameraMode !== prev.cameraMode) {
        observedModes.push(state.cameraMode);
      }
    });

    try {
      cam.flyToGalaxyView();

      expect(cam.isGalaxyTargetActive?.()).toBe(true);
      expect(cam.state).toBe('TRANSITIONING');
      expect(useAppStore.getState().cameraMode).toBe('TRANSITIONING');

      // Advance ~0.5s (10 steps of 0.05s) — galaxy must already be smoothly emerging mid-flight
      for (let i = 0; i < 10; i++) {
        cam.updateTransition(0.05);
      }
      const earlyBlend = cam.galaxyBlend ?? 0;
      expect(earlyBlend).toBeGreaterThan(0.05);
      expect(earlyBlend).toBeLessThan(0.5);

      // Advance to ~1.2s — monotonically increasing
      for (let i = 0; i < 14; i++) {
        cam.updateTransition(0.05);
      }
      const midBlend = cam.galaxyBlend ?? 0;
      expect(midBlend).toBeGreaterThan(earlyBlend);
      expect(midBlend).toBeLessThan(1.0);

      // Finish 2.0s flight
      for (let i = 0; i < 20; i++) {
        cam.updateTransition(0.05);
      }

      expect(cam.galaxyBlend).toBeCloseTo(1, 5);
      expect(cam.state).toBe('GALAXY');
      expect(useAppStore.getState().cameraMode).toBe('GALAXY');
      // Critical: arrival must go TRANSITIONING -> GALAXY directly without an intermediate ORBIT flash
      expect(observedModes).toEqual(['TRANSITIONING', 'GALAXY']);
    } finally {
      unsubscribe();
    }
  });

  it('R1.b (neg): exiting Galaxy to Solar System, Black Hole, or standalone Cosmic Lab smoothly resets galaxyBlend without leaking Galaxy overlay', () => {
    const cam = CameraManager.getInstance() as CameraManager & {
      galaxyBlend?: number;
      isGalaxyTargetActive?: () => boolean;
    };

    // Reach full Galaxy view first
    cam.flyToGalaxyView();
    for (let i = 0; i < 45; i++) {
      cam.updateTransition(0.05);
    }
    expect(cam.galaxyBlend).toBeCloseTo(1, 5);

    // 1. Fly smoothly from Galaxy directly to Black Hole (smooth reverse crossfade 1 -> 0)
    cam.flyToBlackHole();
    expect(cam.isGalaxyTargetActive?.()).toBe(false);
    expect(cam.galaxyBlend).toBeCloseTo(1, 5); // Does not pop to 0 on frame 0!

    for (let i = 0; i < 25; i++) {
      cam.updateTransition(0.05);
    }
    const midExitBlend = cam.galaxyBlend ?? 1;
    expect(midExitBlend).toBeGreaterThan(0.05);
    expect(midExitBlend).toBeLessThan(0.95);

    for (let i = 0; i < 40; i++) {
      cam.updateTransition(0.05);
    }
    expect(cam.galaxyBlend).toBeCloseTo(0, 5);
    expect(cam.state).toBe('ORBIT');

    // 2. Enter Galaxy again, then jump straight into a standalone Cosmic Lab -> immediate clean reset
    cam.flyToGalaxyView();
    for (let i = 0; i < 45; i++) {
      cam.updateTransition(0.05);
    }
    expect(cam.galaxyBlend).toBeCloseTo(1, 5);

    ModeOrchestrator.getInstance().enterCosmicLab('relativity_lab');
    expect(cam.isGalaxyTargetActive?.()).toBe(false);
    expect(cam.galaxyBlend).toBe(0);
  });

  it('R2.a/R2.b: App co-mounts SolarSystemScene + GalaxyScene for zero-unmount crossfade, Galaxy shaders support uOpacity, and all entry points use flyToGalaxyView', () => {
    const appSrc = readSrc('App.tsx');
    const galaxySrc = readSrc('scenes/Galaxy/GalaxyScene.tsx');
    const solarSrc = readSrc('scenes/SolarSystem/SolarSystemScene.tsx');
    const galaxyFrag = readSrc('shaders/galaxy/galaxy.frag.glsl');
    const nebulaFrag = readSrc('shaders/galaxy/galaxyNebula.frag.glsl');
    const scaleSrc = readSrc('ui/ScaleExplorer.tsx');

    // App.tsx must NOT mutually unmount SolarSystemScene and GalaxyScene on !isGalaxy / isGalaxy
    expect(appSrc).not.toMatch(/!isGalaxy[\s\S]{0,160}<SolarSystemScene/);
    expect(appSrc).not.toMatch(/&&\s*isGalaxy[\s\S]{0,160}<GalaxyScene/);

    // Voice AI and ScaleExplorer must glide via flyToGalaxyView() instead of bare setCameraMode('GALAXY')
    expect(appSrc).toMatch(/cmd\.type === 'GALAXY'[\s\S]{0,160}flyToGalaxyView\(\)/);
    expect(scaleSrc).toMatch(/targetStep\.isGalaxy[\s\S]{0,160}flyToGalaxyView\(\)/);

    // Both galaxy fragment shaders accept uniform float uOpacity
    expect(galaxyFrag).toMatch(/uniform\s+float\s+uOpacity;/);
    expect(nebulaFrag).toMatch(/uniform\s+float\s+uOpacity;/);

    // GalaxyScene drives uOpacity + visible + boundingSphere + guards Sol beacon interaction when hidden/fading
    expect(galaxySrc).toContain('uOpacity');
    expect(galaxySrc).toContain('boundingSphere');
    expect(galaxySrc).toContain('galaxyBlend');
    expect(galaxySrc).toMatch(/galaxyBlend\s*<\s*0\.8/);

    // SolarSystemScene keeps StarField continuously visible outside the shrinking solar system group
    expect(solarSrc).toContain('galaxyBlend');
    expect(solarSrc).toMatch(/<StarField\s*\/>[\s\S]*?<group\s+ref=/);
  });
});
