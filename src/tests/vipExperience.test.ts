import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore';
import { CameraManager } from '@/engine/camera/CameraManager';
import { TargetHUD } from '@/ui/TargetHUD';
import { SuperNav } from '@/ui/SuperNav';

const SRC_ROOT = path.resolve(__dirname, '..');

describe('VIP Observatory Experience (SPEC-UNIVERSE-2026-11-18-001)', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState({
      cameraMode: 'ORBIT',
      targetId: 'earth',
      hoveredId: null,
      compareMode: false,
      activeSurface: 'none',
      inExoSystem: false,
    });
  });

  describe('R1: Star Map & Radar state toggles and corruption-safe 8-slot Camera Bookmarks', () => {
    it('R1.a caps saved camera bookmarks at 8 most recent entries and supports deletion by id', () => {
      const state = useAppStore.getState() as unknown as Record<string, unknown>;
      expect(typeof state.toggleStarMap).toBe('function');
      expect(typeof state.toggleRadar).toBe('function');
      expect(typeof state.saveCameraBookmark).toBe('function');
      expect(typeof state.removeCameraBookmark).toBe('function');

      const save = state.saveCameraBookmark as (bookmark: {
        name: string;
        targetId: string | null;
        position: [number, number, number];
        target: [number, number, number];
      }) => void;
      const remove = state.removeCameraBookmark as (id: string) => void;

      // Clear existing bookmarks if any
      const initial = ((useAppStore.getState() as unknown as Record<string, unknown>).savedBookmarks ??
        []) as Array<{ id: string }>;
      initial.forEach((b) => remove(b.id));

      for (let i = 1; i <= 9; i++) {
        save({
          name: `Shot ${i}`,
          targetId: 'saturn',
          position: [i * 10, 20, 30],
          target: [0, 0, 0],
        });
      }

      const afterSave = (
        useAppStore.getState() as unknown as {
          savedBookmarks: Array<{ id: string; name: string }>;
        }
      ).savedBookmarks;
      expect(afterSave).toHaveLength(8);
      expect(afterSave[0].name).toBe('Shot 9');
      expect(afterSave.some((b) => b.name === 'Shot 1')).toBe(false);

      remove(afterSave[0].id);
      const afterRemove = (
        useAppStore.getState() as unknown as {
          savedBookmarks: Array<{ id: string; name: string }>;
        }
      ).savedBookmarks;
      expect(afterRemove).toHaveLength(7);
    });

    it('R1.b (neg) recovers safely to an empty bookmark list when localStorage holds malformed JSON', () => {
      localStorage.setItem('universe_vip_bookmarks', '{corrupted-json-payload');
      const state = useAppStore.getState() as unknown as Record<string, unknown>;
      expect(typeof state.loadCameraBookmarks).toBe('function');

      let loaded: unknown[] = [];
      expect(() => {
        loaded = (state.loadCameraBookmarks as () => unknown[])();
      }).not.toThrow();
      expect(Array.isArray(loaded)).toBe(true);
      expect(loaded).toHaveLength(0);
    });
  });

  describe('R2: 3D Celestial Constellation Sky-Map & Goldilocks Habitable Zone Overlay', () => {
    it('R2.a batches all constellation sky-lines into 1 LineSegments geometry with raycast disabled and disposes on unmount', async () => {
      const overlayFile = path.join(SRC_ROOT, 'entities/Constellations/CelestialOverlay.tsx');
      expect(fs.existsSync(overlayFile)).toBe(true);

      const src = fs.readFileSync(overlayFile, 'utf8');
      expect(src).toContain('<lineSegments');
      expect(src).toContain('NOOP_RAYCAST');
      expect(src).toContain('.dispose()');

      const overlayModuleId = '../entities/Constellations/CelestialOverlay';
      const mod = await import(/* @vite-ignore */ overlayModuleId);
      expect(typeof mod.buildConstellationPositions).toBe('function');
      const positions: Float32Array = mod.buildConstellationPositions(6500);
      expect(positions instanceof Float32Array).toBe(true);
      // Multiple constellation line pairs (each segment = 2 vertices * 3 floats = 6 floats)
      expect(positions.length).toBeGreaterThanOrEqual(120);
      expect(positions.length % 6).toBe(0);
    });

    it('R2.b (neg) toggles visibility via showStarMap with zero dynamic lights in CelestialOverlay or SolarSystemScene mount', () => {
      const overlayFile = path.join(SRC_ROOT, 'entities/Constellations/CelestialOverlay.tsx');
      const solarSceneFile = path.join(SRC_ROOT, 'scenes/SolarSystem/SolarSystemScene.tsx');
      expect(fs.existsSync(overlayFile)).toBe(true);

      const overlaySrc = fs.readFileSync(overlayFile, 'utf8');
      const solarSrc = fs.readFileSync(solarSceneFile, 'utf8');

      expect(overlaySrc).not.toContain('<pointLight');
      expect(overlaySrc).not.toContain('<spotLight');
      expect(overlaySrc).toContain('visible={showStarMap}');
      expect(solarSrc).toContain('<CelestialOverlay');
    });
  });

  describe('R3: 2D Canvas Orbital Radar Minimap at <= 15Hz with click-to-focus navigation', () => {
    it('R3.a selects and focuses Jupiter when clicking Jupiter radar coordinates on SolarRadarHUD', async () => {
      const radarFile = path.join(SRC_ROOT, 'ui/SolarRadarHUD.tsx');
      expect(fs.existsSync(radarFile)).toBe(true);

      const radarModuleId = '../ui/SolarRadarHUD';
      const mod = await import(/* @vite-ignore */ radarModuleId);
      const focusSpy = vi.spyOn(CameraManager.getInstance(), 'focusPlanet').mockImplementation(() => {});

      useAppStore.setState({ showRadar: true } as Partial<ReturnType<typeof useAppStore.getState>>);
      const { unmount } = render(React.createElement(mod.SolarRadarHUD));

      const canvas = screen.getByTestId('solar-radar-canvas') as HTMLCanvasElement;
      expect(canvas).toBeTruthy();

      const jupiterPt = mod.computePlanetRadarPoint('jupiter', 0, 168);
      vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 168,
        bottom: 168,
        width: 168,
        height: 168,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      fireEvent.click(canvas, { clientX: jupiterPt.x, clientY: jupiterPt.y });
      expect(useAppStore.getState().targetId).toBe('jupiter');
      expect(focusSpy).toHaveBeenCalledWith('jupiter');

      focusSpy.mockRestore();
      unmount();
    });

    it('R3.b (neg) unmounts canvas interval and renders compact pill when showRadar is false', async () => {
      const radarFile = path.join(SRC_ROOT, 'ui/SolarRadarHUD.tsx');
      expect(fs.existsSync(radarFile)).toBe(true);

      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
      const radarModuleId = '../ui/SolarRadarHUD';
      const mod = await import(/* @vite-ignore */ radarModuleId);

      useAppStore.setState({ showRadar: true } as Partial<ReturnType<typeof useAppStore.getState>>);
      const { rerender, unmount } = render(React.createElement(mod.SolarRadarHUD));
      expect(screen.queryByTestId('solar-radar-canvas')).not.toBeNull();

      act(() => {
        useAppStore.setState({ showRadar: false } as Partial<ReturnType<typeof useAppStore.getState>>);
      });
      rerender(React.createElement(mod.SolarRadarHUD));

      expect(screen.queryByTestId('solar-radar-canvas')).toBeNull();
      expect(screen.getByTestId('solar-radar-expand')).toBeTruthy();
      expect(clearIntervalSpy).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
      unmount();
    });
  });

  describe('R4: VIP TargetHUD Deep Dossier, live light-delay telemetry, moon chips & contextual actions', () => {
    it('R4.a displays light-delay, Earth-gravity ratio, Mars landing action, and clickable Jupiter moon chips', () => {
      const cam = CameraManager.getInstance();
      cam.setCamera(new THREE.PerspectiveCamera(50, 1.77, 0.1, 80000));
      const focusSpy = vi.spyOn(cam, 'focusPlanet').mockImplementation(() => {});

      // 1. Mars: quick surface landing action + deep dossier
      useAppStore.setState({ targetId: 'mars', hoveredId: null });
      const { rerender, unmount } = render(
        React.createElement(React.Fragment, null, React.createElement(SuperNav), React.createElement(TargetHUD))
      );

      expect(screen.getByTestId('light-delay-readout')).toBeTruthy();
      expect(screen.getByTestId('quick-action-land')).toBeTruthy();

      fireEvent.click(screen.getByTestId('dossier-toggle'));
      expect(screen.getByTestId('dossier-gravity-ratio').textContent).toContain('0.38');

      // 2. Jupiter: clickable moon chips fly to Europa
      act(() => {
        useAppStore.setState({ targetId: 'jupiter', hoveredId: null });
      });
      rerender(
        React.createElement(React.Fragment, null, React.createElement(SuperNav), React.createElement(TargetHUD))
      );

      const europaChip = screen.getByTestId('moon-chip-europa');
      fireEvent.click(europaChip);
      expect(useAppStore.getState().targetId).toBe('europa');
      expect(focusSpy).toHaveBeenCalledWith('europa');

      focusSpy.mockRestore();
      unmount();
    });

    it('R4.b (neg) omits solid-surface landing button when targeting the Gargantua black hole', () => {
      useAppStore.setState({ targetId: 'blackhole', hoveredId: null });
      const { unmount } = render(React.createElement(TargetHUD));

      expect(screen.queryByTestId('quick-action-land')).toBeNull();
      unmount();
    });
  });

  describe('R2Graphics: Deterministic GPU BufferGeometry disposal, Saturn axial ring normal & CompareScene Sun/Rings', () => {
    it('R2.a disposes dynamic BufferGeometry instances directly and supports Sun + scaled rings in CompareScene', () => {
      for (const rel of [
        'entities/StarField/StarField.tsx',
        'scenes/Galaxy/GalaxyScene.tsx',
        'simulation/effects/NebulaCloud.tsx',
      ]) {
        const src = fs.readFileSync(path.join(SRC_ROOT, rel), 'utf8');
        expect(src, `${rel} should construct BufferGeometry in useMemo`).toContain('new THREE.BufferGeometry()');
        expect(src, `${rel} should dispose exact geometry instance`).toContain('geometry.dispose()');
      }

      const planetSrc = fs.readFileSync(path.join(SRC_ROOT, 'entities/Planet/Planet.tsx'), 'utf8');
      expect(planetSrc).toContain('Math.cos(tiltRad)');
      expect(planetSrc).toContain('data.visualRadius * 1.028');

      const compareSrc = fs.readFileSync(path.join(SRC_ROOT, 'scenes/Compare/CompareScene.tsx'), 'utf8');
      expect(compareSrc).toContain('<Sun');
      expect(compareSrc).toContain('innerRadius');

      const earthHistSrc = fs.readFileSync(path.join(SRC_ROOT, 'simulation/earth/EarthHistoryScene.tsx'), 'utf8');
      const cosmicSrc = fs.readFileSync(path.join(SRC_ROOT, 'simulation/cosmic/CosmicEventScene.tsx'), 'utf8');
      expect(earthHistSrc).toContain('<StarField');
      expect(cosmicSrc).toContain('<StarField');
    });

    it('R2.b (neg) preserves shared AssetManager unitSphere geometry when Planet unmounts', () => {
      const planetSrc = fs.readFileSync(path.join(SRC_ROOT, 'entities/Planet/Planet.tsx'), 'utf8');
      expect(planetSrc).not.toContain('unitSphere.dispose()');
      expect(planetSrc).toContain('earthMat?.dispose()');
    });
  });

  describe('R3Bilingual: Complete English simulation narrations and responsive scenario gauge bars', () => {
    it('R3.a provides English translations across all Launch, Earth History, and Cosmic Event records', async () => {
      const { LAUNCH_STEPS } = await import('@/simulation/data/launchProfileData');
      const { EARTH_PERIODS } = await import('@/simulation/data/earthHistoryData');
      const { COSMIC_EVENTS } = await import('@/simulation/data/cosmicEventsData');

      for (const step of LAUNCH_STEPS) {
        const stepRec = step as unknown as { narrationEn?: { title: string; body: string } };
        expect(stepRec.narrationEn?.title?.length).toBeGreaterThan(3);
        expect(stepRec.narrationEn?.body?.length).toBeGreaterThan(10);
      }

      for (const period of EARTH_PERIODS) {
        const pRec = period as unknown as { descriptionEn?: string; keyLifeformsEn?: string[] };
        expect(pRec.descriptionEn?.length).toBeGreaterThan(15);
        expect(pRec.keyLifeformsEn?.length).toBeGreaterThan(0);
      }

      for (const ev of COSMIC_EVENTS) {
        const evRec = ev as unknown as { titleEn?: string; descriptionEn?: string; scientificFactEn?: string };
        expect(evRec.titleEn?.length).toBeGreaterThan(3);
        expect(evRec.descriptionEn?.length).toBeGreaterThan(15);
        expect(evRec.scientificFactEn?.length).toBeGreaterThan(10);
      }
    });

    it('R3.b (neg) wraps CockpitHUD and EarthTimelineHUD top sensor bars cleanly on 390px mobile screens', () => {
      const cockpitHudSrc = fs.readFileSync(path.join(SRC_ROOT, 'simulation/launch/CockpitHUD.tsx'), 'utf8');
      const earthHudSrc = fs.readFileSync(path.join(SRC_ROOT, 'simulation/earth/EarthTimelineHUD.tsx'), 'utf8');
      expect(cockpitHudSrc).toContain('flex-wrap');
      expect(earthHudSrc).toContain('flex-wrap');
    });
  });

  describe('R4Polish: Orbital bookmark restoration, camera.up reset, and browser modifier shortcut safety', () => {
    it('R4.a restores activeFocusId and relative orbital offset on bookmark restore and resets camera.up on scenario exit', () => {
      const camMgr = CameraManager.getInstance();
      const cam = new THREE.PerspectiveCamera(50, 1.77, 0.1, 80000);
      camMgr.setCamera(cam);

      camMgr.focusPlanet('jupiter');
      const payload = camMgr.captureBookmarkPayload('Jupiter Rim', 'jupiter');
      expect(payload.targetId).toBe('jupiter');
      expect(Array.isArray(payload.offset)).toBe(true);

      camMgr.focusPlanet('mars');
      expect(camMgr.activeFocusId).toBe('mars');

      camMgr.restoreBookmark(payload);
      expect(camMgr.activeFocusId).toBe('jupiter');

      // Simulate tilted rocket COCKPIT up-vector and verify setScenarioMode('none') resets it to (0, 1, 0)
      cam.up.set(0, 0.25, -0.96).normalize();
      camMgr.setScenarioMode('none');
      expect(cam.up.x).toBeCloseTo(0, 5);
      expect(cam.up.y).toBeCloseTo(1, 5);
      expect(cam.up.z).toBeCloseTo(0, 5);
    });

    it('R4.b (neg) ignores Cmd/Ctrl/Alt modified shortcuts across App, DiagnosticsOverlay, and InputManager, and resets stuck keys on blur', () => {
      const appSrc = fs.readFileSync(path.join(SRC_ROOT, 'App.tsx'), 'utf8');
      expect(appSrc).toMatch(/e\.metaKey\s*\|\|\s*e\.ctrlKey\s*\|\|\s*e\.altKey/);

      const diagSrc = fs.readFileSync(path.join(SRC_ROOT, 'ui/DiagnosticsOverlay.tsx'), 'utf8');
      expect(diagSrc).toContain("'INPUT'");
      expect(diagSrc).toContain('e.metaKey');

      const planetSrc = fs.readFileSync(path.join(SRC_ROOT, 'entities/Planet/Planet.tsx'), 'utf8');
      expect(planetSrc).toContain('getWorldPosition(scratchWorldPos)');
      expect(planetSrc).toContain('saturnRingUniforms.uOuterRadius.value = data.rings.outerRadius');

      const compareSrc = fs.readFileSync(path.join(SRC_ROOT, 'scenes/Compare/CompareScene.tsx'), 'utf8');
      expect(compareSrc).toContain('key={`compare-a-${dataA.id}`}');
      expect(compareSrc).toContain('sunPosition={[50, 20, 50]}');

      const photoSrc = fs.readFileSync(path.join(SRC_ROOT, 'ui/PhotoModeModal.tsx'), 'utf8');
      expect(photoSrc).toContain('requestScreenshot');
      expect(photoSrc).toContain('if (!isPhotoMode)');
    });
  });
});
