import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { CameraManager } from '@/engine/camera/CameraManager';
import { SimulationClock } from '@/engine/simulation/SimulationClock';
import { SpacecraftEphemeris } from '@/engine/ephemeris/SpacecraftEphemeris';
import { useAppStore } from '@/stores/useAppStore';
import { useI18nStore } from '@/i18n';
import * as CelestialModule from '@/data/celestialData';
import { TargetHUD } from '@/ui/TargetHUD';
import { SuperNav } from '@/ui/SuperNav';

const SRC_ROOT = path.resolve(__dirname, '..');

function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relPath), 'utf8');
}

describe('Spacecraft Tracking, Constellation Reviews & Scrollable UI (SPEC-LUNGTUNG-2026-11-18-003)', () => {
  beforeEach(() => {
    const cam = CameraManager.getInstance();
    const perspective = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 80000);
    perspective.position.set(110, 35, 95);
    cam.setCamera(perspective);
    SimulationClock.getInstance().reset();
    SimulationClock.getInstance().setPaused(false);
    useAppStore.getState().setCameraMode('ORBIT');
    useAppStore.getState().setTargetId('earth');
    useI18nStore.getState().setLanguage('vi');
  });

  describe('R1: Unclipped Phi Thuyền Dropdown, Live Moving Spacecraft Tracking & Smooth Free-Flight Exit', () => {
    it('R1.a renders Phi Thuyền menu outside <nav> and tracks moving ISS/JWST positions in real time without excessive spin', () => {
      // 1. Calm cinematic ISS angular speed (must not spin at 8.5 rad/s = 81 RPM)
      const ephem = SpacecraftEphemeris.getInstance();
      const earthPos = new THREE.Vector3(68, 0, 0);
      const p0 = ephem.getISSPosition(0, earthPos, new THREE.Vector3()).sub(earthPos);
      const p1 = ephem.getISSPosition(1.0, earthPos, new THREE.Vector3()).sub(earthPos);
      const angle1Sec = p0.angleTo(p1);
      expect(angle1Sec).toBeGreaterThan(0.05);
      expect(angle1Sec).toBeLessThan(0.8);

      // 2. Live tracking helper updates destination dynamically while SimulationClock advances
      const cam = CameraManager.getInstance() as unknown as Record<string, unknown>;
      expect(typeof cam.syncLiveFocusDuringTween).toBe('function');

      CameraManager.getInstance().focusPlanet('iss');
      SimulationClock.getInstance().simulationTime += 2.2;
      (cam.syncLiveFocusDuringTween as (progress: number) => void).call(CameraManager.getInstance(), 1.0);

      const liveExpected = CameraManager.getInstance().getLiveBodyPosition('iss', new THREE.Vector3());
      const liveEarth = CameraManager.getInstance().getLiveBodyPosition('earth', new THREE.Vector3());
      expect(CameraManager.getInstance().target.distanceTo(liveExpected)).toBeLessThan(0.01);
      // Camera must stay outside ISS's orbital shell so Earth's blue limb is framed behind ISS (never wedged inside!)
      expect(CameraManager.getInstance().camera!.position.distanceTo(liveEarth)).toBeGreaterThan(
        liveExpected.distanceTo(liveEarth)
      );

      // 3. Phi Thuyền dropdown renders outside <nav> so nav overflow never clips it
      const { getByTitle, getByTestId } = render(React.createElement(SuperNav));
      fireEvent.click(getByTitle(/Phi Thuyền|Flight/i));
      const menu = getByTestId('spacecraft-dropdown-menu');
      expect(menu).toBeTruthy();
      expect(menu.closest('nav')).toBeNull();
    });

    it('R1.b (neg) exits FREE_FLIGHT smoothly at the current camera pose without snapping back to a previous planet', () => {
      const cam = CameraManager.getInstance() as unknown as Record<string, unknown>;
      expect(typeof cam.exitFreeFlight).toBe('function');

      CameraManager.getInstance().activeFocusId = 'mars';
      useAppStore.getState().setCameraMode('FREE_FLIGHT');
      CameraManager.getInstance().state = 'FREE_FLIGHT';
      CameraManager.getInstance().camera!.position.set(42, 18, -95);
      CameraManager.getInstance().camera!.lookAt(20, 12, -130);

      (cam.exitFreeFlight as () => void).call(CameraManager.getInstance());
      CameraManager.getInstance().updateOrbit(0.016);

      expect(CameraManager.getInstance().activeFocusId).toBeNull();
      expect(useAppStore.getState().cameraMode).toBe('ORBIT');
      expect(CameraManager.getInstance().camera!.position.distanceTo(new THREE.Vector3(42, 18, -95))).toBeLessThan(0.5);
    });
  });

  describe('R2: Interactive 3D Constellations & Planet-Style Review Card', () => {
    it('R2.a provides 8 rich bilingual constellations, focuses camera onto celestial RA/Dec, and renders full review dossier in TargetHUD', () => {
      const mod = CelestialModule as unknown as {
        CONSTELLATION_KEYS?: readonly string[];
        CELESTIAL_BODIES: Record<string, Record<string, unknown>>;
      };
      expect(Array.isArray(mod.CONSTELLATION_KEYS)).toBe(true);
      expect(mod.CONSTELLATION_KEYS!.length).toBeGreaterThanOrEqual(8);
      expect(mod.CONSTELLATION_KEYS).toContain('constellation_leo');
      expect(mod.CONSTELLATION_KEYS).toContain('constellation_orion');

      const leo = mod.CELESTIAL_BODIES.constellation_leo;
      expect(leo).toBeTruthy();
      expect(leo.type).toBe('constellation');
      expect(String(leo.brightestStar)).toContain('Regulus');

      // Focus constellation turns on showStarMap and points camera toward the constellation
      useAppStore.getState(). toggleStarMap();
      if (useAppStore.getState().showStarMap) {
        useAppStore.getState().toggleStarMap();
      }
      expect(useAppStore.getState().showStarMap).toBe(false);

      const cam = CameraManager.getInstance() as unknown as Record<string, unknown>;
      expect(typeof cam.focusConstellation).toBe('function');
      (cam.focusConstellation as (id: string) => void).call(CameraManager.getInstance(), 'constellation_leo');
      expect(useAppStore.getState().showStarMap).toBe(true);

      // Render TargetHUD for Chòm Sao Sư Tử (Leo) in Vietnamese (auto-expands dossier on >=640px desktop)
      useAppStore.getState().setTargetId('constellation_leo');
      const { container, unmount } = render(React.createElement(TargetHUD));
      expect(container.textContent).toMatch(/Sư Tử/i);
      expect(container.textContent).toContain('Regulus');
      expect(container.textContent).toContain('947 độ²');
      expect(container.textContent).toContain('năm a/s');
      expect(container.textContent).toMatch(/Nemean|Sư tử/i);
      unmount();

      // Switch to English ('en') and verify zero Vietnamese substrings leak into constellation review cards
      useI18nStore.getState().setLanguage('en');
      for (const cKey of mod.CONSTELLATION_KEYS!) {
        const loc = CelestialModule.getLocalizedBodyData(cKey);
        expect(String(loc.brightestStar)).not.toMatch(/Trái Tim|Tam Giác|siêu sao|mắt cam|Bắc Cực|cực Nam/i);
        expect(String(loc.deepSkyObjects)).not.toMatch(/Tinh vân|Cặp thiên hà|Cụm sao|Tàn dư|Hố đen|Bộ ba/i);
        expect(String(loc.distanceLightYears)).toContain('ly');
      }
      const enHud = render(React.createElement(TargetHUD));
      expect(enHud.container.textContent).toContain('947 deg²');
      expect(enHud.container.textContent).toContain('Heart of the Lion');
      expect(enHud.container.textContent).toContain('Leo Triplet Spiral Galaxies');
      enHud.unmount();

      // Saving & restoring a constellation bookmark preserves sky aim without bogus (6500, 0, 0) Keplerian lock
      const bm = CameraManager.getInstance().captureBookmarkPayload('Leo Sky', 'constellation_leo');
      expect(bm.offset).toBeUndefined();
      CameraManager.getInstance().restoreBookmark(bm);
      expect(CameraManager.getInstance().activeFocusId).toBeNull();
    });

    it('R2.b (neg) omits misleading 0 km / 0 m/s² planet stats on constellations and keeps batched LineSegments with zero lights in CelestialOverlay', () => {
      useAppStore.getState().setTargetId('constellation_leo');
      const { container } = render(React.createElement(TargetHUD));
      expect(container.textContent).not.toContain('0 km');
      expect(container.textContent).not.toContain('0 m/s²');

      const overlaySrc = readSrc('entities/Constellations/CelestialOverlay.tsx');
      expect(overlaySrc).toContain('<lineSegments');
      expect(overlaySrc).toContain('NOOP_RAYCAST');
      expect(overlaySrc).toContain('.dispose()');
      expect(overlaySrc).not.toContain('<pointLight');
      expect(overlaySrc).not.toContain('<spotLight');
    });
  });

  describe('R3: Unblocked Sidebar & Dropdown Scrolling + Swipable 2xl SuperNav', () => {
    it('R3.a removes overflow:hidden from .vip-card-sheen and configures vertical/horizontal scroll containers cleanly', () => {
      const css = readSrc('styles/globals.css');
      const sheenBlockMatch = css.match(/\.vip-card-sheen\s*\{([^}]*)\}/);
      expect(sheenBlockMatch).not.toBeNull();
      expect(sheenBlockMatch![1]).not.toMatch(/overflow\s*:\s*hidden/);

      useAppStore.getState().setTargetId('saturn');
      const hud = render(React.createElement(TargetHUD));
      const hudScroll = hud.getByTestId('target-hud-scroll');
      expect(hudScroll.className).toContain('overflow-y-auto');
      expect(hudScroll.className).toContain('overscroll-contain');
      expect(hudScroll.className).toContain('touch-pan-y');

      const nav = render(React.createElement(SuperNav));
      const navScroll = nav.getByTestId('supernav-scroll');
      expect(navScroll.className).toContain('overflow-x-auto');
      expect(navScroll.className).toContain('touch-pan-x');
    });

    it('R3.b (neg) stops wheel events inside TargetHUD and SuperNav dropdowns from propagating out to zoom the 3D scene', () => {
      useAppStore.getState().setTargetId('saturn');
      let bubbledToParent = false;
      const onParentWheel = () => {
        bubbledToParent = true;
      };

      const { getByTestId } = render(
        React.createElement('div', { onWheel: onParentWheel }, React.createElement(TargetHUD))
      );
      const hudScroll = getByTestId('target-hud-scroll');
      fireEvent.wheel(hudScroll, { deltaY: 120 });
      expect(bubbledToParent).toBe(false);
    });
  });
});
