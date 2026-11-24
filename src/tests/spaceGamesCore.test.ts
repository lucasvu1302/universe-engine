import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import * as THREE from 'three';

import { useAppStore, SPACE_GAMES_STORAGE_KEY } from '@/stores/useAppStore';
import { ModeOrchestrator } from '@/engine/navigation/ModeOrchestrator';
import { CameraManager } from '@/engine/camera/CameraManager';
import { AudioManager } from '@/engine/audio/AudioManager';
import {
  buildAstronautRig,
  buildMiniTarsRig,
  buildSpaceMechRig,
  buildAlienDroneRig,
  buildBossTitanRig,
  disposeObjectTree,
} from '@/scenes/SpaceGames/shared/CharacterModels';
import { createHudThrottle } from '@/scenes/SpaceGames/shared/gameHudThrottle';
import { createGameChannel } from '@/scenes/SpaceGames/shared/gameRuntimeBus';
import { MobileGameControls } from '@/ui/SpaceGames/MobileGameControls';

describe('Space Game Hub Core, Persistence, Audio, Character Rigs & Mobile Gamepad (SPEC-UNIV-2026-11-24-001 T2)', () => {
  beforeEach(() => {
    localStorage.clear();
    const cam = CameraManager.getInstance();
    const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 80000);
    cam.setCamera(camera);
    cam.state = 'ORBIT';
    cam.activeScenario = 'none';
    useAppStore.getState().resetGameProgress();
    ModeOrchestrator.getInstance().exitAllModes();
  });

  it('R2.a enforces exclusive mode isolation on enterSpaceGame and cleanly restores Solar System on exitSpaceGame', () => {
    const orchestrator = ModeOrchestrator.getInstance();
    const cam = CameraManager.getInstance();

    // Open conflicting modes & panels first
    useAppStore.setState({
      activeCosmicLab: 'nbody_sandbox',
      isSandboxOpen: true,
      isTarsOpen: true,
      gameHubOpen: true,
    });

    orchestrator.enterSpaceGame('astro_survivor');
    const st = useAppStore.getState();
    expect(st.activeSpaceGame).toBe('astro_survivor');
    expect(st.activeCosmicLab).toBe('none');
    expect(st.activeSurface).toBe('none');
    expect(st.activeEventSurfaceId).toBeNull();
    expect(st.isSandboxOpen).toBe(false);
    expect(st.isTarsOpen).toBe(false);
    expect(st.gameHubOpen).toBe(false);
    expect(st.recentExperiences[0]).toBe('game_astro_survivor');

    // Orbit update must yield while a Space Game owns the camera
    const posBefore = cam.camera!.position.clone();
    cam.targetSpherical.theta += 1.2;
    cam.updateOrbit(0.016);
    expect(cam.camera!.position.distanceTo(posBefore)).toBe(0);

    // Exiting restores activeSpaceGame='none', fov=50, camera.up=(0,1,0)
    cam.camera!.fov = 65;
    cam.camera!.up.set(0, 0, 1);
    orchestrator.exitSpaceGame();
    expect(useAppStore.getState().activeSpaceGame).toBe('none');
    expect(cam.camera!.fov).toBe(50);
    expect(cam.camera!.up.y).toBeCloseTo(1, 3);
  });

  it('R2.b (neg) recovers safely from corrupted localStorage JSON and runs all 7 offline game SFX safely when muted', () => {
    localStorage.setItem(SPACE_GAMES_STORAGE_KEY, '{invalid-json!!!');
    const loaded = useAppStore.getState().loadSpaceGamesProgress();
    expect(loaded.survivorBestScore).toBe(0);
    expect(loaded.mechUpgrades.armor).toBe(1);
    expect(loaded.minerUpgrades.turrets).toBe(0);

    // Persistent result & upgrade storage round-trip
    useAppStore.getState().recordGameResult('astro_survivor', { score: 1250, wave: 4 });
    useAppStore.getState().recordGameResult('mech_arena', { creditsEarned: 220, wave: 2 });
    const bought = useAppStore.getState().purchaseMechUpgrade('armor');
    expect(bought).toBe(true);
    expect(useAppStore.getState().gameProgress.mechUpgrades.armor).toBe(2);
    expect(useAppStore.getState().gameProgress.mechCredits).toBeLessThan(220);

    useAppStore.getState().recordGameResult('exo_miner', { creditsEarned: 300, score: 450 });
    const boughtTurret = useAppStore.getState().purchaseMinerUpgrade('turrets');
    expect(boughtTurret).toBe(true);
    expect(useAppStore.getState().gameProgress.minerUpgrades.turrets).toBe(1);

    // Reload from localStorage keeps progress intact
    const reloaded = useAppStore.getState().loadSpaceGamesProgress();
    expect(reloaded.survivorBestScore).toBe(1250);
    expect(reloaded.mechUpgrades.armor).toBe(2);
    expect(reloaded.minerUpgrades.turrets).toBe(1);

    // 7 offline game SFX methods execute safely with soundEnabled=false
    useAppStore.setState({ soundEnabled: false });
    const audio = AudioManager.getInstance();
    expect(() => {
      audio.playLaserShot();
      audio.playExplosion();
      audio.playLevelUp();
      audio.playDashBoost();
      audio.playHitDamage();
      audio.playCorePickup();
      audio.playVictoryFanfare();
    }).not.toThrow();
  });

  it('INV2 builds articulated 3D character rigs with zero dynamic lights and cleanly disposes local GPU trees', () => {
    const astro = buildAstronautRig('#38bdf8');
    const tars = buildMiniTarsRig();
    const mech = buildSpaceMechRig('cobalt');
    const alien = buildAlienDroneRig('#ef4444');
    const boss = buildBossTitanRig();

    expect(astro.leftLeg).toBeInstanceOf(THREE.Object3D);
    expect(astro.rightLeg).toBeInstanceOf(THREE.Object3D);
    expect(astro.jetpackFlame).toBeInstanceOf(THREE.Object3D);
    expect(mech.torso).toBeInstanceOf(THREE.Object3D);
    expect(mech.leftArm).toBeInstanceOf(THREE.Object3D);
    expect(mech.rightArm).toBeInstanceOf(THREE.Object3D);

    // Ensure zero PointLight or SpotLight inside any rig
    const allRigs = [astro.root, tars.root, mech.root, alien.root, boss.root];
    for (const rig of allRigs) {
      let hasDynamicLight = false;
      rig.traverse((obj) => {
        if (obj instanceof THREE.PointLight || obj instanceof THREE.SpotLight) {
          hasDynamicLight = true;
        }
      });
      expect(hasDynamicLight).toBe(false);
    }

    const geoDisposeSpy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const matDisposeSpy = vi.spyOn(THREE.Material.prototype, 'dispose');
    for (const rig of allRigs) {
      disposeObjectTree(rig);
    }
    expect(geoDisposeSpy.mock.calls.length).toBeGreaterThan(10);
    expect(matDisposeSpy.mock.calls.length).toBeGreaterThan(5);
    geoDisposeSpy.mockRestore();
    matDisposeSpy.mockRestore();
  });

  it('INV3 caps 60 FPS HUD telemetry sync to <= 15 Hz while passing discrete forced events immediately', () => {
    const emitSpy = vi.fn();
    const throttle = createHudThrottle(67);
    let now = 1000;
    for (let f = 0; f < 60; f++) {
      now += 16.666;
      throttle.maybeEmit(now, () => emitSpy(f));
    }
    expect(emitSpy.mock.calls.length).toBeLessThanOrEqual(15);
    expect(emitSpy.mock.calls.length).toBeGreaterThanOrEqual(10);

    // Forced discrete event emits immediately regardless of interval
    const beforeForce = emitSpy.mock.calls.length;
    throttle.forceEmit(now + 1, () => emitSpy('level_up'));
    expect(emitSpy.mock.calls.length).toBe(beforeForce + 1);

    // Buffered lazy-scene commands flush immediately when the 3D scene subscribes
    const ch = createGameChannel<{ val: number }, { type: string }>({ val: 0 });
    ch.dispatchCommand({ type: 'switch_enceladus' });
    const received: string[] = [];
    const unsub = ch.subscribeCommand((cmd) => received.push(cmd.type));
    expect(received).toEqual(['switch_enceladus']);
    unsub();
  });

  it('R2 renders MobileGameControls virtual thumbstick & action buttons with clean touch press/release callbacks', () => {
    const onMove = vi.fn();
    const onDash = vi.fn();
    const { getByTestId, unmount } = render(
      React.createElement(MobileGameControls, {
        onMove,
        actions: [
          { id: 'dash', label: 'DASH', color: 'cyan', onPressChange: onDash },
        ],
      })
    );

    const dashBtn = getByTestId('mobile-game-action-dash');
    fireEvent.pointerDown(dashBtn, { pointerId: 1 });
    expect(onDash).toHaveBeenCalledWith(true);
    fireEvent.pointerUp(dashBtn, { pointerId: 1 });
    expect(onDash).toHaveBeenCalledWith(false);
    expect(getByTestId('mobile-game-joystick')).toBeTruthy();
    unmount();

    // G4/G5/G9 regressions: GameChannel.reset clears stale snapshots & queued commands; enterSpaceGame clears scaleExplorer; disabled resets held buttons
    const ch = createGameChannel<{ phase: string }, { type: string }>({ phase: 'playing' });
    ch.publishSnapshot({ phase: 'game_over' });
    ch.dispatchCommand({ type: 'stale_cmd' });
    ch.reset({ phase: 'playing' });
    expect(ch.getSnapshot().phase).toBe('playing');
    const cmdSpy = vi.fn();
    const unsubCmd = ch.subscribeCommand(cmdSpy);
    expect(cmdSpy).not.toHaveBeenCalled();
    unsubCmd();

    useAppStore.setState({ scaleExplorer: true });
    CameraManager.getInstance().velocity.set(12, 3, -8);
    ModeOrchestrator.getInstance().enterSpaceGame('astro_survivor');
    expect(useAppStore.getState().scaleExplorer).toBe(false);
    expect(CameraManager.getInstance().velocity.length()).toBe(0);
    ModeOrchestrator.getInstance().exitSpaceGame();

    const onHold = vi.fn();
    const g9 = render(
      React.createElement(MobileGameControls, {
        onMove,
        disabled: false,
        actions: [{ id: 'fire', label: 'FIRE', color: 'rose', onPressChange: onHold }],
      })
    );
    fireEvent.pointerDown(g9.getByTestId('mobile-game-action-fire'), { pointerId: 7 });
    expect(onHold).toHaveBeenLastCalledWith(true);
    g9.rerender(
      React.createElement(MobileGameControls, {
        onMove,
        disabled: true,
        actions: [{ id: 'fire', label: 'FIRE', color: 'rose', onPressChange: onHold }],
      })
    );
    expect(onHold).toHaveBeenLastCalledWith(false);
    g9.unmount();
  });
});
