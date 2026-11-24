import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import { InputManager } from '@/engine/input/InputManager';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useAppStore } from '@/stores/useAppStore';
import {
  animateHumanoidRun,
  buildAstronautRig,
  disposeObjectTree,
  NOOP_RAYCAST,
} from '@/scenes/SpaceGames/shared/CharacterModels';
import { createHudThrottle } from '@/scenes/SpaceGames/shared/gameHudThrottle';
import {
  createPlanetaryArenaTexture,
  SpaceGameStarfield,
} from '@/scenes/SpaceGames/shared/SpaceGameBackdrop';
import {
  BASE_RADIUS,
  createExoMinerState,
  exoMinerChannel,
  snapshotExoMiner,
  stepExoMiner,
  TURRET_SLOTS,
  type CrystalVeinType,
  type ExoMinerState,
} from '@/scenes/SpaceGames/engines/exoMinerEngine';

const VEIN_COLORS: Record<CrystalVeinType, string> = {
  helium3: '#22d3ee',
  cryo: '#60a5fa',
  magma: '#fb923c',
};

const MAX_BUGS = 10;
const dummyObj = new THREE.Object3D();

export const ExoMinerScene: React.FC = () => {
  const { camera } = useThree();
  const minerUpgrades = useAppStore((s) => s.gameProgress.minerUpgrades);

  const stateRef = useRef<ExoMinerState>(createExoMinerState(minerUpgrades));
  const throttleRef = useRef(createHudThrottle(67));
  const recordedBestRef = useRef(0);

  const playerRig = useMemo(() => buildAstronautRig('#34d399'), []);
  const miningBeamRef = useRef<THREE.Mesh>(null);
  const bugInstRef = useRef<THREE.InstancedMesh>(null);
  const turretBeamRef = useRef<THREE.Mesh>(null);
  const veinRefs = useRef<Array<THREE.Mesh | null>>([]);
  const dirLightRef = useRef<THREE.DirectionalLight>(null);

  const localRes = useMemo(() => {
    const beamGeo = new THREE.CylinderGeometry(0.09, 0.09, 1, 8);
    beamGeo.rotateX(Math.PI / 2);
    const beamMat = new THREE.MeshBasicMaterial({ color: '#34d399', transparent: true, opacity: 0.9 });
    const turretBeamMat = new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.9 });
    const bugGeo = new THREE.DodecahedronGeometry(0.68, 0);
    const bugMat = new THREE.MeshStandardMaterial({
      color: '#be123c',
      emissive: '#f43f5e',
      emissiveIntensity: 0.85,
      roughness: 0.35,
    });
    const crystalGeo = new THREE.OctahedronGeometry(1.15, 0);
    const groundGeo = new THREE.CylinderGeometry(31, 33, 1.5, 48);
    const domeGeo = new THREE.SphereGeometry(3.4, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const baseRingGeo = new THREE.RingGeometry(BASE_RADIUS - 0.18, BASE_RADIUS, 48);
    baseRingGeo.rotateX(-Math.PI / 2);
    return { beamGeo, beamMat, turretBeamMat, bugGeo, bugMat, crystalGeo, groundGeo, domeGeo, baseRingGeo };
  }, []);

  useEffect(() => {
    stateRef.current.upgrades = { ...minerUpgrades };
    stateRef.current.cargoCapacity = 8 + (minerUpgrades.o2 - 1) * 2;
  }, [minerUpgrades]);

  const pausedRef = useRef(false);

  useEffect(() => {
    const snapCameraToPlayer = () => {
      const p = stateRef.current.player;
      camera.position.set(p.x * 0.72, 12.2, p.z + 17.8);
      camera.lookAt(p.x * 0.85, 1.8, p.z - 4.5);
    };

    exoMinerChannel.resetTouch();
    snapCameraToPlayer();
    exoMinerChannel.publishSnapshot(snapshotExoMiner(stateRef.current));

    const unsub = exoMinerChannel.subscribeCommand((cmd) => {
      if (cmd.type === 'restart') {
        const upg = useAppStore.getState().gameProgress.minerUpgrades;
        stateRef.current = createExoMinerState(upg);
        pausedRef.current = false;
        exoMinerChannel.resetTouch();
        snapCameraToPlayer();
        throttleRef.current.forceEmit(performance.now(), () =>
          exoMinerChannel.publishSnapshot(snapshotExoMiner(stateRef.current))
        );
      } else if (cmd.type === 'sync_upgrades') {
        stateRef.current.upgrades = { ...cmd.upgrades };
        stateRef.current.cargoCapacity = 8 + (cmd.upgrades.o2 - 1) * 2;
        throttleRef.current.forceEmit(performance.now(), () =>
          exoMinerChannel.publishSnapshot(snapshotExoMiner(stateRef.current))
        );
      } else if (cmd.type === 'set_paused') {
        pausedRef.current = cmd.paused;
        if (cmd.paused) {
          exoMinerChannel.resetTouch();
        }
      }
    });

    return () => {
      unsub();
      exoMinerChannel.reset(
        snapshotExoMiner(createExoMinerState(useAppStore.getState().gameProgress.minerUpgrades))
      );
      disposeObjectTree(playerRig.root);
      Object.values(localRes).forEach((r) => r.dispose());
    };
  }, [playerRig, localRes, camera]);

  useFrame((_, delta) => {
    const clampedDt = Math.min(Math.max(delta, 0.001), 0.05);
    const st = stateRef.current;
    if (pausedRef.current) return;
    const input = InputManager.getInstance();

    let moveX = exoMinerChannel.touchMove.x;
    let moveZ = exoMinerChannel.touchMove.y;
    if (input.isKeyPressed('w') || input.isKeyPressed('ArrowUp')) moveZ -= 1;
    if (input.isKeyPressed('s') || input.isKeyPressed('ArrowDown')) moveZ += 1;
    if (input.isKeyPressed('a') || input.isKeyPressed('ArrowLeft')) moveX -= 1;
    if (input.isKeyPressed('d') || input.isKeyPressed('ArrowRight')) moveX += 1;

    const mine =
      input.isKeyPressed('e') ||
      input.isKeyPressed(' ') ||
      input.isKeyPressed('Space') ||
      Boolean(exoMinerChannel.touchActions.mine);
    const boost =
      input.isKeyPressed('Shift') || Boolean(exoMinerChannel.touchActions.boost);

    const ev = stepExoMiner(st, clampedDt, { moveX, moveZ, mine, boost });
    const audio = AudioManager.getInstance();
    if (ev.minedOre) audio.playCorePickup();
    if (ev.turretFired) audio.playLaserShot();
    if (ev.bugHit) audio.playHitDamage();
    if (ev.soldCredits > 0) {
      audio.playLevelUp();
      useAppStore.getState().recordGameResult('exo_miner', {
        creditsEarned: ev.soldCredits,
        score: st.sessionScore,
      });
      recordedBestRef.current = Math.max(recordedBestRef.current, st.sessionScore);
    }
    if (ev.evacuated) {
      audio.playExplosion();
      exoMinerChannel.resetTouch();
    }

    // Update Explorer Astronaut rig
    playerRig.root.position.set(st.player.x, 0.05, st.player.z);
    playerRig.root.rotation.y = st.player.yaw;
    animateHumanoidRun(playerRig, st.elapsedSec, st.player.speedNorm, boost && st.battery > 5);

    // Mining laser beam connecting astronaut to active vein
    if (miningBeamRef.current) {
      const targetVein = st.veins.find((v) => v.id === st.miningTargetVeinId);
      if (st.isMining && targetVein) {
        miningBeamRef.current.visible = true;
        const mx = (st.player.x + targetVein.x) * 0.5;
        const mz = (st.player.z + targetVein.z) * 0.5;
        const len = Math.hypot(targetVein.x - st.player.x, targetVein.z - st.player.z);
        miningBeamRef.current.position.set(mx, 1.05, mz);
        miningBeamRef.current.rotation.y = Math.atan2(targetVein.x - st.player.x, targetVein.z - st.player.z);
        miningBeamRef.current.scale.set(1, 1, Math.max(0.1, len));
      } else {
        miningBeamRef.current.visible = false;
      }
    }

    // Crystal vein scale based on remaining ore
    st.veins.forEach((v, idx) => {
      const mesh = veinRefs.current[idx];
      if (!mesh) return;
      mesh.visible = v.remaining > 0;
      const s = 0.55 + (v.remaining / v.maxRemaining) * 0.65;
      mesh.scale.set(s, s * 1.35, s);
      mesh.rotation.y = st.elapsedSec * 0.6 + v.id;
    });

    // Night alien bugs
    if (bugInstRef.current) {
      const count = Math.min(st.bugs.length, MAX_BUGS);
      for (let i = 0; i < count; i++) {
        const b = st.bugs[i];
        dummyObj.position.set(b.x, 0.65 + Math.sin(st.elapsedSec * 8 + b.id) * 0.14, b.z);
        dummyObj.rotation.set(0, st.elapsedSec * 3, 0);
        dummyObj.scale.setScalar(1.0);
        dummyObj.updateMatrix();
        bugInstRef.current.setMatrixAt(i, dummyObj.matrix);
      }
      bugInstRef.current.count = count;
      bugInstRef.current.instanceMatrix.needsUpdate = true;
    }

    // Auto-turret laser flash
    if (turretBeamRef.current) {
      const shot = st.turretShots[0];
      if (shot) {
        turretBeamRef.current.visible = true;
        const mx = (shot.x1 + shot.x2) * 0.5;
        const mz = (shot.z1 + shot.z2) * 0.5;
        const len = Math.hypot(shot.x2 - shot.x1, shot.z2 - shot.z1);
        turretBeamRef.current.position.set(mx, 1.4, mz);
        turretBeamRef.current.rotation.y = Math.atan2(shot.x2 - shot.x1, shot.z2 - shot.z1);
        turretBeamRef.current.scale.set(1, 1, Math.max(0.1, len));
      } else {
        turretBeamRef.current.visible = false;
      }
    }

    // Dynamic Day/Night sun brightness
    if (dirLightRef.current) {
      const isNight = st.dayPhase >= 0.58;
      dirLightRef.current.intensity = isNight ? 0.95 : 2.25;
    }

    // Follow camera framing Habitat Base, glowing crystals & starry horizon (frame-rate independent, M8)
    const camDamp = 1 - Math.exp(-6.5 * clampedDt);
    const cx = st.player.x * 0.72;
    const cy = 12.2;
    const cz = st.player.z + 17.8;
    camera.position.x += (cx - camera.position.x) * camDamp;
    camera.position.y += (cy - camera.position.y) * camDamp;
    camera.position.z += (cz - camera.position.z) * camDamp;
    camera.lookAt(st.player.x * 0.85, 1.8, st.player.z - 4.5);

    const now = performance.now();
    if (ev.minedOre || ev.soldCredits > 0 || ev.evacuated) {
      throttleRef.current.forceEmit(now, () =>
        exoMinerChannel.publishSnapshot(snapshotExoMiner(st))
      );
    } else {
      throttleRef.current.maybeEmit(now, () =>
        exoMinerChannel.publishSnapshot(snapshotExoMiner(st))
      );
    }
  });

  const activeTurrets = Math.min(3, minerUpgrades.turrets);
  const groundTex = useMemo(
    () => createPlanetaryArenaTexture('#5c3d30', '#2b1c18', '#34d399', 55),
    []
  );

  useEffect(() => {
    return () => {
      groundTex?.dispose();
    };
  }, [groundTex]);

  return (
    <group>
      <color attach="background" args={['#080d1a']} />
      <fog attach="fog" args={['#10192b', 34, 125]} />
      <ambientLight intensity={0.82} />
      <hemisphereLight args={['#7dd3fc', '#3b241c', 0.9]} />
      <directionalLight ref={dirLightRef} position={[16, 28, 16]} intensity={2.25} color="#fef3c7" />
      <SpaceGameStarfield tintHex="#34d399" />

      {/* Outpost Ground with Procedural Regolith Craters & Tactical Rings */}
      <mesh position={[0, -0.75, 0]} geometry={localRes.groundGeo} raycast={NOOP_RAYCAST}>
        <meshStandardMaterial
          map={groundTex ?? undefined}
          color={groundTex ? '#ffffff' : '#47332a'}
          roughness={0.88}
          metalness={0.08}
        />
      </mesh>

      {/* Distant Gas Giant & Moon on Outpost Horizon */}
      <group position={[18, 16, -68]}>
        <mesh raycast={NOOP_RAYCAST}>
          <sphereGeometry args={[12, 26, 22]} />
          <meshStandardMaterial color="#f59e0b" emissive="#b45309" emissiveIntensity={0.22} roughness={0.75} />
        </mesh>
        <mesh rotation={[Math.PI / 2.7, -0.2, 0.15]} raycast={NOOP_RAYCAST}>
          <ringGeometry args={[15, 24, 48]} />
          <meshBasicMaterial color="#fde68a" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* 3D Habitat Dome Base & Recharge Perimeter Ring */}
      <group position={[0, 0, 0]}>
        <mesh geometry={localRes.domeGeo} raycast={NOOP_RAYCAST}>
          <meshStandardMaterial
            color="#e0f2fe"
            emissive="#0284c7"
            emissiveIntensity={0.45}
            transparent
            opacity={0.78}
            roughness={0.2}
          />
        </mesh>
        <mesh position={[0, 3.8, 0]} raycast={NOOP_RAYCAST}>
          <cylinderGeometry args={[0.15, 0.25, 2.2, 8]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={1.2} />
        </mesh>
        {/* Solar Wings */}
        <mesh position={[-5.2, 1.4, -1.5]} rotation={[-0.35, 0, 0]} raycast={NOOP_RAYCAST}>
          <boxGeometry args={[3.4, 0.1, 1.8]} />
          <meshStandardMaterial color="#1d4ed8" metalness={0.75} roughness={0.22} />
        </mesh>
        <mesh position={[5.2, 1.4, -1.5]} rotation={[-0.35, 0, 0]} raycast={NOOP_RAYCAST}>
          <boxGeometry args={[3.4, 0.1, 1.8]} />
          <meshStandardMaterial color="#1d4ed8" metalness={0.75} roughness={0.22} />
        </mesh>
        <mesh position={[0, 0.06, 0]} geometry={localRes.baseRingGeo} raycast={NOOP_RAYCAST}>
          <meshBasicMaterial color="#34d399" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Auto-Defense Turrets (0..3) */}
      {TURRET_SLOTS.slice(0, activeTurrets).map((slot, idx) => (
        <group key={idx} position={[slot.x, 0, slot.z]}>
          <mesh position={[0, 0.65, 0]} raycast={NOOP_RAYCAST}>
            <cylinderGeometry args={[0.45, 0.6, 1.3, 10]} />
            <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh position={[0, 1.45, 0]} raycast={NOOP_RAYCAST}>
            <boxGeometry args={[0.7, 0.45, 0.9]} />
            <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.9} />
          </mesh>
        </group>
      ))}

      {/* Scannable Crystal Veins (Helium-3, Cryo Core, Magma Crystal) */}
      {stateRef.current.veins.map((v, idx) => (
        <mesh
          key={v.id}
          ref={(el) => {
            veinRefs.current[idx] = el;
          }}
          position={[v.x, 1.25, v.z]}
          geometry={localRes.crystalGeo}
          raycast={NOOP_RAYCAST}
        >
          <meshStandardMaterial
            color={VEIN_COLORS[v.type]}
            emissive={VEIN_COLORS[v.type]}
            emissiveIntensity={1.15}
            roughness={0.18}
            metalness={0.35}
          />
        </mesh>
      ))}

      {/* Explorer Astronaut + Mining Beam + Turret Beam + Night Bugs */}
      <primitive object={playerRig.root} />
      <mesh
        ref={miningBeamRef}
        visible={false}
        geometry={localRes.beamGeo}
        material={localRes.beamMat}
        raycast={NOOP_RAYCAST}
      />
      <mesh
        ref={turretBeamRef}
        visible={false}
        geometry={localRes.beamGeo}
        material={localRes.turretBeamMat}
        raycast={NOOP_RAYCAST}
      />
      <instancedMesh
        ref={bugInstRef}
        args={[localRes.bugGeo, localRes.bugMat, MAX_BUGS]}
        frustumCulled={false}
        raycast={NOOP_RAYCAST}
      />
    </group>
  );
};

export default ExoMinerScene;
