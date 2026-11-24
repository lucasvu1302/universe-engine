import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import { InputManager } from '@/engine/input/InputManager';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useAppStore, type OdysseyWorldId } from '@/stores/useAppStore';
import {
  animateHumanoidRun,
  buildAstronautRig,
  buildMiniTarsRig,
  disposeObjectTree,
  NOOP_RAYCAST,
} from '@/scenes/SpaceGames/shared/CharacterModels';
import { createHudThrottle } from '@/scenes/SpaceGames/shared/gameHudThrottle';
import { SpaceGameStarfield } from '@/scenes/SpaceGames/shared/SpaceGameBackdrop';
import {
  createJetpackOdysseyState,
  jetpackOdysseyChannel,
  ODYSSEY_WORLDS,
  snapshotJetpackOdyssey,
  stepJetpackOdyssey,
  type JetpackOdysseyState,
} from '@/scenes/SpaceGames/engines/jetpackOdysseyEngine';

export const JetpackOdysseyScene: React.FC = () => {
  const { camera } = useThree();
  const [world, setWorld] = useState<OdysseyWorldId>('mars');

  const stateRef = useRef<JetpackOdysseyState>(createJetpackOdysseyState('mars'));
  const throttleRef = useRef(createHudThrottle(67));
  const recordedRef = useRef(false);
  const prevJumpRef = useRef(false);
  const airTimeRef = useRef(0);

  const astroRig = useMemo(() => buildAstronautRig('#fbbf24'), []);
  const tarsRig = useMemo(() => buildMiniTarsRig(), []);

  const platRefs = useRef<Array<THREE.Group | null>>([]);
  const coreRefs = useRef<Array<THREE.Mesh | null>>([]);
  const laserRefs = useRef<Array<THREE.Mesh | null>>([]);
  const portalRef = useRef<THREE.Group>(null);
  const portalRingMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const portalDiscMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const localGeoMat = useMemo(() => {
    const coreGeo = new THREE.OctahedronGeometry(0.65, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: '#fbbf24',
      emissive: '#f59e0b',
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });
    // Unit-length cylinder along +X scaled per gate to exact g.length (matches hitbox 1:1, G2)
    const laserGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.0, 8);
    laserGeo.rotateZ(Math.PI / 2);
    const laserMat = new THREE.MeshBasicMaterial({ color: '#f43f5e' });
    const geyserGeo = new THREE.CylinderGeometry(0.95, 1.15, 0.25, 16);
    const geyserMat = new THREE.MeshBasicMaterial({ color: '#22d3ee', transparent: true, opacity: 0.8 });
    return { coreGeo, coreMat, laserGeo, laserMat, geyserGeo, geyserMat };
  }, []);

  useEffect(() => {
    const snapCameraToPlayer = () => {
      const p = stateRef.current.player;
      camera.position.set(p.x * 0.7, p.y + 6.2, p.z + 12.2);
      camera.lookAt(p.x, p.y + 1.2, p.z - 5.5);
    };

    jetpackOdysseyChannel.resetTouch();
    snapCameraToPlayer();
    jetpackOdysseyChannel.publishSnapshot(snapshotJetpackOdyssey(stateRef.current));

    const unsub = jetpackOdysseyChannel.subscribeCommand((cmd) => {
      if (cmd.type === 'switch_world') {
        stateRef.current = createJetpackOdysseyState(cmd.world);
        recordedRef.current = false;
        prevJumpRef.current = false;
        airTimeRef.current = 0;
        jetpackOdysseyChannel.resetTouch();
        snapCameraToPlayer();
        setWorld(cmd.world);
        throttleRef.current.forceEmit(performance.now(), () =>
          jetpackOdysseyChannel.publishSnapshot(snapshotJetpackOdyssey(stateRef.current))
        );
      } else if (cmd.type === 'restart') {
        stateRef.current = createJetpackOdysseyState(stateRef.current.world);
        recordedRef.current = false;
        prevJumpRef.current = false;
        airTimeRef.current = 0;
        jetpackOdysseyChannel.resetTouch();
        snapCameraToPlayer();
        throttleRef.current.forceEmit(performance.now(), () =>
          jetpackOdysseyChannel.publishSnapshot(snapshotJetpackOdyssey(stateRef.current))
        );
      }
    });

    return () => {
      unsub();
      jetpackOdysseyChannel.reset(snapshotJetpackOdyssey(createJetpackOdysseyState('mars')));
      disposeObjectTree(astroRig.root);
      disposeObjectTree(tarsRig.root);
      Object.values(localGeoMat).forEach((r) => r.dispose());
    };
  }, [astroRig, tarsRig, localGeoMat, camera]);

  useFrame((_, delta) => {
    const clampedDt = Math.min(Math.max(delta, 0.001), 0.05);
    const st = stateRef.current;
    const cfgLive = ODYSSEY_WORLDS[st.world];
    const input = InputManager.getInstance();

    let moveX = jetpackOdysseyChannel.touchMove.x;
    let moveZ = jetpackOdysseyChannel.touchMove.y;
    if (input.isKeyPressed('w') || input.isKeyPressed('ArrowUp')) moveZ -= 1;
    if (input.isKeyPressed('s') || input.isKeyPressed('ArrowDown')) moveZ += 1;
    if (input.isKeyPressed('a') || input.isKeyPressed('ArrowLeft')) moveX -= 1;
    if (input.isKeyPressed('d') || input.isKeyPressed('ArrowRight')) moveX += 1;

    // Rising-edge jump prevents accidental pogo-bounce on landing; Space engages jetpack after short jump grace (G10)
    const spaceHeld = input.isKeyPressed(' ') || input.isKeyPressed('Space');
    const jumpHeld = spaceHeld || Boolean(jetpackOdysseyChannel.touchActions.jump);
    const jump = jumpHeld && !prevJumpRef.current;
    prevJumpRef.current = jumpHeld;

    if (st.grounded) {
      airTimeRef.current = 0;
    } else {
      airTimeRef.current += clampedDt;
    }

    const jetpack =
      (spaceHeld && !st.grounded && (airTimeRef.current > 0.16 || st.player.vy < cfgLive.jumpVel * 0.65)) ||
      input.isKeyPressed('Shift') ||
      Boolean(jetpackOdysseyChannel.touchActions.jetpack);

    const ev = stepJetpackOdyssey(st, clampedDt, { moveX, moveZ, jump, jetpack });
    const audio = AudioManager.getInstance();
    if (ev.jumped || ev.geyserBoost) audio.playDashBoost();
    if (ev.coreCollected) audio.playCorePickup();
    if (ev.fell || ev.laserHit) audio.playHitDamage();
    if (ev.victory) {
      audio.playVictoryFanfare();
      jetpackOdysseyChannel.resetTouch();
      if (!recordedRef.current && st.rank) {
        recordedRef.current = true;
        useAppStore.getState().recordGameResult('jetpack_odyssey', {
          world: st.world,
          timeSec: st.elapsedSec,
          rank: st.rank,
        });
      }
    }

    // Update Astronaut & mini TARS companion
    astroRig.root.position.set(st.player.x, st.player.y - 0.5, st.player.z);
    astroRig.root.rotation.y = st.player.yaw;
    animateHumanoidRun(astroRig, st.elapsedSec, st.player.speedNorm, st.jetpacking || !st.grounded);

    const tarsDamp = 1 - Math.exp(-5 * clampedDt);
    const tarsTargetX = st.player.x + 1.45;
    const tarsTargetY = st.player.y + 1.15 + Math.sin(st.elapsedSec * 3.5) * 0.25;
    const tarsTargetZ = st.player.z + 1.2;
    tarsRig.root.position.x += (tarsTargetX - tarsRig.root.position.x) * tarsDamp;
    tarsRig.root.position.y += (tarsTargetY - tarsRig.root.position.y) * tarsDamp;
    tarsRig.root.position.z += (tarsTargetZ - tarsRig.root.position.z) * tarsDamp;
    tarsRig.root.rotation.y = st.elapsedSec * 0.8;

    // Sync moving platforms (zero-closure indexed loops, M11)
    for (let idx = 0; idx < st.platforms.length; idx++) {
      const p = st.platforms[idx];
      const g = platRefs.current[idx];
      if (g) g.position.set(p.x, p.y, p.z);
    }

    // Sync cores
    for (let idx = 0; idx < st.cores.length; idx++) {
      const c = st.cores[idx];
      const m = coreRefs.current[idx];
      if (m) {
        m.visible = !c.collected;
        m.position.set(c.x, c.y + Math.sin(st.elapsedSec * 3.4 + c.id) * 0.25, c.z);
        m.rotation.y = st.elapsedSec * 2.2;
      }
    }

    // Sync laser gates (-g.angle matches engine (+cos, +sin) hitbox direction 1:1, G2)
    for (let idx = 0; idx < st.laserGates.length; idx++) {
      const g = st.laserGates[idx];
      const m = laserRefs.current[idx];
      if (m) {
        m.rotation.y = -g.angle;
        m.scale.set(g.length, 1, 1);
      }
    }

    // Spin Quantum Portal & update unlocked visual glow with numeric hex (zero regex allocs, M11)
    if (portalRef.current) {
      portalRef.current.rotation.z = st.elapsedSec * (st.portalUnlocked ? 2.4 : 0.45);
    }
    if (portalRingMatRef.current) {
      portalRingMatRef.current.color.setHex(st.portalUnlocked ? 0x34d399 : 0x64748b);
      portalRingMatRef.current.emissive.setHex(st.portalUnlocked ? 0x10b981 : 0x334155);
      portalRingMatRef.current.emissiveIntensity = st.portalUnlocked ? 1.85 : 0.4;
    }
    if (portalDiscMatRef.current) {
      portalDiscMatRef.current.color.setHex(st.portalUnlocked ? 0x22d3ee : 0x475569);
      portalDiscMatRef.current.opacity = st.portalUnlocked ? 0.52 : 0.18;
    }

    // Frame-rate-independent 3rd-person parkour camera (M8)
    const camDamp = 1 - Math.exp(-6.5 * clampedDt);
    const camTargetX = st.player.x * 0.7;
    const camTargetY = st.player.y + 6.2;
    const camTargetZ = st.player.z + 12.2;
    camera.position.x += (camTargetX - camera.position.x) * camDamp;
    camera.position.y += (camTargetY - camera.position.y) * camDamp;
    camera.position.z += (camTargetZ - camera.position.z) * camDamp;
    camera.lookAt(st.player.x, st.player.y + 1.2, st.player.z - 5.5);

    const now = performance.now();
    if (ev.victory || ev.coreCollected || ev.fell) {
      throttleRef.current.forceEmit(now, () =>
        jetpackOdysseyChannel.publishSnapshot(snapshotJetpackOdyssey(st))
      );
    } else {
      throttleRef.current.maybeEmit(now, () =>
        jetpackOdysseyChannel.publishSnapshot(snapshotJetpackOdyssey(st))
      );
    }
  });

  const cfg = ODYSSEY_WORLDS[world];
  const st = stateRef.current;

  return (
    <group>
      <color attach="background" args={[cfg.skyColor]} />
      <fog attach="fog" args={[cfg.skyColor, 26, 110]} />
      <ambientLight intensity={0.8} />
      <hemisphereLight args={['#e0f2fe', cfg.groundColor, 0.9]} />
      <directionalLight position={[15, 32, 20]} intensity={2.3} color="#fffbeb" />
      <SpaceGameStarfield tintHex={cfg.accentColor} />

      {/* Giant Horizon Planet Backdrop */}
      <group position={[-10, 22, -92]}>
        <mesh raycast={NOOP_RAYCAST}>
          <sphereGeometry args={[15, 28, 24]} />
          <meshStandardMaterial
            color={world === 'enceladus' ? '#e6c58b' : cfg.accentColor}
            emissive={world === 'enceladus' ? '#b45309' : cfg.accentColor}
            emissiveIntensity={0.22}
            roughness={0.72}
          />
        </mesh>
        {world === 'enceladus' && (
          <mesh rotation={[Math.PI / 2.5, 0.18, 0.12]} raycast={NOOP_RAYCAST}>
            <ringGeometry args={[19, 33, 56]} />
            <meshBasicMaterial color="#fde68a" transparent opacity={0.68} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>

      {/* Platforms & Geyser Vents */}
      {st.platforms.map((p, idx) => (
        <group
          key={`${world}-${p.id}`}
          ref={(el) => {
            platRefs.current[idx] = el;
          }}
          position={[p.x, p.y, p.z]}
        >
          <mesh raycast={NOOP_RAYCAST}>
            <boxGeometry args={[p.w, 1.0, p.d]} />
            <meshStandardMaterial color={cfg.groundColor} roughness={0.78} metalness={0.12} />
          </mesh>
          <mesh position={[0, 0.52, 0]} raycast={NOOP_RAYCAST}>
            <boxGeometry args={[p.w * 0.92, 0.08, p.d * 0.92]} />
            <meshStandardMaterial
              color={p.isCheckpoint ? '#38bdf8' : cfg.accentColor}
              emissive={p.isCheckpoint ? '#0284c7' : cfg.accentColor}
              emissiveIntensity={0.45}
            />
          </mesh>
          {p.hasGeyser && (
            <mesh
              position={[0, 0.64, 0]}
              geometry={localGeoMat.geyserGeo}
              material={localGeoMat.geyserMat}
              raycast={NOOP_RAYCAST}
            />
          )}
        </group>
      ))}

      {/* 5 Collectible Quantum Cores */}
      {st.cores.map((c, idx) => (
        <mesh
          key={`${world}-core-${c.id}`}
          ref={(el) => {
            coreRefs.current[idx] = el;
          }}
          position={[c.x, c.y, c.z]}
          geometry={localGeoMat.coreGeo}
          material={localGeoMat.coreMat}
          raycast={NOOP_RAYCAST}
        />
      ))}

      {/* Rotating Laser Hazard Gates */}
      {st.laserGates.map((g, idx) => (
        <mesh
          key={`${world}-laser-${g.id}`}
          ref={(el) => {
            laserRefs.current[idx] = el;
          }}
          position={[g.x, g.y, g.z]}
          geometry={localGeoMat.laserGeo}
          material={localGeoMat.laserMat}
          raycast={NOOP_RAYCAST}
        />
      ))}

      {/* Summit Quantum Portal */}
      <group ref={portalRef} position={[st.portal.x, st.portal.y, st.portal.z]}>
        <mesh raycast={NOOP_RAYCAST}>
          <torusGeometry args={[2.1, 0.24, 14, 32]} />
          <meshStandardMaterial
            ref={portalRingMatRef}
            color="#64748b"
            emissive="#334155"
            emissiveIntensity={0.4}
          />
        </mesh>
        <mesh raycast={NOOP_RAYCAST}>
          <circleGeometry args={[1.85, 24]} />
          <meshBasicMaterial
            ref={portalDiscMatRef}
            color="#475569"
            transparent
            opacity={0.18}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* Astronaut + TARS Companion */}
      <primitive object={astroRig.root} />
      <primitive object={tarsRig.root} />
    </group>
  );
};

export default JetpackOdysseyScene;
