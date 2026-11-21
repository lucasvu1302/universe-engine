import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { CameraManager } from '@/engine/camera/CameraManager';
import { SimulationClock } from '@/engine/simulation/SimulationClock';
import { InputManager } from '@/engine/input/InputManager';
import { useAppStore } from '@/stores/useAppStore';
import { SimulationManager } from '@/simulation/core/SimulationManager';
import { LaunchController } from '@/simulation/launch/LaunchController';
import { CameraDirector } from '@/simulation/camera/CameraDirector';
import { FlightHUD } from '@/ui/FlightHUD';

const SRC_ROOT = path.resolve(__dirname, '..');

function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relPath), 'utf8');
}

describe('Spacecraft Frame Sync & Zero-Jitter Smoothness (SPEC-LUNGTUNG-2026-11-18-004)', () => {
  beforeEach(() => {
    const cam = CameraManager.getInstance();
    const perspective = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 80000);
    perspective.position.set(110, 35, 95);
    cam.setCamera(perspective);
    SimulationClock.getInstance().reset();
    SimulationClock.getInstance().setPaused(false);
    SimulationClock.getInstance().setTimeScale(1.0);
    useAppStore.getState().setCameraMode('ORBIT');
    useAppStore.getState().setTargetId('earth');
  });

  describe('R1: Launch Simulation Pre-Mesh Frame Priority, CoM-Locked Chase Camera & Clamped Timeline Delta', () => {
    it('R1.a locks FOLLOW & COCKPIT cameras to the rocket frame without world-lag rubber-banding, orders LaunchScene before child meshes, and auto-plays launch', () => {
      const launchSceneSrc = readSrc('simulation/launch/LaunchScene.tsx');
      // LaunchScene must run its trajectory/camera update at negative priority (-1) BEFORE child RocketModel/CockpitInterior useFrame(0)
      expect(launchSceneSrc).toMatch(/useFrame\s*\([\s\S]*?,\s*-1\s*\)/);

      // Starting earth_launch scenario auto-plays smoothly without sitting frozen at T+00:00
      const simMgr = SimulationManager.getInstance();
      simMgr.exitScenario();
      simMgr.startScenario('earth_launch');
      expect(simMgr.getTimelineEngine().getIsPlaying()).toBe(true);
      simMgr.exitScenario();

      // Verify COCKPIT camera stays locked to pilot eye-point [0, 8.05, -0.05] with zero cabin-detaching shake offset during MAX_Q
      const cam = CameraManager.getInstance().camera!;
      const launchCtrl = LaunchController.getInstance();
      const director = CameraDirector.getInstance();

      const trajMaxQ = launchCtrl.evaluateAtTime(72);
      director.setMode('COCKPIT');
      director.update(0.016);
      const expectedCockpitWorld = new THREE.Vector3(0, 8.05, -0.05)
        .applyQuaternion(trajMaxQ.quaternion)
        .add(trajMaxQ.position);
      expect(cam.position.distanceTo(expectedCockpitWorld)).toBeLessThan(1e-4);

      // Verify WINDOW camera also locks 1:1 to starboard porthole [0.42, 8.04, -0.22] with zero cabin-detaching shake
      director.setMode('WINDOW');
      director.triggerShake(1.0, 1.0);
      director.update(0.016);
      const expectedWindowWorld = new THREE.Vector3(0.42, 8.04, -0.22)
        .applyQuaternion(trajMaxQ.quaternion)
        .add(trajMaxQ.position);
      expect(cam.position.distanceTo(expectedWindowWorld)).toBeLessThan(1e-4);
      director.resetForLaunch();

      // Verify FOLLOW chase camera maintains consistent rocket-relative distance across variable FPS (120Hz 8ms vs 30Hz 33ms) without lagging meters behind
      director.setMode('FOLLOW');
      let t = 180.0;
      launchCtrl.evaluateAtTime(t);
      director.update(0.016);
      const baseDist = cam.position.distanceTo(launchCtrl.getTrajectoryState().position);

      const variableDts = [0.008, 0.033, 0.011, 0.028, 0.008, 0.032];
      for (const dt of variableDts) {
        t += dt;
        const st = launchCtrl.evaluateAtTime(t);
        director.update(dt);
        const curDist = cam.position.distanceTo(st.position);
        expect(Math.abs(curDist - baseDist)).toBeLessThan(0.15);
      }

      // Verify re-entering earth_launch resets FOLLOW attitude cleanly (no stale orbital quaternion carry-over)
      simMgr.exitScenario();
      simMgr.startScenario('earth_launch');
      const padTraj = launchCtrl.evaluateAtTime(0);
      director.update(0.016);
      const expectedPadFollow = new THREE.Vector3(24.0, 5.5, -42.0)
        .applyQuaternion(padTraj.quaternion)
        .add(padTraj.position);
      expect(cam.position.distanceTo(expectedPadFollow)).toBeLessThan(0.05);
      simMgr.exitScenario();

      // Verify smooth C1 downrange velocity across step boundary T=100s (no abrupt jump or reversal)
      const z998 = launchCtrl.evaluateAtTime(99.8).position.z;
      const z1000 = launchCtrl.evaluateAtTime(100.0).position.z;
      const z1002 = launchCtrl.evaluateAtTime(100.2).position.z;
      const vBefore = (z1000 - z998) / 0.2;
      const vAfter = (z1002 - z1000) / 0.2;
      expect(vBefore).toBeGreaterThan(0);
      expect(Math.abs(vAfter - vBefore) / vBefore).toBeLessThan(0.15);

      // Verify zero low-altitude atmosphere halo pop, zero Earth globe terrain pop, deterministic pad arms, and localized MFD phase
      const atmoFrag = readSrc('shaders/atmosphere/atmosphere.frag.glsl');
      expect(atmoFrag).toContain('clamp(uOpacity, 0.0, 1.0)');
      expect(atmoFrag).not.toContain('uOpacity > 0.0 ? uOpacity : 1.0');
      expect(launchSceneSrc).not.toContain('altKm > 2.2');
      const padSrc = readSrc('simulation/launch/LaunchPadModel.tsx');
      expect(padSrc).toContain('smoothstep(traj.timeSeconds');
      const mfdSrc = readSrc('simulation/launch/CockpitDisplays.ts');
      expect(mfdSrc).toContain('LAUNCH_PHASE_LABELS');
      expect(mfdSrc).not.toContain('t.currentStep.phase.toUpperCase()');
    });

    it('R1.b (neg) clamps SimulationManager frame spikes (e.g. 250ms hitch) to <= 0.05s to prevent rocket teleportation', () => {
      const simMgr = SimulationManager.getInstance();
      simMgr.exitScenario();
      simMgr.startScenario('earth_launch');
      simMgr.getTimelineEngine().seek(20);
      simMgr.update(0.25); // 250ms main-thread stall
      expect(simMgr.getTimelineEngine().getCurrentTime()).toBeLessThanOrEqual(20.0501);
      simMgr.exitScenario();
    });
  });

  describe('R2 & R3: Unified In-Frame FlyTo Stepper, 3D Inclined ISS Co-Rotation & Damped Zero-Roll Free Flight', () => {
    it('R2.a co-rotates ISS camera in 3D along its 51.6° orbital plane with constant Earth altitude and evaluates live Earth position in ISS/JWST', () => {
      const issSrc = readSrc('entities/Spacecraft/ISSCupola.tsx');
      const jwstSrc = readSrc('entities/Spacecraft/JWST.tsx');
      expect(issSrc).toContain('getLiveBodyPosition');
      expect(jwstSrc).toContain('getLiveBodyPosition');

      const camMgr = CameraManager.getInstance() as unknown as Record<string, unknown>;
      expect(typeof camMgr.updateTransition).toBe('function');

      // Fly to ISS using in-frame updateTransition(delta) while clock advances
      CameraManager.getInstance().focusPlanet('iss');
      for (let i = 0; i < 130; i++) {
        SimulationClock.getInstance().simulationTime += 0.016;
        (camMgr.updateTransition as (dt: number) => void).call(CameraManager.getInstance(), 0.016);
      }
      expect(CameraManager.getInstance().state).toBe('ORBIT');

      // Track ISS across an entire 28.5s 51.6°-inclined LEO revolution: camera distance to Earth's center & pole clearance stay rock-steady!
      const earthDistances: number[] = [];
      let minPhi = Math.PI;
      let maxPhi = 0;
      for (let step = 0; step < 180; step++) {
        SimulationClock.getInstance().simulationTime += 0.16; // 180 * 0.16s = 28.8s (> 1 full ISS orbit)
        CameraManager.getInstance().updateOrbit(0.016);
        const earthPos = CameraManager.getInstance().getLiveBodyPosition('earth', new THREE.Vector3());
        earthDistances.push(CameraManager.getInstance().camera!.position.distanceTo(earthPos));
        minPhi = Math.min(minPhi, CameraManager.getInstance().spherical.phi);
        maxPhi = Math.max(maxPhi, CameraManager.getInstance().spherical.phi);
      }
      const minR = Math.min(...earthDistances);
      const maxR = Math.max(...earthDistances);
      expect(maxR - minR).toBeLessThan(0.08);
      // Camera polar angle stays safely away from gimbal poles (> 20°) across the entire 51.6° orbit
      expect(minPhi).toBeGreaterThan(0.35);
      expect(maxPhi).toBeLessThan(Math.PI - 0.35);

      // Track JWST through in-frame updateTransition + Earth-azimuth L2 co-rotation (camera stays locked on JWST and >= 60° clear of Earth)
      CameraManager.getInstance().focusPlanet('jwst');
      for (let i = 0; i < 130 && CameraManager.getInstance().state === 'TRANSITIONING'; i++) {
        SimulationClock.getInstance().simulationTime += 0.016;
        (camMgr.updateTransition as (dt: number) => void).call(CameraManager.getInstance(), 0.016);
      }
      expect(CameraManager.getInstance().state).toBe('ORBIT');
      const jwstBaseDist = CameraManager.getInstance().camera!.position.distanceTo(
        CameraManager.getInstance().getLiveBodyPosition('jwst', new THREE.Vector3())
      );
      expect(Math.abs(jwstBaseDist - 0.43)).toBeLessThan(0.02);
      for (let step = 0; step < 60; step++) {
        SimulationClock.getInstance().simulationTime += 0.12;
        CameraManager.getInstance().updateOrbit(0.016);
      }
      const jwstLivePos = CameraManager.getInstance().getLiveBodyPosition('jwst', new THREE.Vector3());
      const earthLivePos = CameraManager.getInstance().getLiveBodyPosition('earth', new THREE.Vector3());
      const camPosJwst = CameraManager.getInstance().camera!.position;
      expect(Math.abs(camPosJwst.distanceTo(jwstLivePos) - jwstBaseDist)).toBeLessThan(0.05);
      const lookVec = jwstLivePos.clone().sub(camPosJwst).normalize();
      const toEarthVec = earthLivePos.clone().sub(jwstLivePos).normalize();
      expect(lookVec.angleTo(toEarthVec)).toBeGreaterThan(THREE.MathUtils.degToRad(60));

      // CameraController runs at priority -1, yields during cinemaMode, and resets deltas outside FREE_FLIGHT
      const camCtrlSrc = readSrc('engine/camera/CameraController.tsx');
      expect(camCtrlSrc).toMatch(/useFrame\s*\([\s\S]*?,\s*-1\s*\)/);
      expect(camCtrlSrc).toContain('cinemaMode');
      expect(camCtrlSrc).toContain('flightKeysRef');

      // CinematicDirector uses frame-rate-independent exponential damping
      const cineSrc = readSrc('engine/camera/CinematicDirector.ts');
      expect(cineSrc).toContain('Math.exp(');

      // Earth LEO micro-detail shaders skip FBM completely when leoDetail <= 0.01 (zero GPU stall in LaunchScene)
      const earthFrag = readSrc('shaders/earth/earthGround.frag.glsl');
      const planetSrc = readSrc('entities/Planet/Planet.tsx');
      expect(earthFrag).toContain('if (leoDetail > 0.01)');
      expect(planetSrc).toContain('if (leoDetail > 0.01)');
    });

    it('R2.b (neg) eliminates asynchronous dual-rAF gsap.timeline camera mutations and origin-skewed flyTo detours in CameraManager', () => {
      const camSrc = readSrc('engine/camera/CameraManager.ts');
      expect(camSrc).not.toContain('gsap.timeline');
      expect(camSrc).not.toContain('midPoint.z * 0.12');
    });

    it('R3.a damps FREE_FLIGHT mouse look smoothly with zero horizon roll, clamps 250ms hitches, ignores UI drags, and deduplicates FlightHUD updates', () => {
      const camMgr = CameraManager.getInstance();
      const cam = camMgr.camera!;
      // Inject tilted roll before entering FREE_FLIGHT
      cam.quaternion.setFromEuler(new THREE.Euler(0.1, 0.4, 0.35, 'YXZ'));
      camMgr.state = 'FREE_FLIGHT';
      camMgr.velocity.set(0, 0, 0);

      // Step 1 with a 40px horizontal drag: damped rotation must apply a smooth fraction on frame 1 (not an instant 100% snap) and zero out roll
      camMgr.updateFreeFlight(0.016, {}, 40, 0);
      const e1 = new THREE.Euler().setFromQuaternion(cam.quaternion, 'YXZ');
      expect(Math.abs(e1.z)).toBeLessThan(1e-5);
      const yawAfterFrame1 = e1.y;

      // Subsequent zero-input frames continue smooth exponential convergence toward target yaw
      camMgr.updateFreeFlight(0.016, {}, 0, 0);
      const e2 = new THREE.Euler().setFromQuaternion(cam.quaternion, 'YXZ');
      expect(Math.abs(e2.y - yawAfterFrame1)).toBeGreaterThan(0.001);
      expect(Math.abs(e2.z)).toBeLessThan(1e-5);

      // 250ms hitch clamp & NaN safety in updateFreeFlight (must integrate <= 0.05s step, never teleport 5x!)
      camMgr.velocity.set(0, 0, 0);
      const posBeforeHitch = cam.position.clone();
      camMgr.updateFreeFlight(0.25, { forward: true, boost: true }, 0, 0);
      const hitchStepDist = cam.position.distanceTo(posBeforeHitch);
      expect(hitchStepDist).toBeGreaterThan(0);
      expect(hitchStepDist).toBeLessThan(0.5); // 0.05s * (acceleration 60 * 0.05s = 3) = ~0.15u, never 250ms teleport!

      const posBeforeBadDt = cam.position.clone();
      camMgr.updateFreeFlight(Number.NaN, { forward: true }, 0, 0);
      camMgr.updateFreeFlight(-0.1, { forward: true }, 0, 0);
      expect(Number.isFinite(cam.position.x)).toBe(true);
      expect(cam.position.distanceTo(posBeforeBadDt)).toBe(0);

      // InputManager pointerdown -> pointermove uses clean clientX/Y delta on canvas and ignores UI button drags
      const input = InputManager.getInstance();
      input.resetDeltas();

      const uiBtn = document.createElement('button');
      document.body.appendChild(uiBtn);
      uiBtn.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 100 }));
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 260, clientY: 180 }));
      window.dispatchEvent(new MouseEvent('pointerup'));
      expect(input.deltaX).toBe(0);
      expect(input.deltaY).toBe(0);
      uiBtn.remove();

      const canvasEl = document.createElement('canvas');
      document.body.appendChild(canvasEl);
      canvasEl.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 500, clientY: 300 }));
      const moveEv = new MouseEvent('pointermove', { clientX: 512, clientY: 294 });
      Object.defineProperty(moveEv, 'movementX', { value: 480 }); // Bogus OS jump spike
      Object.defineProperty(moveEv, 'movementY', { value: -320 });
      window.dispatchEvent(moveEv);
      window.dispatchEvent(new MouseEvent('pointerup'));
      expect(input.deltaX).toBe(12);
      expect(input.deltaY).toBe(-6);
      canvasEl.remove();

      // Standalone Control/Alt precision flight key registers cleanly while Ctrl+K browser shortcut is ignored
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control', code: 'ControlLeft', ctrlKey: true }));
      expect(input.isKeyPressed('Control')).toBe(true);
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control', code: 'ControlLeft', ctrlKey: false }));
      expect(input.isKeyPressed('Control')).toBe(false);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', code: 'KeyK', ctrlKey: true }));
      expect(input.isKeyPressed('k')).toBe(false);
      input.resetDeltas();

      // FlightHUD hides SolarRadarHUD/TimeControls in App.tsx, displays live non-zero Sun range, and deduplicates rounded velocity renders
      const appSrc = readSrc('App.tsx');
      expect(appSrc).toMatch(/cameraMode !== 'FREE_FLIGHT'[\s\S]*?<SolarRadarHUD/);
      expect(appSrc).toMatch(/cameraMode !== 'FREE_FLIGHT'[\s\S]*?<TimeControls/);

      vi.useFakeTimers();
      try {
        useAppStore.getState().setTargetId('sun');
        useAppStore.getState().setCameraMode('FREE_FLIGHT');
        camMgr.velocity.set(12.34, 0, 0);
        const { container, unmount } = render(React.createElement(FlightHUD));
        expect(container.textContent).toContain('12.3');
        expect(container.textContent).not.toContain('0.0M KM');
        expect(container.textContent).toMatch(/AU\)/);

        // Micro velocity change inside same 0.1 bucket (12.34 -> 12.32) produces identical rendered readout
        camMgr.velocity.set(12.32, 0, 0);
        act(() => {
          vi.advanceTimersByTime(150);
        });
        expect(container.textContent).toContain('12.3');

        // Meaningful velocity change (12.32 -> 14.8) updates readout cleanly
        camMgr.velocity.set(14.8, 0, 0);
        act(() => {
          vi.advanceTimersByTime(150);
        });
        expect(container.textContent).toContain('14.8');
        unmount();
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
