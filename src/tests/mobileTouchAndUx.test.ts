import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';

import { CameraManager } from '@/engine/camera/CameraManager';
import { TouchOrbitGestureEngine } from '@/engine/camera/TouchOrbitGestureEngine';
import { MobileZoomControls } from '@/ui/MobileZoomControls';
import { TargetHUD } from '@/ui/TargetHUD';
import { useAppStore } from '@/stores/useAppStore';

const SRC_ROOT = path.resolve(__dirname, '..');

function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relPath), 'utf8');
}

describe('Mobile Touch Ergonomics, Zoom & Stability (SPEC-UNIV-2026-11-24-001 T1)', () => {
  let camManager: CameraManager;
  let camera: THREE.PerspectiveCamera;

  beforeEach(() => {
    camManager = CameraManager.getInstance();
    camera = new THREE.PerspectiveCamera(50, 390 / 844, 0.1, 80000);
    camManager.setCamera(camera);
    camManager.state = 'ORBIT';
    camManager.activeScenario = 'none';
    camManager.activeFocusId = 'earth';
    camManager.targetDistance = 60;
    camManager.currentDistance = 60;
    camManager.spherical.set(60, Math.PI / 3, 0);
    camManager.targetSpherical.set(60, Math.PI / 3, 0);
    camManager.clearOrbitInertia();

    useAppStore.setState({
      cameraMode: 'ORBIT',
      targetId: 'earth',
      hoveredId: null,
      cinemaMode: false,
      photoMode: false,
      activeTour: false,
      activeSurface: 'none',
      activeEventSurfaceId: null,
      activeCosmicLab: 'none',
      inExoSystem: false,
      compareMode: false,
    });
  });

  it('R1.a applies >=1.8x responsive touch swipe sensitivity with touch-only inertia while desktop mouse keeps zero inertia', () => {
    const engine = new TouchOrbitGestureEngine({
      onRotate: (dTheta, dPhi) => camManager.rotateOrbit(dTheta, dPhi),
      onPan: (dx, dy) => camManager.panOrbit(dx, dy),
      onZoom: (deltaRaw) => camManager.zoomOrbit(deltaRaw),
      onReleaseInertia: (vTheta, vPhi) => camManager.setOrbitInertia(vTheta, vPhi),
      onClearInertia: () => camManager.clearOrbitInertia(),
      onDoubleTap: () => camManager.triggerDoubleTapZoom(),
    });

    // 1. Desktop mouse swipe 120px
    const mouseStartTheta = camManager.targetSpherical.theta;
    engine.onPointerDown({ pointerId: 10, pointerType: 'mouse', clientX: 100, clientY: 200, button: 0, shiftKey: false }, 0);
    engine.onPointerMove({ pointerId: 10, pointerType: 'mouse', clientX: 160, clientY: 200 }, 16);
    engine.onPointerMove({ pointerId: 10, pointerType: 'mouse', clientX: 220, clientY: 200 }, 32);
    engine.onPointerUp({ pointerId: 10, pointerType: 'mouse', clientX: 220, clientY: 200 }, 48);
    const mouseDeltaTheta = Math.abs(camManager.targetSpherical.theta - mouseStartTheta);

    // Desktop mouse must have strictly 0 inertia (U1)
    expect(camManager.angularVelTheta).toBe(0);
    expect(camManager.angularVelPhi).toBe(0);

    // 2. Mobile touch swipe 120px
    camManager.targetSpherical.theta = 0;
    camManager.spherical.theta = 0;
    const touchStartTheta = camManager.targetSpherical.theta;
    engine.onPointerDown({ pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 200, button: 0, shiftKey: false }, 100);
    engine.onPointerMove({ pointerId: 1, pointerType: 'touch', clientX: 160, clientY: 200 }, 116);
    engine.onPointerMove({ pointerId: 1, pointerType: 'touch', clientX: 220, clientY: 200 }, 132);
    engine.onPointerUp({ pointerId: 1, pointerType: 'touch', clientX: 220, clientY: 200 }, 148);
    const touchDeltaTheta = Math.abs(camManager.targetSpherical.theta - touchStartTheta);

    expect(touchDeltaTheta).toBeGreaterThanOrEqual(mouseDeltaTheta * 1.8);
    const releaseVel = Math.abs(camManager.angularVelTheta);
    expect(releaseVel).toBeGreaterThan(0.1);

    // Coasting frames decay inertia smoothly toward 0 while continuing to rotate
    const thetaAfterRelease = camManager.targetSpherical.theta;
    for (let i = 0; i < 15; i++) {
      camManager.updateOrbit(0.016);
    }
    expect(Math.abs(camManager.targetSpherical.theta - thetaAfterRelease)).toBeGreaterThan(0.01);
    expect(Math.abs(camManager.angularVelTheta)).toBeLessThan(releaseVel);

    for (let i = 0; i < 180; i++) {
      camManager.updateOrbit(0.016);
    }
    expect(Math.abs(camManager.angularVelTheta)).toBeLessThan(0.001);
  });

  it('R1.b zooms logarithmically on 2-finger pinch without single-finger rotation spikes and avoids 2->1 finger jump', () => {
    const rotateSpy = vi.fn((dTheta: number, dPhi: number) => camManager.rotateOrbit(dTheta, dPhi));
    const engine = new TouchOrbitGestureEngine({
      onRotate: rotateSpy,
      onPan: (dx, dy) => camManager.panOrbit(dx, dy),
      onZoom: (deltaRaw) => camManager.zoomOrbit(deltaRaw),
      onReleaseInertia: (vTheta, vPhi) => camManager.setOrbitInertia(vTheta, vPhi),
      onClearInertia: () => camManager.clearOrbitInertia(),
      onDoubleTap: () => camManager.triggerDoubleTapZoom(),
    });

    const initialDist = camManager.targetDistance;
    const startFocusId = camManager.activeFocusId;

    // Put down 2 fingers 100px apart
    engine.onPointerDown({ pointerId: 1, pointerType: 'touch', clientX: 150, clientY: 300, button: 0, shiftKey: false }, 0);
    engine.onPointerDown({ pointerId: 2, pointerType: 'touch', clientX: 250, clientY: 300, button: 0, shiftKey: false }, 10);

    // Spread fingers to 200px apart (2x spread -> pinch zoom in)
    engine.onPointerMove({ pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 300 }, 26);
    engine.onPointerMove({ pointerId: 2, pointerType: 'touch', clientX: 300, clientY: 300 }, 26);

    // Zero orbit rotation spikes during 2-finger pinch!
    expect(rotateSpy).toHaveBeenCalledTimes(0);
    expect(camManager.targetDistance).toBeLessThan(initialDist * 0.72);
    // Focus lock preserved during pure pinch-zoom
    expect(camManager.activeFocusId).toBe(startFocusId);

    // Lift finger 2, then nudge finger 1 by only 5px: must NOT jump by 200px!
    const thetaBeforeLift = camManager.targetSpherical.theta;
    engine.onPointerUp({ pointerId: 2, pointerType: 'touch', clientX: 300, clientY: 300 }, 42);
    engine.onPointerMove({ pointerId: 1, pointerType: 'touch', clientX: 105, clientY: 300 }, 58);

    const deltaAfterLift = Math.abs(camManager.targetSpherical.theta - thetaBeforeLift);
    expect(deltaAfterLift).toBeLessThan(0.12);
    expect(deltaAfterLift).toBeGreaterThan(0.01);
  });

  it('R1.c (neg) cleans up activePointers & inertia on pointercancel and enforces touch-action: none + overscroll-behavior: none + 100dvh', () => {
    const rotateSpy = vi.fn();
    const zoomSpy = vi.fn();
    const engine = new TouchOrbitGestureEngine({
      onRotate: rotateSpy,
      onPan: vi.fn(),
      onZoom: zoomSpy,
      onReleaseInertia: (vTheta, vPhi) => camManager.setOrbitInertia(vTheta, vPhi),
      onClearInertia: () => camManager.clearOrbitInertia(),
      onDoubleTap: vi.fn(),
    });

    engine.onPointerDown({ pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 200, button: 0, shiftKey: false }, 0);
    engine.onPointerDown({ pointerId: 2, pointerType: 'touch', clientX: 200, clientY: 200, button: 0, shiftKey: false }, 10);
    expect(engine.getActivePointerCount()).toBe(2);

    engine.onPointerCancel(1);
    engine.onPointerCancel(2);
    expect(engine.getActivePointerCount()).toBe(0);
    expect(camManager.angularVelTheta).toBe(0);

    // Subsequent move with cancelled pointer produces zero rotation/zoom
    engine.onPointerMove({ pointerId: 1, pointerType: 'touch', clientX: 260, clientY: 260 }, 40);
    expect(rotateSpy).toHaveBeenCalledTimes(0);
    expect(zoomSpy).toHaveBeenCalledTimes(0);

    // Static architecture invariants for browser gesture prevention & mobile dvh
    const controllerSrc = readSrc('engine/camera/CameraController.tsx');
    const cssSrc = readSrc('styles/globals.css');
    const appSrc = readSrc('App.tsx');
    expect(controllerSrc).toContain('pointercancel');
    expect(controllerSrc).toContain('touchAction');
    expect(cssSrc).toContain('overscroll-behavior: none');
    expect(appSrc).toContain('100dvh');
  });

  it('R1.d renders one-handed MobileZoomControls (+ / - / Reset), hides in incompatible modes, and keeps TargetHUD compact on mobile', () => {
    const startDist = camManager.targetDistance;
    const { getByTestId, rerender, queryByTestId, unmount } = render(React.createElement(MobileZoomControls));

    fireEvent.click(getByTestId('mobile-zoom-in-btn'));
    const zoomedIn = camManager.targetDistance;
    expect(zoomedIn).toBeLessThan(startDist);

    fireEvent.click(getByTestId('mobile-zoom-out-btn'));
    expect(camManager.targetDistance).toBeGreaterThan(zoomedIn);

    const focusSpy = vi.spyOn(camManager, 'focusPlanet').mockImplementation(() => {});
    fireEvent.click(getByTestId('mobile-zoom-reset-btn'));
    expect(focusSpy).toHaveBeenCalledWith('earth');
    focusSpy.mockRestore();

    // F3 regression: Reset inside an active Cosmic Lab must reset the Lab camera, not fly to Earth
    useAppStore.setState({ activeCosmicLab: 'nbody_sandbox' });
    rerender(React.createElement(MobileZoomControls));
    const labSpy = vi.spyOn(camManager, 'setCosmicLabMode').mockImplementation(() => {});
    const earthSpy = vi.spyOn(camManager, 'focusPlanet').mockImplementation(() => {});
    fireEvent.click(getByTestId('mobile-zoom-reset-btn'));
    expect(labSpy).toHaveBeenCalledWith('nbody_sandbox');
    expect(earthSpy).not.toHaveBeenCalled();
    labSpy.mockRestore();
    earthSpy.mockRestore();
    useAppStore.setState({ activeCosmicLab: 'none' });

    // Hides cleanly in Cinema, Photo, Tour, and Free Flight modes
    useAppStore.setState({ cinemaMode: true });
    rerender(React.createElement(MobileZoomControls));
    expect(queryByTestId('mobile-zoom-controls')).toBeNull();

    useAppStore.setState({ cinemaMode: false, cameraMode: 'FREE_FLIGHT' });
    rerender(React.createElement(MobileZoomControls));
    expect(queryByTestId('mobile-zoom-controls')).toBeNull();
    unmount();

    // TargetHUD compact mobile sheet height <= 30dvh and 1-tap collapse toggle
    const targetSrc = readSrc('ui/TargetHUD.tsx');
    expect(targetSrc).toContain('max-h-[30dvh]');
    const hud = render(React.createElement(TargetHUD));
    expect(hud.getByTestId('target-hud-collapse-btn')).toBeTruthy();
    hud.unmount();
  });

  it('R1.e performs double-tap quick zoom within 300ms / 28px and ignores slow or distant taps', () => {
    const engine = new TouchOrbitGestureEngine({
      onRotate: (dTheta, dPhi) => camManager.rotateOrbit(dTheta, dPhi),
      onPan: (dx, dy) => camManager.panOrbit(dx, dy),
      onZoom: (deltaRaw) => camManager.zoomOrbit(deltaRaw),
      onReleaseInertia: (vTheta, vPhi) => camManager.setOrbitInertia(vTheta, vPhi),
      onClearInertia: () => camManager.clearOrbitInertia(),
      onDoubleTap: () => camManager.triggerDoubleTapZoom(),
    });

    const startDist = camManager.targetDistance; // 60
    // Fast double-tap (180ms apart, 6px apart)
    engine.onPointerDown({ pointerId: 1, pointerType: 'touch', clientX: 200, clientY: 400, button: 0, shiftKey: false }, 100);
    engine.onPointerUp({ pointerId: 1, pointerType: 'touch', clientX: 200, clientY: 400 }, 140);
    engine.onPointerDown({ pointerId: 2, pointerType: 'touch', clientX: 204, clientY: 404, button: 0, shiftKey: false }, 260);
    engine.onPointerUp({ pointerId: 2, pointerType: 'touch', clientX: 204, clientY: 404 }, 290);

    expect(camManager.targetDistance).toBeCloseTo(startDist * 0.55, 1);

    // Double-tap when already near adaptiveMinDistance toggles back out to ~2.2x adaptiveMinDistance
    const minDist = camManager.getAdaptiveMinDistance();
    camManager.targetDistance = minDist * 1.1;
    camManager.targetSpherical.radius = camManager.targetDistance;
    engine.onPointerDown({ pointerId: 3, pointerType: 'touch', clientX: 200, clientY: 400, button: 0, shiftKey: false }, 1000);
    engine.onPointerUp({ pointerId: 3, pointerType: 'touch', clientX: 200, clientY: 400 }, 1030);
    engine.onPointerDown({ pointerId: 4, pointerType: 'touch', clientX: 202, clientY: 402, button: 0, shiftKey: false }, 1150);
    engine.onPointerUp({ pointerId: 4, pointerType: 'touch', clientX: 202, clientY: 402 }, 1180);

    expect(camManager.targetDistance).toBeCloseTo(minDist * 2.2, 1);

    // Slow taps (>300ms) must NOT trigger zoom
    const beforeSlow = camManager.targetDistance;
    engine.onPointerDown({ pointerId: 5, pointerType: 'touch', clientX: 200, clientY: 400, button: 0, shiftKey: false }, 2000);
    engine.onPointerUp({ pointerId: 5, pointerType: 'touch', clientX: 200, clientY: 400 }, 2030);
    engine.onPointerDown({ pointerId: 6, pointerType: 'touch', clientX: 200, clientY: 400, button: 0, shiftKey: false }, 2500);
    engine.onPointerUp({ pointerId: 6, pointerType: 'touch', clientX: 200, clientY: 400 }, 2530);
    expect(camManager.targetDistance).toBe(beforeSlow);
  });

  it('M2/M3/M5 regressions: fast horizontal touch swipe never wraps backward, hold-pause-micro-move produces zero fling, and MobileZoomControls cancels hold interval on hide', () => {
    // M2: Fast horizontal touch swipe accumulating > PI rad must stay monotonic in theta
    camManager.spherical.theta = 0;
    camManager.targetSpherical.theta = 0;
    let prevTheta = camManager.spherical.theta;
    for (let i = 0; i < 6; i++) {
      camManager.rotateOrbit(110 * 0.0095, 0); // > 1.0 rad per frame
      camManager.updateOrbit(0.016);
      expect(camManager.spherical.theta).toBeLessThan(prevTheta);
      prevTheta = camManager.spherical.theta;
    }

    // M5: Fast swipe -> hold still >= 250ms -> 1px thumb tremor -> release must emit zero inertia fling
    const onInertia = vi.fn();
    const engine = new TouchOrbitGestureEngine({
      onRotate: () => {},
      onPan: () => {},
      onZoom: () => {},
      onReleaseInertia: onInertia,
      onClearInertia: () => {},
      onDoubleTap: () => {},
    });
    engine.onPointerDown({ pointerId: 10, pointerType: 'touch', clientX: 100, clientY: 200, button: 0, shiftKey: false }, 0);
    engine.onPointerMove({ pointerId: 10, pointerType: 'touch', clientX: 220, clientY: 200 }, 16);
    // Pause finger for 320ms, then tiny 0.5px tremor, then lift 10ms later
    engine.onPointerMove({ pointerId: 10, pointerType: 'touch', clientX: 220.5, clientY: 200 }, 336);
    engine.onPointerUp({ pointerId: 10, pointerType: 'touch', clientX: 220.5, clientY: 200 }, 346);
    expect(onInertia).not.toHaveBeenCalled();

    // M3: Holding + when cinemaMode hides MobileZoomControls must cancel timer and not keep zooming
    vi.useFakeTimers();
    try {
      const { getByTestId, rerender, unmount } = render(React.createElement(MobileZoomControls));
      fireEvent.pointerDown(getByTestId('mobile-zoom-in-btn'));
      useAppStore.setState({ cinemaMode: true });
      rerender(React.createElement(MobileZoomControls));
      const distAfterHide = camManager.targetDistance;
      vi.advanceTimersByTime(600);
      expect(camManager.targetDistance).toBe(distAfterHide);
      unmount();
    } finally {
      useAppStore.setState({ cinemaMode: false });
      vi.useRealTimers();
    }
  });
});
