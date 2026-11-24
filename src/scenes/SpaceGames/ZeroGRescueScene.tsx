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
import { SpaceGameStarfield } from '@/scenes/SpaceGames/shared/SpaceGameBackdrop';
import {
  createZeroGRescueState,
  snapshotZeroGRescue,
  stepZeroGRescue,
  zeroGRescueChannel,
  type ZeroGRescueState,
} from '@/scenes/SpaceGames/engines/zeroGRescueEngine';

const MAX_PARASITES = 12;
const MAX_BOLTS = 32;
const dummyObj = new THREE.Object3D();

export const ZeroGRescueScene: React.FC = () => {
  const { camera } = useThree();
  const stateRef = useRef<ZeroGRescueState>(createZeroGRescueState());
  const throttleRef = useRef(createHudThrottle(67));
  const pointerFireRef = useRef(false);
  const recordedRef = useRef(false);

  const marineRig = useMemo(() => buildAstronautRig('#a855f7'), []);
  const parasiteInstRef = useRef<THREE.InstancedMesh>(null);
  const boltInstRef = useRef<THREE.InstancedMesh>(null);
  const grappleBeamRef = useRef<THREE.Mesh>(null);
  const coreMatsRef = useRef<Array<THREE.MeshStandardMaterial | null>>([]);

  const localRes = useMemo(() => {
    const parasiteGeo = new THREE.OctahedronGeometry(0.75, 1);
    const parasiteMat = new THREE.MeshStandardMaterial({
      color: '#f43f5e',
      emissive: '#e11d48',
      emissiveIntensity: 1.2,
      roughness: 0.28,
      metalness: 0.72,
    });
    const boltGeo = new THREE.SphereGeometry(0.24, 8, 8);
    const boltMat = new THREE.MeshBasicMaterial({ color: '#38bdf8' });
    const beamGeo = new THREE.CylinderGeometry(0.07, 0.07, 1, 8);
    const beamMat = new THREE.MeshBasicMaterial({ color: '#22d3ee', transparent: true, opacity: 0.9 });
    const coreGeo = new THREE.IcosahedronGeometry(1.15, 1);
    return { parasiteGeo, parasiteMat, boltGeo, boltMat, beamGeo, beamMat, coreGeo };
  }, []);

  const firePointerIdRef = useRef<number | null>(null);

  useEffect(() => {
    const snapCameraToPlayer = () => {
      const p = stateRef.current.player;
      camera.position.set(p.x * 0.72, p.y + 4.8, p.z + 15.0);
      camera.lookAt(p.x * 0.7, p.y, p.z - 3.0);
    };

    zeroGRescueChannel.resetTouch();
    snapCameraToPlayer();
    zeroGRescueChannel.publishSnapshot(snapshotZeroGRescue(stateRef.current));

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

    const unsub = zeroGRescueChannel.subscribeCommand((cmd) => {
      if (cmd.type === 'restart') {
        stateRef.current = createZeroGRescueState();
        recordedRef.current = false;
        clearFire();
        zeroGRescueChannel.resetTouch();
        snapCameraToPlayer();
        throttleRef.current.forceEmit(performance.now(), () =>
          zeroGRescueChannel.publishSnapshot(snapshotZeroGRescue(stateRef.current))
        );
      }
    });

    return () => {
      unsub();
      zeroGRescueChannel.reset(snapshotZeroGRescue(createZeroGRescueState()));
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', clearFire, true);
      window.removeEventListener('blur', clearFire);
      document.removeEventListener('visibilitychange', onVis);
      disposeObjectTree(marineRig.root);
      Object.values(localRes).forEach((r) => r.dispose());
    };
  }, [marineRig, localRes, camera]);

  const upVec = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const dirVec = useMemo(() => new THREE.Vector3(), []);
  const quatScratch = useMemo(() => new THREE.Quaternion(), []);

  useFrame((_, delta) => {
    const st = stateRef.current;
    const input = InputManager.getInstance();

    let moveX = zeroGRescueChannel.touchMove.x;
    let moveZ = zeroGRescueChannel.touchMove.y;
    let moveY = 0;
    if (input.isKeyPressed('w') || input.isKeyPressed('ArrowUp')) moveZ -= 1;
    if (input.isKeyPressed('s') || input.isKeyPressed('ArrowDown')) moveZ += 1;
    if (input.isKeyPressed('a') || input.isKeyPressed('ArrowLeft')) moveX -= 1;
    if (input.isKeyPressed('d') || input.isKeyPressed('ArrowRight')) moveX += 1;
    if (input.isKeyPressed('r') || input.isKeyPressed(' ') || input.isKeyPressed('Space') || zeroGRescueChannel.touchActions.up) {
      moveY += 1;
    }
    if (input.isKeyPressed('f') || input.isKeyPressed('Shift') || zeroGRescueChannel.touchActions.down) {
      moveY -= 1;
    }

    const fire =
      pointerFireRef.current ||
      input.isKeyPressed('j') ||
      Boolean(zeroGRescueChannel.touchActions.fire);
    const grapple =
      input.isKeyPressed('g') || Boolean(zeroGRescueChannel.touchActions.grapple);
    const repair =
      input.isKeyPressed('e') || Boolean(zeroGRescueChannel.touchActions.repair);

    const clampedDt = Math.min(Math.max(delta, 0.001), 0.05);
    const ev = stepZeroGRescue(st, clampedDt, { moveX, moveY, moveZ, fire, grapple, repair });
    const audio = AudioManager.getInstance();
    if (ev.fired) audio.playLaserShot();
    if (ev.parasiteKilled) audio.playExplosion();
    if (ev.coreRepaired) audio.playCorePickup();
    if (ev.hit) audio.playHitDamage();
    if (ev.victory || ev.failed) {
      zeroGRescueChannel.resetTouch();
    }
    if (ev.victory) {
      audio.playVictoryFanfare();
      if (!recordedRef.current && st.rank) {
        recordedRef.current = true;
        useAppStore.getState().recordGameResult('zero_g_rescue', {
          score: st.score,
          rank: st.rank,
        });
      }
    }

    // Update floating Zero-G Marine
    marineRig.root.position.set(st.player.x, st.player.y, st.player.z);
    marineRig.root.rotation.y = st.player.yaw;
    animateHumanoidRun(
      marineRig,
      st.elapsedSec * 0.7,
      Math.min(1, Math.hypot(st.player.vx, st.player.vy, st.player.vz) / 6),
      true
    );

    // Update Reactor Core glow color with numeric hex (zero regex allocs + fixed repaired brightness, M11)
    for (let idx = 0; idx < st.cores.length; idx++) {
      const c = st.cores[idx];
      const mat = coreMatsRef.current[idx];
      if (!mat) continue;
      if (c.repaired) {
        mat.color.setHex(0x34d399);
        mat.emissive.setHex(0x10b981);
        mat.emissiveIntensity = 1.25;
      } else {
        const pulse = 0.8 + Math.sin(st.elapsedSec * 6 + idx) * 0.4;
        mat.color.setHex(0xfb923c);
        mat.emissive.setHex(0xef4444);
        mat.emissiveIntensity = pulse;
      }
    }

    // Magnetic Grapple tether beam
    if (grappleBeamRef.current) {
      if (st.grappleTargetCoreIndex !== null) {
        const target = st.cores[st.grappleTargetCoreIndex];
        grappleBeamRef.current.visible = true;
        dirVec.set(target.x - st.player.x, target.y - st.player.y, target.z - st.player.z);
        const len = dirVec.length();
        grappleBeamRef.current.position.set(
          (st.player.x + target.x) * 0.5,
          (st.player.y + target.y) * 0.5,
          (st.player.z + target.z) * 0.5
        );
        if (len > 0.01) {
          dirVec.divideScalar(len);
          quatScratch.setFromUnitVectors(upVec, dirVec);
          grappleBeamRef.current.quaternion.copy(quatScratch);
          grappleBeamRef.current.scale.set(1, len, 1);
        }
      } else {
        grappleBeamRef.current.visible = false;
      }
    }

    // Parasites
    if (parasiteInstRef.current) {
      const count = Math.min(st.parasites.length, MAX_PARASITES);
      for (let i = 0; i < count; i++) {
        const p = st.parasites[i];
        dummyObj.position.set(p.x, p.y, p.z);
        dummyObj.rotation.set(st.elapsedSec * 2 + p.id, st.elapsedSec * 3, 0);
        dummyObj.scale.setScalar(1.0);
        dummyObj.updateMatrix();
        parasiteInstRef.current.setMatrixAt(i, dummyObj.matrix);
      }
      parasiteInstRef.current.count = count;
      parasiteInstRef.current.instanceMatrix.needsUpdate = true;
    }

    // Pulse bolts
    if (boltInstRef.current) {
      const count = Math.min(st.bolts.length, MAX_BOLTS);
      for (let i = 0; i < count; i++) {
        const b = st.bolts[i];
        dummyObj.position.set(b.x, b.y, b.z);
        dummyObj.rotation.set(0, 0, 0);
        dummyObj.scale.setScalar(1.0);
        dummyObj.updateMatrix();
        boltInstRef.current.setMatrixAt(i, dummyObj.matrix);
      }
      boltInstRef.current.count = count;
      boltInstRef.current.instanceMatrix.needsUpdate = true;
    }

    // Smooth frame-rate-independent Zero-G chase camera framing station + astronaut (M8)
    const camDamp = 1 - Math.exp(-5.5 * clampedDt);
    const cx = st.player.x * 0.72;
    const cy = st.player.y + 4.8;
    const cz = st.player.z + 15.0;
    camera.position.x += (cx - camera.position.x) * camDamp;
    camera.position.y += (cy - camera.position.y) * camDamp;
    camera.position.z += (cz - camera.position.z) * camDamp;
    camera.lookAt(st.player.x * 0.7, st.player.y, st.player.z - 3.0);

    const now = performance.now();
    if (ev.victory || ev.failed || ev.coreRepaired || ev.parasiteKilled) {
      throttleRef.current.forceEmit(now, () =>
        zeroGRescueChannel.publishSnapshot(snapshotZeroGRescue(st))
      );
    } else {
      throttleRef.current.maybeEmit(now, () =>
        zeroGRescueChannel.publishSnapshot(snapshotZeroGRescue(st))
      );
    }
  });

  return (
    <group>
      <color attach="background" args={['#020612']} />
      <ambientLight intensity={0.78} />
      <hemisphereLight args={['#e0f2fe', '#0ea5e9', 0.9]} />
      <directionalLight position={[26, 20, 22]} intensity={2.45} color="#ffffff" />
      <SpaceGameStarfield tintHex="#a855f7" count={1300} />

      {/* Curved Blue Earth Atmosphere + Glowing Rim Halo Below Orbital Station */}
      <group position={[0, -56, -10]}>
        <mesh raycast={NOOP_RAYCAST}>
          <sphereGeometry args={[46, 40, 32]} />
          <meshStandardMaterial color="#0369a1" emissive="#0284c7" emissiveIntensity={0.34} roughness={0.58} />
        </mesh>
        <mesh raycast={NOOP_RAYCAST}>
          <sphereGeometry args={[47.6, 36, 28]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.22} side={THREE.BackSide} />
        </mesh>
      </group>

      {/* Modular ISS-Style Orbital Station Hull & Solar Arrays */}
      <group position={[0, 0, 0]}>
        {/* Main Pressurized Spine */}
        <mesh rotation={[0, 0, Math.PI / 2]} raycast={NOOP_RAYCAST}>
          <cylinderGeometry args={[1.35, 1.35, 22, 18]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.65} roughness={0.32} />
        </mesh>
        {/* Cross Truss & Docking Hub */}
        <mesh rotation={[Math.PI / 2, 0, 0]} raycast={NOOP_RAYCAST}>
          <cylinderGeometry args={[1.1, 1.1, 15, 14]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.72} roughness={0.36} />
        </mesh>
        <mesh raycast={NOOP_RAYCAST}>
          <sphereGeometry args={[2.1, 18, 16]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* 4 Gleaming Solar Arrays */}
        {[-12, -8, 8, 12].map((sx, i) => (
          <group key={i} position={[sx, 0, 0]}>
            <mesh position={[0, 5.2, 0]} raycast={NOOP_RAYCAST}>
              <boxGeometry args={[2.6, 7.6, 0.12]} />
              <meshStandardMaterial color="#1e3a8a" emissive="#0284c7" emissiveIntensity={0.2} metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0, -5.2, 0]} raycast={NOOP_RAYCAST}>
              <boxGeometry args={[2.6, 7.6, 0.12]} />
              <meshStandardMaterial color="#1e3a8a" emissive="#0284c7" emissiveIntensity={0.2} metalness={0.8} roughness={0.2} />
            </mesh>
          </group>
        ))}
      </group>

      {/* 4 Glowing Orbital Reactor Cores (ALPHA..DELTA) */}
      {stateRef.current.cores.map((core, idx) => (
        <mesh
          key={core.id}
          position={[core.x, core.y, core.z]}
          geometry={localRes.coreGeo}
          raycast={NOOP_RAYCAST}
        >
          <meshStandardMaterial
            ref={(mat) => {
              coreMatsRef.current[idx] = mat;
            }}
            color="#fb923c"
            emissive="#ef4444"
            emissiveIntensity={1.2}
            roughness={0.2}
          />
        </mesh>
      ))}

      {/* Zero-G Marine + Magnetic Grapple Tether + Parasites + Pulse Bolts */}
      <primitive object={marineRig.root} />
      <mesh
        ref={grappleBeamRef}
        visible={false}
        geometry={localRes.beamGeo}
        material={localRes.beamMat}
        raycast={NOOP_RAYCAST}
      />
      <instancedMesh
        ref={parasiteInstRef}
        args={[localRes.parasiteGeo, localRes.parasiteMat, MAX_PARASITES]}
        frustumCulled={false}
        raycast={NOOP_RAYCAST}
      />
      <instancedMesh
        ref={boltInstRef}
        args={[localRes.boltGeo, localRes.boltMat, MAX_BOLTS]}
        frustumCulled={false}
        raycast={NOOP_RAYCAST}
      />
    </group>
  );
};

export default ZeroGRescueScene;
