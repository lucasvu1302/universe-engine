import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import { InputManager } from '@/engine/input/InputManager';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useAppStore } from '@/stores/useAppStore';
import {
  animateHumanoidRun,
  buildAstronautRig,
  buildBossTitanRig,
  disposeObjectTree,
  NOOP_RAYCAST,
} from '@/scenes/SpaceGames/shared/CharacterModels';
import { createHudThrottle } from '@/scenes/SpaceGames/shared/gameHudThrottle';
import {
  createPlanetaryArenaTexture,
  SpaceGameStarfield,
} from '@/scenes/SpaceGames/shared/SpaceGameBackdrop';
import {
  applySurvivorUpgrade,
  astroSurvivorChannel,
  createAstroSurvivorState,
  snapshotAstroSurvivor,
  stepAstroSurvivor,
  type AstroSurvivorState,
  type SurvivorArenaId,
} from '@/scenes/SpaceGames/engines/astroSurvivorEngine';

const ARENA_VISUALS: Record<
  SurvivorArenaId,
  { bg: string; fog: string; ground: string; grid: string; spire: string; horizonBody: string; hasRings: boolean }
> = {
  mars: {
    bg: '#1c0c09',
    fog: '#361610',
    ground: '#9a3f24',
    grid: '#fb923c',
    spire: '#6c2918',
    horizonBody: '#fdba74',
    hasRings: false,
  },
  enceladus: {
    bg: '#040a1a',
    fog: '#0a1c36',
    ground: '#86c5e5',
    grid: '#38bdf8',
    spire: '#bae6fd',
    horizonBody: '#e6c58b',
    hasRings: true,
  },
  io: {
    bg: '#160a06',
    fog: '#291308',
    ground: '#2b2118',
    grid: '#f97316',
    spire: '#451a03',
    horizonBody: '#d97706',
    hasRings: false,
  },
};

const MAX_INSTANCES = 48;
const dummyObj = new THREE.Object3D();

export const AstroSurvivorScene: React.FC = () => {
  const { camera } = useThree();
  const [arena, setArena] = useState<SurvivorArenaId>('mars');

  const stateRef = useRef<AstroSurvivorState>(createAstroSurvivorState('mars'));
  const throttleRef = useRef(createHudThrottle(67));
  const pointerFireRef = useRef(false);
  const firePointerIdRef = useRef<number | null>(null);
  const recordedRef = useRef(false);
  const droneMeshRefs = useRef<Array<THREE.Mesh | null>>([]);

  const playerRig = useMemo(() => buildAstronautRig('#38bdf8'), []);
  const bossRig = useMemo(() => buildBossTitanRig(), []);

  const enemyInstRef = useRef<THREE.InstancedMesh>(null);
  const bulletInstRef = useRef<THREE.InstancedMesh>(null);
  const crystalInstRef = useRef<THREE.InstancedMesh>(null);
  const hazardInstRef = useRef<THREE.InstancedMesh>(null);
  const firePatchInstRef = useRef<THREE.InstancedMesh>(null);
  const orbitDronesRef = useRef<THREE.Group>(null);
  const sweepLaserRef = useRef<THREE.Mesh>(null);
  const auraRingRef = useRef<THREE.Mesh>(null);

  const localResources = useMemo(() => {
    const enemyGeo = new THREE.OctahedronGeometry(0.85, 1);
    const enemyMat = new THREE.MeshStandardMaterial({
      color: '#f43f5e',
      emissive: '#be123c',
      emissiveIntensity: 0.9,
      roughness: 0.3,
      metalness: 0.65,
    });
    const bulletGeo = new THREE.SphereGeometry(0.28, 8, 8);
    const bulletMat = new THREE.MeshBasicMaterial({ color: '#38bdf8' });
    const crystalGeo = new THREE.OctahedronGeometry(0.42, 0);
    const crystalMat = new THREE.MeshBasicMaterial({ color: '#22d3ee' });
    const hazardGeo = new THREE.RingGeometry(0.75, 1.0, 28);
    hazardGeo.rotateX(-Math.PI / 2);
    const hazardMat = new THREE.MeshBasicMaterial({
      color: '#ef4444',
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const patchGeo = new THREE.CircleGeometry(1.15, 14);
    patchGeo.rotateX(-Math.PI / 2);
    const patchMat = new THREE.MeshBasicMaterial({
      color: '#f97316',
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
    });
    // Unit-length beam shifted forward [0, +1] along +Z so scale.z matches engine sweep hitbox 1:1 (G11)
    const sweepGeo = new THREE.BoxGeometry(0.22, 0.22, 1.0);
    sweepGeo.translate(0, 0, 0.5);
    const sweepMat = new THREE.MeshBasicMaterial({ color: '#fb7185', transparent: true, opacity: 0.85 });
    const auraGeo = new THREE.RingGeometry(4.6, 5.2, 36);
    auraGeo.rotateX(-Math.PI / 2);
    const auraMat = new THREE.MeshBasicMaterial({
      color: '#c084fc',
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });
    const groundGeo = new THREE.CylinderGeometry(28, 30, 1.5, 48);
    const spireGeo = new THREE.ConeGeometry(1.6, 5.5, 6);
    const droneOrbGeo = new THREE.OctahedronGeometry(0.38, 0);
    const droneOrbMat = new THREE.MeshBasicMaterial({ color: '#22d3ee' });

    return {
      enemyGeo,
      enemyMat,
      bulletGeo,
      bulletMat,
      crystalGeo,
      crystalMat,
      hazardGeo,
      hazardMat,
      patchGeo,
      patchMat,
      sweepGeo,
      sweepMat,
      auraGeo,
      auraMat,
      groundGeo,
      spireGeo,
      droneOrbGeo,
      droneOrbMat,
    };
  }, []);

  useEffect(() => {
    const snapCameraToPlayer = () => {
      const p = stateRef.current.player;
      camera.position.set(p.x * 0.72, 11.2, p.z + 18.8);
      camera.lookAt(p.x * 0.85, 2.2, p.z - 5.5);
    };

    astroSurvivorChannel.resetTouch();
    snapCameraToPlayer();
    astroSurvivorChannel.publishSnapshot(snapshotAstroSurvivor(stateRef.current));

    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement | null)?.tagName === 'CANVAS') {
        firePointerIdRef.current = e.pointerId;
        pointerFireRef.current = true;
      }
    };
    const onUp = (e: PointerEvent) => {
      if (firePointerIdRef.current === null || firePointerIdRef.current === e.pointerId) {
        firePointerIdRef.current = null;
        pointerFireRef.current = false;
      }
    };
    const clearFire = () => {
      firePointerIdRef.current = null;
      pointerFireRef.current = false;
    };
    const onVis = () => {
      if (document.hidden) clearFire();
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', clearFire, true);
    window.addEventListener('blur', clearFire);
    document.addEventListener('visibilitychange', onVis);

    const unsub = astroSurvivorChannel.subscribeCommand((cmd) => {
      if (cmd.type === 'select_upgrade') {
        applySurvivorUpgrade(stateRef.current, cmd.skill);
        AudioManager.getInstance().playLevelUp();
        throttleRef.current.forceEmit(performance.now(), () =>
          astroSurvivorChannel.publishSnapshot(snapshotAstroSurvivor(stateRef.current))
        );
      } else if (cmd.type === 'switch_arena') {
        stateRef.current = createAstroSurvivorState(cmd.arena);
        recordedRef.current = false;
        clearFire();
        astroSurvivorChannel.resetTouch();
        snapCameraToPlayer();
        setArena(cmd.arena);
        throttleRef.current.forceEmit(performance.now(), () =>
          astroSurvivorChannel.publishSnapshot(snapshotAstroSurvivor(stateRef.current))
        );
      } else if (cmd.type === 'restart') {
        stateRef.current = createAstroSurvivorState(stateRef.current.arena);
        recordedRef.current = false;
        clearFire();
        astroSurvivorChannel.resetTouch();
        snapCameraToPlayer();
        throttleRef.current.forceEmit(performance.now(), () =>
          astroSurvivorChannel.publishSnapshot(snapshotAstroSurvivor(stateRef.current))
        );
      }
    });

    return () => {
      unsub();
      astroSurvivorChannel.reset(snapshotAstroSurvivor(createAstroSurvivorState('mars')));
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', clearFire, true);
      window.removeEventListener('blur', clearFire);
      document.removeEventListener('visibilitychange', onVis);
      disposeObjectTree(playerRig.root);
      disposeObjectTree(bossRig.root);
      Object.values(localResources).forEach((res) => res.dispose());
    };
  }, [playerRig, bossRig, localResources, camera]);

  const spires = useMemo(() => {
    const arr: Array<{ x: number; z: number; s: number }> = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      arr.push({ x: Math.cos(a) * 26.5, z: Math.sin(a) * 26.5, s: 0.75 + (i % 3) * 0.4 });
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    const st = stateRef.current;
    const input = InputManager.getInstance();

    let moveX = astroSurvivorChannel.touchMove.x;
    let moveZ = astroSurvivorChannel.touchMove.y;
    if (input.isKeyPressed('w') || input.isKeyPressed('ArrowUp')) moveZ -= 1;
    if (input.isKeyPressed('s') || input.isKeyPressed('ArrowDown')) moveZ += 1;
    if (input.isKeyPressed('a') || input.isKeyPressed('ArrowLeft')) moveX -= 1;
    if (input.isKeyPressed('d') || input.isKeyPressed('ArrowRight')) moveX += 1;

    const dash =
      input.isKeyPressed(' ') ||
      input.isKeyPressed('Space') ||
      input.isKeyPressed('Shift') ||
      Boolean(astroSurvivorChannel.touchActions.dash);
    const burst =
      pointerFireRef.current ||
      input.isKeyPressed('j') ||
      Boolean(astroSurvivorChannel.touchActions.burst);

    const clampedDt = Math.min(Math.max(delta, 0.001), 0.05);
    const ev = stepAstroSurvivor(st, clampedDt, { moveX, moveZ, dash, burst });
    const audio = AudioManager.getInstance();
    if (ev.shot) audio.playLaserShot();
    if (ev.explosion) audio.playExplosion();
    if (ev.dash) audio.playDashBoost();
    if (ev.hit) audio.playHitDamage();
    if (ev.pickup) audio.playCorePickup();
    if (ev.levelUp) {
      audio.playLevelUp();
      astroSurvivorChannel.resetTouch();
    }
    if (ev.bossKilled) audio.playVictoryFanfare();

    if (ev.gameOver && !recordedRef.current) {
      recordedRef.current = true;
      astroSurvivorChannel.resetTouch();
      useAppStore.getState().recordGameResult('astro_survivor', { score: st.score, wave: st.wave });
    }

    // Update 3D Astronaut rig
    playerRig.root.position.set(st.player.x, 0.05, st.player.z);
    playerRig.root.rotation.y = st.player.yaw;
    animateHumanoidRun(playerRig, st.elapsedSec, st.player.speedNorm, st.dashActiveTimer > 0);

    // Update Boss rig if active
    const boss = st.enemies.find((e) => e.isBoss);
    bossRig.root.visible = Boolean(boss);
    if (boss) {
      bossRig.root.position.set(boss.x, 0, boss.z);
      bossRig.root.rotation.y = Math.atan2(st.player.x - boss.x, st.player.z - boss.z);
      animateHumanoidRun(bossRig, st.elapsedSec * 0.65, 0.85, false);
    }

    // Update regular enemies instanced mesh
    if (enemyInstRef.current) {
      let idx = 0;
      for (const e of st.enemies) {
        if (e.isBoss || idx >= MAX_INSTANCES) continue;
        dummyObj.position.set(e.x, 0.85 + Math.sin(st.elapsedSec * 6 + e.id) * 0.15, e.z);
        dummyObj.rotation.set(0, st.elapsedSec * 2 + e.id, 0);
        dummyObj.scale.setScalar(1.0);
        dummyObj.updateMatrix();
        enemyInstRef.current.setMatrixAt(idx++, dummyObj.matrix);
      }
      enemyInstRef.current.count = idx;
      enemyInstRef.current.instanceMatrix.needsUpdate = true;
    }

    // Bullets
    if (bulletInstRef.current) {
      const count = Math.min(st.bullets.length, MAX_INSTANCES);
      for (let i = 0; i < count; i++) {
        const b = st.bullets[i];
        dummyObj.position.set(b.x, 1.05, b.z);
        dummyObj.rotation.set(0, 0, 0);
        dummyObj.scale.setScalar(1.0);
        dummyObj.updateMatrix();
        bulletInstRef.current.setMatrixAt(i, dummyObj.matrix);
      }
      bulletInstRef.current.count = count;
      bulletInstRef.current.instanceMatrix.needsUpdate = true;
    }

    // XP crystals
    if (crystalInstRef.current) {
      const count = Math.min(st.crystals.length, MAX_INSTANCES);
      for (let i = 0; i < count; i++) {
        const c = st.crystals[i];
        dummyObj.position.set(c.x, 0.55 + Math.sin(st.elapsedSec * 4 + c.id) * 0.2, c.z);
        dummyObj.rotation.set(0, st.elapsedSec * 3 + c.id, 0);
        dummyObj.scale.setScalar(1.0);
        dummyObj.updateMatrix();
        crystalInstRef.current.setMatrixAt(i, dummyObj.matrix);
      }
      crystalInstRef.current.count = count;
      crystalInstRef.current.instanceMatrix.needsUpdate = true;
    }

    // Meteor / Boss slam telegraph rings
    if (hazardInstRef.current) {
      const count = Math.min(st.hazards.length, 12);
      for (let i = 0; i < count; i++) {
        const h = st.hazards[i];
        const pulse = 0.85 + (1 - h.timer / h.maxTimer) * 0.25;
        dummyObj.position.set(h.x, 0.08, h.z);
        dummyObj.rotation.set(0, 0, 0);
        dummyObj.scale.setScalar(h.radius * pulse);
        dummyObj.updateMatrix();
        hazardInstRef.current.setMatrixAt(i, dummyObj.matrix);
      }
      hazardInstRef.current.count = count;
      hazardInstRef.current.instanceMatrix.needsUpdate = true;
    }

    // Fire trail patches
    if (firePatchInstRef.current) {
      const count = Math.min(st.firePatches.length, 24);
      for (let i = 0; i < count; i++) {
        const p = st.firePatches[i];
        dummyObj.position.set(p.x, 0.06, p.z);
        dummyObj.rotation.set(0, 0, 0);
        dummyObj.scale.setScalar(Math.min(1, p.life));
        dummyObj.updateMatrix();
        firePatchInstRef.current.setMatrixAt(i, dummyObj.matrix);
      }
      firePatchInstRef.current.count = count;
      firePatchInstRef.current.instanceMatrix.needsUpdate = true;
    }

    // Orbiting Attack Drones (exact engine count & spacing) & Sweep Laser (exact forward reach, G11)
    if (orbitDronesRef.current) {
      const droneLv = st.skills.orbit_drones;
      const droneCount = droneLv > 0 ? Math.min(4, 1 + droneLv) : 0;
      orbitDronesRef.current.visible = droneCount > 0;
      orbitDronesRef.current.position.set(st.player.x, 1.15, st.player.z);
      orbitDronesRef.current.rotation.y = -st.droneAngle;
      for (let d = 0; d < 4; d++) {
        const mesh = droneMeshRefs.current[d];
        if (!mesh) continue;
        if (d < droneCount) {
          mesh.visible = true;
          const a = (d / droneCount) * Math.PI * 2;
          mesh.position.set(Math.cos(a) * 3.2, 0, Math.sin(a) * 3.2);
        } else {
          mesh.visible = false;
        }
      }
    }
    if (sweepLaserRef.current) {
      const sweepLv = st.skills.sweep_laser;
      sweepLaserRef.current.visible = sweepLv > 0;
      if (sweepLv > 0) {
        const laserLen = 7.5 + sweepLv * 1.1;
        sweepLaserRef.current.position.set(st.player.x, 1.0, st.player.z);
        sweepLaserRef.current.rotation.y = -st.sweepAngle + Math.PI / 2;
        sweepLaserRef.current.scale.set(1, 1, laserLen);
      }
    }
    if (auraRingRef.current) {
      auraRingRef.current.visible = st.skills.lightning_aura > 0;
      auraRingRef.current.position.set(st.player.x, 0.12, st.player.z);
      const pulse = 1 + Math.sin(st.elapsedSec * 9) * 0.08;
      auraRingRef.current.scale.setScalar(pulse);
    }

    // Frame-rate-independent action camera framing hero, swarmers & giant horizon planet (M8)
    const camDamp = 1 - Math.exp(-7 * clampedDt);
    const targetCamX = st.player.x * 0.72;
    const targetCamY = 11.2;
    const targetCamZ = st.player.z + 18.8;
    camera.position.x += (targetCamX - camera.position.x) * camDamp;
    camera.position.y += (targetCamY - camera.position.y) * camDamp;
    camera.position.z += (targetCamZ - camera.position.z) * camDamp;
    camera.lookAt(st.player.x * 0.85, 2.2, st.player.z - 5.5);

    // Throttled HUD sync (<= 15 Hz) or immediate on discrete phase transitions
    const now = performance.now();
    if (ev.levelUp || ev.gameOver || ev.bossKilled) {
      throttleRef.current.forceEmit(now, () =>
        astroSurvivorChannel.publishSnapshot(snapshotAstroSurvivor(st))
      );
    } else {
      throttleRef.current.maybeEmit(now, () =>
        astroSurvivorChannel.publishSnapshot(snapshotAstroSurvivor(st))
      );
    }
  });

  const vis = ARENA_VISUALS[arena];
  const groundTex = useMemo(
    () =>
      createPlanetaryArenaTexture(
        vis.ground,
        vis.spire,
        vis.grid,
        arena === 'mars' ? 11 : arena === 'enceladus' ? 22 : 33
      ),
    [arena, vis.ground, vis.spire, vis.grid]
  );

  useEffect(() => {
    return () => {
      groundTex?.dispose();
    };
  }, [groundTex]);

  return (
    <group>
      <color attach="background" args={[vis.bg]} />
      <fog attach="fog" args={[vis.fog, 36, 130]} />
      <ambientLight intensity={0.8} />
      <hemisphereLight args={['#bae6fd', vis.ground, 0.9]} />
      <directionalLight position={[18, 28, 14]} intensity={2.25} color="#fff7ed" />
      <SpaceGameStarfield tintHex={vis.grid} />

      {/* Planetary Arena Ground with Procedural Craters & Concentric Tactical Rings */}
      <mesh
        position={[0, -0.75, 0]}
        geometry={localResources.groundGeo}
        raycast={NOOP_RAYCAST}
      >
        <meshStandardMaterial
          map={groundTex ?? undefined}
          color={groundTex ? '#ffffff' : vis.ground}
          roughness={0.85}
          metalness={0.08}
        />
      </mesh>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={NOOP_RAYCAST}>
        <ringGeometry args={[26.2, 27.2, 64]} />
        <meshBasicMaterial color={vis.grid} transparent opacity={0.65} side={THREE.DoubleSide} />
      </mesh>

      {/* Perimeter Canyon Spires / Ice Pillars */}
      {spires.map((sp, i) => (
        <mesh
          key={i}
          position={[sp.x, sp.s * 2.1, sp.z]}
          scale={[sp.s, sp.s, sp.s]}
          geometry={localResources.spireGeo}
          raycast={NOOP_RAYCAST}
        >
          <meshStandardMaterial color={vis.spire} roughness={0.88} />
        </mesh>
      ))}

      {/* Giant Horizon Planet / Ringed Saturn on Enceladus */}
      <group position={[0, 14.5, -62]}>
        <mesh raycast={NOOP_RAYCAST}>
          <sphereGeometry args={[12.5, 28, 24]} />
          <meshStandardMaterial
            color={vis.horizonBody}
            emissive={vis.horizonBody}
            emissiveIntensity={0.2}
            roughness={0.68}
          />
        </mesh>
        {vis.hasRings && (
          <mesh rotation={[Math.PI / 2.65, 0.22, 0.14]} raycast={NOOP_RAYCAST}>
            <ringGeometry args={[15.5, 27.5, 56]} />
            <meshBasicMaterial color="#fde68a" transparent opacity={0.65} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>

      {/* Articulated Hero Astronaut & Wave Boss */}
      <primitive object={playerRig.root} />
      <primitive object={bossRig.root} />

      {/* Orbiting Attack Drones */}
      <group ref={orbitDronesRef} visible={false}>
        {[0, 1, 2, 3].map((idx) => {
          const a = (idx / 4) * Math.PI * 2;
          return (
            <mesh
              key={idx}
              ref={(el) => {
                droneMeshRefs.current[idx] = el;
              }}
              position={[Math.cos(a) * 3.2, 0, Math.sin(a) * 3.2]}
              geometry={localResources.droneOrbGeo}
              material={localResources.droneOrbMat}
              raycast={NOOP_RAYCAST}
            />
          );
        })}
      </group>

      {/* 360 Sweep Laser & Overload Aura */}
      <mesh
        ref={sweepLaserRef}
        visible={false}
        geometry={localResources.sweepGeo}
        material={localResources.sweepMat}
        raycast={NOOP_RAYCAST}
      />
      <mesh
        ref={auraRingRef}
        visible={false}
        geometry={localResources.auraGeo}
        material={localResources.auraMat}
        raycast={NOOP_RAYCAST}
      />

      {/* Instanced Dynamic Entities (frustumCulled=false so entities never vanish off-origin, M1) */}
      <instancedMesh
        ref={enemyInstRef}
        args={[localResources.enemyGeo, localResources.enemyMat, MAX_INSTANCES]}
        frustumCulled={false}
        raycast={NOOP_RAYCAST}
      />
      <instancedMesh
        ref={bulletInstRef}
        args={[localResources.bulletGeo, localResources.bulletMat, MAX_INSTANCES]}
        frustumCulled={false}
        raycast={NOOP_RAYCAST}
      />
      <instancedMesh
        ref={crystalInstRef}
        args={[localResources.crystalGeo, localResources.crystalMat, MAX_INSTANCES]}
        frustumCulled={false}
        raycast={NOOP_RAYCAST}
      />
      <instancedMesh
        ref={hazardInstRef}
        args={[localResources.hazardGeo, localResources.hazardMat, 12]}
        frustumCulled={false}
        raycast={NOOP_RAYCAST}
      />
      <instancedMesh
        ref={firePatchInstRef}
        args={[localResources.patchGeo, localResources.patchMat, 24]}
        frustumCulled={false}
        raycast={NOOP_RAYCAST}
      />
    </group>
  );
};

export default AstroSurvivorScene;
