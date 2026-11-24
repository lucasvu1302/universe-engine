import type { GameRank, OdysseyWorldId } from '@/stores/useAppStore';
import { createGameChannel } from '@/scenes/SpaceGames/shared/gameRuntimeBus';

export interface OdysseyWorldConfig {
  id: OdysseyWorldId;
  gravityG: number;
  gravityAccel: number;
  jumpVel: number;
  jetpackThrust: number;
  nameVi: string;
  nameEn: string;
  skyColor: string;
  groundColor: string;
  accentColor: string;
}

export const ODYSSEY_WORLDS: Record<OdysseyWorldId, OdysseyWorldConfig> = {
  enceladus: {
    id: 'enceladus',
    gravityG: 0.11,
    gravityAccel: 7.2,
    jumpVel: 9.8,
    jetpackThrust: 13.5,
    nameVi: 'Enceladus (0.11g)',
    nameEn: 'Enceladus (0.11g)',
    skyColor: '#050b1c',
    groundColor: '#bae6fd',
    accentColor: '#38bdf8',
  },
  mars: {
    id: 'mars',
    gravityG: 0.38,
    gravityAccel: 14.2,
    jumpVel: 10.6,
    jetpackThrust: 22.0,
    nameVi: 'Sao Hỏa (0.38g)',
    nameEn: 'Mars (0.38g)',
    skyColor: '#1f0d09',
    groundColor: '#c25934',
    accentColor: '#fb923c',
  },
  venus: {
    id: 'venus',
    gravityG: 0.9,
    gravityAccel: 22.8,
    jumpVel: 11.4,
    jetpackThrust: 31.5,
    nameVi: 'Sao Kim (0.90g)',
    nameEn: 'Venus (0.90g)',
    skyColor: '#221506',
    groundColor: '#b45309',
    accentColor: '#fbbf24',
  },
};

export interface OdysseyPlatform {
  id: number;
  baseX: number;
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  moveAmpX: number;
  moveSpeed: number;
  hasGeyser: boolean;
  isCheckpoint: boolean;
}

export interface OdysseyCore {
  id: number;
  x: number;
  y: number;
  z: number;
  collected: boolean;
}

export interface OdysseyLaserGate {
  id: number;
  x: number;
  y: number;
  z: number;
  angle: number;
  speed: number;
  length: number;
}

export interface OdysseyStepEvents {
  jumped: boolean;
  geyserBoost: boolean;
  coreCollected: boolean;
  fell: boolean;
  victory: boolean;
  laserHit: boolean;
}

export interface JetpackOdysseyState {
  world: OdysseyWorldId;
  phase: 'playing' | 'victory';
  player: { x: number; y: number; z: number; vx: number; vy: number; vz: number; yaw: number; speedNorm: number };
  checkpoint: { x: number; y: number; z: number };
  grounded: boolean;
  groundedPlatformId: number | null;
  laserInvulnTimer: number;
  jetpacking: boolean;
  fuel: number;
  elapsedSec: number;
  falls: number;
  coresCollected: number;
  portalUnlocked: boolean;
  rank: GameRank | null;
  platforms: OdysseyPlatform[];
  cores: OdysseyCore[];
  laserGates: OdysseyLaserGate[];
  portal: { x: number; y: number; z: number };
}

export interface JetpackOdysseyHudSnapshot {
  world: OdysseyWorldId;
  gravityG: number;
  phase: 'playing' | 'victory';
  fuel: number;
  elapsedSec: number;
  falls: number;
  coresCollected: number;
  totalCores: number;
  portalUnlocked: boolean;
  rank: GameRank | null;
}

export type JetpackOdysseyCommand =
  | { type: 'switch_world'; world: OdysseyWorldId }
  | { type: 'restart' };

export function gradeOdysseyRank(timeSec: number): GameRank {
  if (timeSec <= 35) return 'S';
  if (timeSec <= 55) return 'A';
  if (timeSec <= 80) return 'B';
  return 'C';
}

export function createJetpackOdysseyState(world: OdysseyWorldId = 'mars'): JetpackOdysseyState {
  const heightScale = world === 'enceladus' ? 1.25 : world === 'venus' ? 0.85 : 1.0;

  const platforms: OdysseyPlatform[] = [
    { id: 0, baseX: 0, x: 0, y: 0, z: 0, w: 6.5, d: 6.5, moveAmpX: 0, moveSpeed: 0, hasGeyser: false, isCheckpoint: true },
    { id: 1, baseX: 0, x: 0, y: 1.1 * heightScale, z: -8.5, w: 5.0, d: 5.0, moveAmpX: 0, moveSpeed: 0, hasGeyser: false, isCheckpoint: false },
    { id: 2, baseX: 3.6, x: 3.6, y: 2.3 * heightScale, z: -16.5, w: 4.8, d: 4.8, moveAmpX: 2.2, moveSpeed: 1.1, hasGeyser: false, isCheckpoint: false },
    { id: 3, baseX: -2.0, x: -2.0, y: 3.1 * heightScale, z: -24.5, w: 5.2, d: 5.2, moveAmpX: 0, moveSpeed: 0, hasGeyser: true, isCheckpoint: true },
    { id: 4, baseX: -2.0, x: -2.0, y: 6.4 * heightScale, z: -33.5, w: 5.0, d: 5.0, moveAmpX: 0, moveSpeed: 0, hasGeyser: false, isCheckpoint: false },
    { id: 5, baseX: 3.2, x: 3.2, y: 7.2 * heightScale, z: -42.5, w: 4.6, d: 4.6, moveAmpX: 2.6, moveSpeed: 1.35, hasGeyser: false, isCheckpoint: false },
    { id: 6, baseX: 0, x: 0, y: 8.2 * heightScale, z: -51.5, w: 5.5, d: 5.5, moveAmpX: 0, moveSpeed: 0, hasGeyser: true, isCheckpoint: true },
    { id: 7, baseX: 0, x: 0, y: 11.4 * heightScale, z: -61.0, w: 7.2, d: 7.2, moveAmpX: 0, moveSpeed: 0, hasGeyser: false, isCheckpoint: false },
  ];

  const cores: OdysseyCore[] = [
    { id: 1, x: platforms[1].x, y: platforms[1].y + 1.8, z: platforms[1].z, collected: false },
    { id: 2, x: platforms[2].baseX, y: platforms[2].y + 1.8, z: platforms[2].z, collected: false },
    { id: 3, x: platforms[4].x, y: platforms[4].y + 1.8, z: platforms[4].z, collected: false },
    { id: 4, x: platforms[5].baseX, y: platforms[5].y + 1.8, z: platforms[5].z, collected: false },
    { id: 5, x: platforms[6].x, y: platforms[6].y + 2.2, z: platforms[6].z, collected: false },
  ];

  const laserGates: OdysseyLaserGate[] = [
    { id: 1, x: platforms[4].x, y: platforms[4].y + 1.15, z: platforms[4].z + 2.1, angle: 0, speed: 1.4, length: 3.2 },
    { id: 2, x: platforms[6].x, y: platforms[6].y + 1.15, z: platforms[6].z + 2.1, angle: 1.2, speed: -1.65, length: 3.4 },
  ];

  const finalPlat = platforms[platforms.length - 1];

  return {
    world,
    phase: 'playing',
    player: { x: 0, y: 0.6, z: 0, vx: 0, vy: 0, vz: 0, yaw: Math.PI, speedNorm: 0 },
    checkpoint: { x: 0, y: 1.2, z: 0 },
    grounded: true,
    groundedPlatformId: 0,
    laserInvulnTimer: 0,
    jetpacking: false,
    fuel: 100,
    elapsedSec: 0,
    falls: 0,
    coresCollected: 0,
    portalUnlocked: false,
    rank: null,
    platforms,
    cores,
    laserGates,
    portal: { x: finalPlat.x, y: finalPlat.y + 1.8, z: finalPlat.z - 1.2 },
  };
}

export function stepJetpackOdyssey(
  state: JetpackOdysseyState,
  rawDt: number,
  input: { moveX: number; moveZ: number; jump: boolean; jetpack: boolean }
): OdysseyStepEvents {
  const events: OdysseyStepEvents = {
    jumped: false,
    geyserBoost: false,
    coreCollected: false,
    fell: false,
    victory: false,
    laserHit: false,
  };

  if (state.phase !== 'playing') return events;
  const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
  const cfg = ODYSSEY_WORLDS[state.world];
  state.elapsedSec += dt;
  state.laserInvulnTimer = Math.max(0, state.laserInvulnTimer - dt);

  // Move moving orbital bridges & carry player horizontally while standing on one (G12)
  for (const plat of state.platforms) {
    if (plat.moveAmpX > 0) {
      const prevPlatX = plat.x;
      plat.x = plat.baseX + Math.sin(state.elapsedSec * plat.moveSpeed) * plat.moveAmpX;
      if (state.grounded && state.groundedPlatformId === plat.id) {
        state.player.x += plat.x - prevPlatX;
      }
    }
  }

  // Rotate laser hazards
  for (const gate of state.laserGates) {
    gate.angle += gate.speed * dt;
  }

  // Horizontal movement
  let mx = input.moveX;
  let mz = input.moveZ;
  const mag = Math.hypot(mx, mz);
  if (mag > 1) {
    mx /= mag;
    mz /= mag;
  }
  const horizSpeed = 9.4;
  state.player.vx = mx * horizSpeed;
  state.player.vz = mz * horizSpeed;
  state.player.speedNorm = Math.min(1, mag);
  if (mag > 0.1) {
    state.player.yaw = Math.atan2(mx, mz);
  }

  // Jump & Jetpack thrust
  if (input.jump && state.grounded) {
    state.player.vy = cfg.jumpVel;
    state.grounded = false;
    events.jumped = true;
  }

  const wantsJetpack = input.jetpack && !state.grounded && state.fuel > 0;
  state.jetpacking = wantsJetpack;
  if (wantsJetpack) {
    state.player.vy += cfg.jetpackThrust * dt;
    state.player.vy = Math.min(state.player.vy, 11.5);
    state.fuel = Math.max(0, state.fuel - 36 * dt);
  } else if (state.grounded) {
    state.fuel = Math.min(100, state.fuel + 45 * dt);
  } else {
    state.fuel = Math.min(100, state.fuel + 8 * dt);
  }

  // Gravity integration
  state.player.vy -= cfg.gravityAccel * dt;

  const prevY = state.player.y;
  state.player.x += state.player.vx * dt;
  state.player.y += state.player.vy * dt;
  state.player.z += state.player.vz * dt;

  // Platform landing collision
  state.grounded = false;
  state.groundedPlatformId = null;
  for (const plat of state.platforms) {
    const halfW = plat.w * 0.5 + 0.35;
    const halfD = plat.d * 0.5 + 0.35;
    const insideXZ =
      Math.abs(state.player.x - plat.x) <= halfW && Math.abs(state.player.z - plat.z) <= halfD;
    const topY = plat.y + 0.5;
    if (insideXZ && state.player.vy <= 0 && prevY >= topY - 0.55 && state.player.y <= topY + 0.25) {
      state.player.y = topY;
      state.player.vy = 0;
      state.grounded = true;
      state.groundedPlatformId = plat.id;
      if (plat.isCheckpoint) {
        // Offset checkpoint horizontally away from central geyser vents so respawn never pogo-loops (G8)
        state.checkpoint = {
          x: plat.hasGeyser ? plat.x - 1.65 : plat.x,
          y: topY + 0.6,
          z: plat.z,
        };
      }
      if (plat.hasGeyser && Math.hypot(state.player.x - plat.x, state.player.z - plat.z) < 1.35) {
        state.player.vy = cfg.jumpVel * 1.48;
        state.grounded = false;
        state.groundedPlatformId = null;
        events.geyserBoost = true;
      }
      break;
    }
  }

  // Collect Quantum Cores (before hazard knockback so reaching a core always counts)
  for (const core of state.cores) {
    if (core.collected) continue;
    const dist = Math.hypot(state.player.x - core.x, state.player.y - core.y, state.player.z - core.z);
    if (dist < 1.95) {
      core.collected = true;
      state.coresCollected += 1;
      events.coreCollected = true;
      if (state.coresCollected >= state.cores.length) {
        state.portalUnlocked = true;
      }
    }
  }

  // Laser gate knockback check with brief i-frame guard to prevent consecutive-frame double knockback (G2)
  if (state.laserInvulnTimer <= 0) {
    for (const gate of state.laserGates) {
      if (Math.abs(state.player.y - gate.y) < 1.1) {
        const dx = state.player.x - gate.x;
        const dz = state.player.z - gate.z;
        const cos = Math.cos(gate.angle);
        const sin = Math.sin(gate.angle);
        const along = dx * cos + dz * sin;
        const perp = Math.abs(-dx * sin + dz * cos);
        if (Math.abs(along) < gate.length * 0.5 && perp < 0.55) {
          state.player.z += 2.2;
          state.player.vy = Math.max(state.player.vy, 3.5);
          state.laserInvulnTimer = 0.35;
          events.laserHit = true;
          break;
        }
      }
    }
  }

  // Fall below abyss -> instant checkpoint respawn + 1.0s speedrun penalty
  if (state.player.y < -8) {
    state.falls += 1;
    state.elapsedSec += 1.0;
    state.player.x = state.checkpoint.x;
    state.player.y = state.checkpoint.y;
    state.player.z = state.checkpoint.z;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.vz = 0;
    state.fuel = 100;
    state.grounded = false;
    state.groundedPlatformId = null;
    events.fell = true;
  }

  // Reach unlocked Quantum Portal -> Victory!
  if (state.portalUnlocked) {
    const portalDist = Math.hypot(
      state.player.x - state.portal.x,
      state.player.y - state.portal.y,
      state.player.z - state.portal.z
    );
    if (portalDist < 2.6) {
      state.phase = 'victory';
      state.rank = gradeOdysseyRank(state.elapsedSec);
      events.victory = true;
    }
  }

  return events;
}

export function snapshotJetpackOdyssey(state: JetpackOdysseyState): JetpackOdysseyHudSnapshot {
  return {
    world: state.world,
    gravityG: ODYSSEY_WORLDS[state.world].gravityG,
    phase: state.phase,
    fuel: Math.round(state.fuel),
    elapsedSec: Math.round(state.elapsedSec * 100) / 100,
    falls: state.falls,
    coresCollected: state.coresCollected,
    totalCores: state.cores.length,
    portalUnlocked: state.portalUnlocked,
    rank: state.rank,
  };
}

export const jetpackOdysseyChannel = createGameChannel<JetpackOdysseyHudSnapshot, JetpackOdysseyCommand>(
  snapshotJetpackOdyssey(createJetpackOdysseyState('mars'))
);
