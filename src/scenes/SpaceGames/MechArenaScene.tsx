import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import { InputManager } from '@/engine/input/InputManager';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useAppStore } from '@/stores/useAppStore';
import {
  animateHumanoidRun,
  buildBossTitanRig,
  buildSpaceMechRig,
  disposeObjectTree,
  NOOP_RAYCAST,
} from '@/scenes/SpaceGames/shared/CharacterModels';
import { createHudThrottle } from '@/scenes/SpaceGames/shared/gameHudThrottle';
import {
  createPlanetaryArenaTexture,
  SpaceGameStarfield,
} from '@/scenes/SpaceGames/shared/SpaceGameBackdrop';
import {
  ARENA_PILLARS,
  createMechArenaState,
  mechArenaChannel,
  snapshotMechArena,
  stepMechArena,
  type MechArenaState,
} from '@/scenes/SpaceGames/engines/mechArenaEngine';

const MAX_PROJ = 48;
const MAX_ENEMY_MECHS = 8;
const dummyObj = new THREE.Object3D();

export const MechArenaScene: React.FC = () => {
  const { camera } = useThree();
  const mechPaint = useAppStore((s) => s.gameProgress.mechPaint);
  const mechUpgrades = useAppStore((s) => s.gameProgress.mechUpgrades);

  const stateRef = useRef<MechArenaState>(createMechArenaState(mechUpgrades));
  const throttleRef = useRef(createHudThrottle(67));
  const mouseLeftRef = useRef(false);
  const mouseRightRef = useRef(false);
  const leftPointerIdRef = useRef<number | null>(null);
  const rightPointerIdRef = useRef<number | null>(null);
  const committedCreditsRef = useRef(0);
  const pausedRef = useRef(false);
  const recordedRef = useRef(false);

  const playerRig = useMemo(() => buildSpaceMechRig(mechPaint), [mechPaint]);
  const bossRig = useMemo(() => buildBossTitanRig(), []);
  const enemyPool = useMemo(
    () => Array.from({ length: MAX_ENEMY_MECHS }, () => buildSpaceMechRig('obsidian')),
    []
  );

  const projInstRef = useRef<THREE.InstancedMesh>(null);
  const telegraphInstRef = useRef<THREE.InstancedMesh>(null);
  const railBeamRef = useRef<THREE.Mesh>(null);

  const localRes = useMemo(() => {
    const projGeo = new THREE.SphereGeometry(0.32, 8, 8);
    const projMat = new THREE.MeshBasicMaterial({ color: '#38bdf8' });
    const teleGeo = new THREE.RingGeometry(0.76, 1.0, 32);
    teleGeo.rotateX(-Math.PI / 2);
    const teleMat = new THREE.MeshBasicMaterial({
      color: '#ef4444',
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const beamGeo = new THREE.CylinderGeometry(0.24, 0.24, 1.0, 8);
    beamGeo.rotateX(Math.PI / 2);
    const beamMat = new THREE.MeshBasicMaterial({
      color: '#22d3ee',
      transparent: true,
      opacity: 0.9,
    });
    const arenaFloorGeo = new THREE.CylinderGeometry(24, 26, 1.4, 48);
    const rimGeo = new THREE.TorusGeometry(23.5, 0.35, 10, 48);
    rimGeo.rotateX(Math.PI / 2);
    const pillarGeo = new THREE.BoxGeometry(2.2, 3.8, 2.2);
    return { projGeo, projMat, teleGeo, teleMat, beamGeo, beamMat, arenaFloorGeo, rimGeo, pillarGeo };
  }, []);

  // Cleanup playerRig when paint changes or on unmount
  useEffect(() => {
    return () => {
      disposeObjectTree(playerRig.root);
    };
  }, [playerRig]);

  useEffect(() => {
    const snapCameraToPlayer = () => {
      const p = stateRef.current.player;
      camera.position.set(p.x * 0.65, 12.2, p.z + 20.5);
      camera.lookAt(p.x * 0.75, 2.4, p.z - 6.0);
    };

    mechArenaChannel.resetTouch();
    snapCameraToPlayer();
    mechArenaChannel.publishSnapshot(snapshotMechArena(stateRef.current));

    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement | null)?.tagName !== 'CANVAS') return;
      if (e.button === 2) {
        rightPointerIdRef.current = e.pointerId;
        mouseRightRef.current = true;
      } else if (e.pointerType !== 'mouse' || e.button === 0) {
        leftPointerIdRef.current = e.pointerId;
        mouseLeftRef.current = true;
      }
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        if (e.button === 2) {
          rightPointerIdRef.current = null;
          mouseRightRef.current = false;
        } else if (e.button === 0) {
          leftPointerIdRef.current = null;
          mouseLeftRef.current = false;
        }
      } else {
        if (rightPointerIdRef.current === e.pointerId) {
          rightPointerIdRef.current = null;
          mouseRightRef.current = false;
        }
        if (leftPointerIdRef.current === e.pointerId) {
          leftPointerIdRef.current = null;
          mouseLeftRef.current = false;
        }
      }
    };
    const clearFire = () => {
      leftPointerIdRef.current = null;
      rightPointerIdRef.current = null;
      mouseLeftRef.current = false;
      mouseRightRef.current = false;
    };
    const onVis = () => {
      if (document.hidden) clearFire();
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', clearFire, true);
    window.addEventListener('blur', clearFire);
    document.addEventListener('visibilitychange', onVis);

    const unsub = mechArenaChannel.subscribeCommand((cmd) => {
      if (cmd.type === 'restart') {
        const upg = useAppStore.getState().gameProgress.mechUpgrades;
        stateRef.current = createMechArenaState(upg);
        recordedRef.current = false;
        committedCreditsRef.current = 0;
        pausedRef.current = false;
        clearFire();
        mechArenaChannel.resetTouch();
        snapCameraToPlayer();
        throttleRef.current.forceEmit(performance.now(), () =>
          mechArenaChannel.publishSnapshot(snapshotMechArena(stateRef.current))
        );
      } else if (cmd.type === 'refresh_upgrades') {
        const upg = useAppStore.getState().gameProgress.mechUpgrades;
        const prevMax = stateRef.current.maxArmor;
        stateRef.current.upgrades = { ...upg };
        const nextMax = 120 + (upg.armor - 1) * 35;
        stateRef.current.maxArmor = nextMax;
        if (stateRef.current.phase === 'playing' && nextMax > prevMax) {
          stateRef.current.armor = Math.min(nextMax, stateRef.current.armor + (nextMax - prevMax));
        }
        throttleRef.current.forceEmit(performance.now(), () =>
          mechArenaChannel.publishSnapshot(snapshotMechArena(stateRef.current))
        );
      } else if (cmd.type === 'set_paused') {
        pausedRef.current = cmd.paused;
        if (cmd.paused) {
          clearFire();
          mechArenaChannel.resetTouch();
        }
      }
    });

    return () => {
      unsub();
      mechArenaChannel.reset(
        snapshotMechArena(createMechArenaState(useAppStore.getState().gameProgress.mechUpgrades))
      );
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', clearFire, true);
      window.removeEventListener('blur', clearFire);
      document.removeEventListener('visibilitychange', onVis);
      disposeObjectTree(bossRig.root);
      enemyPool.forEach((rig) => disposeObjectTree(rig.root));
      Object.values(localRes).forEach((r) => r.dispose());
    };
  }, [bossRig, enemyPool, localRes, camera]);

  useFrame((_, delta) => {
    const clampedDt = Math.min(Math.max(delta, 0.001), 0.05);
    const st = stateRef.current;
    if (pausedRef.current) return;
    const input = InputManager.getInstance();

    let moveX = mechArenaChannel.touchMove.x;
    let moveZ = mechArenaChannel.touchMove.y;
    if (input.isKeyPressed('w') || input.isKeyPressed('ArrowUp')) moveZ -= 1;
    if (input.isKeyPressed('s') || input.isKeyPressed('ArrowDown')) moveZ += 1;
    if (input.isKeyPressed('a') || input.isKeyPressed('ArrowLeft')) moveX -= 1;
    if (input.isKeyPressed('d') || input.isKeyPressed('ArrowRight')) moveX += 1;

    const firePlasma =
      mouseLeftRef.current ||
      input.isKeyPressed('j') ||
      Boolean(mechArenaChannel.touchActions.fire);
    const fireRailgun =
      mouseRightRef.current ||
      input.isKeyPressed('k') ||
      Boolean(mechArenaChannel.touchActions.rail);
    const boost =
      input.isKeyPressed(' ') ||
      input.isKeyPressed('Space') ||
      input.isKeyPressed('Shift') ||
      Boolean(mechArenaChannel.touchActions.boost);
    const overdrive =
      input.isKeyPressed('q') ||
      input.isKeyPressed('e') ||
      Boolean(mechArenaChannel.touchActions.overdrive);

    const ev = stepMechArena(st, clampedDt, {
      moveX,
      moveZ,
      firePlasma,
      fireRailgun,
      boost,
      overdrive,
    });

    const audio = AudioManager.getInstance();
    if (ev.plasmaFired || ev.railgunFired) audio.playLaserShot();
    if (ev.boosted) audio.playDashBoost();
    if (ev.overdriveStarted) audio.playLevelUp();
    if (ev.enemyKilled) audio.playExplosion();
    if (ev.playerHit) audio.playHitDamage();
    if (ev.victory) audio.playVictoryFanfare();

    // Commit earned Mech Credits incrementally so HUD, Hangar upgrades, and mid-run exits stay 100% consistent (U4)
    if (st.creditsEarned > committedCreditsRef.current) {
      const deltaCredits = st.creditsEarned - committedCreditsRef.current;
      committedCreditsRef.current = st.creditsEarned;
      useAppStore.getState().recordGameResult('mech_arena', {
        creditsEarned: deltaCredits,
        wave: st.wave,
      });
    } else if ((ev.victory || ev.gameOver) && !recordedRef.current) {
      useAppStore.getState().recordGameResult('mech_arena', {
        creditsEarned: 0,
        wave: st.wave,
      });
    }
    if (ev.victory || ev.gameOver) {
      recordedRef.current = true;
      mechArenaChannel.resetTouch();
    }

    // Update Player Mech Rig
    playerRig.root.position.set(st.player.x, 0, st.player.z);
    playerRig.root.rotation.y = st.player.yaw;
    animateHumanoidRun(playerRig, st.elapsedSec * 0.8, st.player.speedNorm, st.boostActiveTimer > 0 || st.overdriveActiveTimer > 0);

    // Update Enemy Mechs & Wave 3 Boss Titan
    const boss = st.enemies.find((e) => e.isBoss);
    bossRig.root.visible = Boolean(boss);
    if (boss) {
      bossRig.root.position.set(boss.x, 0, boss.z);
      bossRig.root.rotation.y = boss.yaw;
      animateHumanoidRun(bossRig, st.elapsedSec * 0.5, 0.7, false);
    }

    let poolIdx = 0;
    for (const e of st.enemies) {
      if (e.isBoss || poolIdx >= MAX_ENEMY_MECHS) continue;
      const rig = enemyPool[poolIdx++];
      rig.root.visible = true;
      rig.root.position.set(e.x, 0, e.z);
      rig.root.rotation.y = e.yaw;
      animateHumanoidRun(rig, st.elapsedSec * 0.75 + e.id, 0.8, false);
    }
    for (let i = poolIdx; i < MAX_ENEMY_MECHS; i++) {
      enemyPool[i].root.visible = false;
    }

    // Projectiles
    if (projInstRef.current) {
      const count = Math.min(st.projectiles.length, MAX_PROJ);
      for (let i = 0; i < count; i++) {
        const p = st.projectiles[i];
        dummyObj.position.set(p.x, 1.85, p.z);
        dummyObj.rotation.set(0, 0, 0);
        dummyObj.scale.setScalar(p.fromPlayer ? 1.0 : 1.3);
        dummyObj.updateMatrix();
        projInstRef.current.setMatrixAt(i, dummyObj.matrix);
      }
      projInstRef.current.count = count;
      projInstRef.current.instanceMatrix.needsUpdate = true;
    }

    // Piercing Railgun Beam flash
    if (railBeamRef.current) {
      const beam = st.railBeams[0];
      if (beam) {
        railBeamRef.current.visible = true;
        const mx = (beam.x1 + beam.x2) * 0.5;
        const mz = (beam.z1 + beam.z2) * 0.5;
        const len = Math.hypot(beam.x2 - beam.x1, beam.z2 - beam.z1);
        railBeamRef.current.position.set(mx, 1.85, mz);
        railBeamRef.current.rotation.y = Math.atan2(beam.x2 - beam.x1, beam.z2 - beam.z1);
        railBeamRef.current.scale.set(1, 1, len);
      } else {
        railBeamRef.current.visible = false;
      }
    }

    // Boss red telegraph rings
    if (telegraphInstRef.current) {
      const count = Math.min(st.telegraphs.length, 8);
      for (let i = 0; i < count; i++) {
        const tg = st.telegraphs[i];
        const pulse = 0.8 + (1 - tg.timer / tg.maxTimer) * 0.25;
        dummyObj.position.set(tg.x, 0.1, tg.z);
        dummyObj.rotation.set(0, 0, 0);
        dummyObj.scale.setScalar(tg.radius * pulse);
        dummyObj.updateMatrix();
        telegraphInstRef.current.setMatrixAt(i, dummyObj.matrix);
      }
      telegraphInstRef.current.count = count;
      telegraphInstRef.current.instanceMatrix.needsUpdate = true;
    }

    // Frame-rate-independent third-person Mech Arena camera framing blue Earth on orbital horizon (M8)
    const camDamp = 1 - Math.exp(-6.5 * clampedDt);
    const cx = st.player.x * 0.65;
    const cy = 12.2;
    const cz = st.player.z + 20.5;
    camera.position.x += (cx - camera.position.x) * camDamp;
    camera.position.y += (cy - camera.position.y) * camDamp;
    camera.position.z += (cz - camera.position.z) * camDamp;
    camera.lookAt(st.player.x * 0.75, 2.4, st.player.z - 6.0);

    const now = performance.now();
    if (ev.victory || ev.gameOver || ev.enemyKilled || ev.overdriveStarted) {
      throttleRef.current.forceEmit(now, () =>
        mechArenaChannel.publishSnapshot(snapshotMechArena(st))
      );
    } else {
      throttleRef.current.maybeEmit(now, () =>
        mechArenaChannel.publishSnapshot(snapshotMechArena(st))
      );
    }
  });

  const floorTex = useMemo(
    () => createPlanetaryArenaTexture('#1e293b', '#0f172a', '#38bdf8', 44),
    []
  );

  useEffect(() => {
    return () => {
      floorTex?.dispose();
    };
  }, [floorTex]);

  return (
    <group>
      <color attach="background" args={['#040814']} />
      <fog attach="fog" args={['#091224', 42, 140]} />
      <ambientLight intensity={0.82} />
      <hemisphereLight args={['#93c5fd', '#1e293b', 0.95]} />
      <directionalLight position={[22, 34, 18]} intensity={2.45} color="#f8fafc" />
      <SpaceGameStarfield tintHex="#38bdf8" />

      {/* Circular Lunar Orbital Crater Floor & Glowing Rim */}
      <mesh position={[0, -0.7, 0]} geometry={localRes.arenaFloorGeo} raycast={NOOP_RAYCAST}>
        <meshStandardMaterial
          map={floorTex ?? undefined}
          color={floorTex ? '#ffffff' : '#1e293b'}
          roughness={0.72}
          metalness={0.34}
        />
      </mesh>
      <mesh position={[0, 0.2, 0]} geometry={localRes.rimGeo} raycast={NOOP_RAYCAST}>
        <meshBasicMaterial color="#38bdf8" />
      </mesh>

      {/* Armored Arena Cover Pillars (shared with engine collision AABBs, U9) */}
      {ARENA_PILLARS.map((pl, idx) => (
        <group key={idx} position={[pl.x, 1.9, pl.z]}>
          <mesh geometry={localRes.pillarGeo} raycast={NOOP_RAYCAST}>
            <meshStandardMaterial color="#334155" roughness={0.42} metalness={0.65} />
          </mesh>
          <mesh position={[0, 1.92, 0]} raycast={NOOP_RAYCAST}>
            <boxGeometry args={[2.26, 0.14, 2.26]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
        </group>
      ))}

      {/* Earth Horizon Globe + Atmospheric Rim */}
      <group position={[0, 16.5, -66]}>
        <mesh raycast={NOOP_RAYCAST}>
          <sphereGeometry args={[15, 28, 24]} />
          <meshStandardMaterial color="#1d4ed8" emissive="#0284c7" emissiveIntensity={0.38} roughness={0.62} />
        </mesh>
        <mesh raycast={NOOP_RAYCAST}>
          <sphereGeometry args={[16.2, 24, 20]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.18} side={THREE.BackSide} />
        </mesh>
      </group>

      {/* Player Mech, Boss Titan & Enemy Mech Pool */}
      <primitive object={playerRig.root} />
      <primitive object={bossRig.root} />
      {enemyPool.map((rig, idx) => (
        <primitive key={idx} object={rig.root} />
      ))}

      {/* Railgun Beam, Projectiles & Telegraph Rings */}
      <mesh
        ref={railBeamRef}
        visible={false}
        geometry={localRes.beamGeo}
        material={localRes.beamMat}
        raycast={NOOP_RAYCAST}
      />
      <instancedMesh
        ref={projInstRef}
        args={[localRes.projGeo, localRes.projMat, MAX_PROJ]}
        frustumCulled={false}
        raycast={NOOP_RAYCAST}
      />
      <instancedMesh
        ref={telegraphInstRef}
        args={[localRes.teleGeo, localRes.teleMat, 8]}
        frustumCulled={false}
        raycast={NOOP_RAYCAST}
      />
    </group>
  );
};

export default MechArenaScene;
