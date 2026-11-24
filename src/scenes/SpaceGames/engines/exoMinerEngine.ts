import type { MinerUpgradeKey } from '@/stores/useAppStore';
import { createGameChannel } from '@/scenes/SpaceGames/shared/gameRuntimeBus';

export type CrystalVeinType = 'helium3' | 'cryo' | 'magma';

export const ORE_VALUES: Record<CrystalVeinType, number> = {
  helium3: 25,
  cryo: 45,
  magma: 75,
};

export interface CrystalVein {
  id: number;
  type: CrystalVeinType;
  x: number;
  z: number;
  remaining: number;
  maxRemaining: number;
  respawnTimer: number;
}

export interface AlienBug {
  id: number;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  speed: number;
}

export interface TurretShot {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  life: number;
}

export interface MinerStepEvents {
  minedOre: boolean;
  soldCredits: number;
  turretFired: boolean;
  bugHit: boolean;
  evacuated: boolean;
}

export interface ExoMinerState {
  phase: 'playing' | 'evacuated';
  elapsedSec: number;
  dayPhase: number; // 0..1 (<0.6 day, >=0.6 night/storm)
  isDustStorm: boolean;
  inBaseZone: boolean;
  isMining: boolean;
  miningTargetVeinId: number | null;
  miningProgress: number;
  player: { x: number; z: number; yaw: number; speedNorm: number };
  o2: number;
  battery: number;
  cargoCount: number;
  cargoCapacity: number;
  cargoValue: number;
  sessionCreditsEarned: number;
  sessionScore: number;
  upgrades: Record<MinerUpgradeKey, number>;
  turretFireTimer: number;
  bugSpawnTimer: number;
  nextEntityId: number;
  veins: CrystalVein[];
  bugs: AlienBug[];
  turretShots: TurretShot[];
}

export interface ExoMinerHudSnapshot {
  phase: 'playing' | 'evacuated';
  o2: number;
  battery: number;
  cargoCount: number;
  cargoCapacity: number;
  cargoValue: number;
  sessionCreditsEarned: number;
  sessionScore: number;
  inBaseZone: boolean;
  isMining: boolean;
  isDustStorm: boolean;
  isNight: boolean;
  activeTurrets: number;
  bugCount: number;
}

export type ExoMinerCommand =
  | { type: 'restart' }
  | { type: 'sync_upgrades'; upgrades: Record<MinerUpgradeKey, number> }
  | { type: 'set_paused'; paused: boolean };

export const BASE_RADIUS = 6.5;
const HABITAT_DOME_COLLISION_RADIUS = 3.9;
const FIELD_LIMIT = 27;

export const TURRET_SLOTS: Array<{ x: number; z: number }> = [
  { x: 5.2, z: -2.2 },
  { x: -5.2, z: -2.2 },
  { x: 0, z: 5.5 },
];

export function createExoMinerState(upgrades: Record<MinerUpgradeKey, number>): ExoMinerState {
  const veins: CrystalVein[] = [
    { id: 1, type: 'helium3', x: -10, z: -8, remaining: 4, maxRemaining: 4, respawnTimer: 0 },
    { id: 2, type: 'helium3', x: 11, z: -7, remaining: 4, maxRemaining: 4, respawnTimer: 0 },
    { id: 3, type: 'cryo', x: -16, z: 9, remaining: 3, maxRemaining: 3, respawnTimer: 0 },
    { id: 4, type: 'cryo', x: 15, z: 11, remaining: 3, maxRemaining: 3, respawnTimer: 0 },
    { id: 5, type: 'magma', x: -18, z: -17, remaining: 3, maxRemaining: 3, respawnTimer: 0 },
    { id: 6, type: 'magma', x: 19, z: -16, remaining: 3, maxRemaining: 3, respawnTimer: 0 },
  ];

  return {
    phase: 'playing',
    elapsedSec: 0,
    dayPhase: 0.1,
    isDustStorm: false,
    inBaseZone: true,
    isMining: false,
    miningTargetVeinId: null,
    miningProgress: 0,
    player: { x: 0, z: 4.6, yaw: Math.PI, speedNorm: 0 },
    o2: 100,
    battery: 100,
    cargoCount: 0,
    cargoCapacity: 8 + (upgrades.o2 - 1) * 2,
    cargoValue: 0,
    sessionCreditsEarned: 0,
    sessionScore: 0,
    upgrades: { ...upgrades },
    turretFireTimer: 0.4,
    bugSpawnTimer: 5.0,
    nextEntityId: 10,
    veins,
    bugs: [],
    turretShots: [],
  };
}

export function stepExoMiner(
  state: ExoMinerState,
  rawDt: number,
  input: { moveX: number; moveZ: number; mine: boolean; boost: boolean }
): MinerStepEvents {
  const events: MinerStepEvents = {
    minedOre: false,
    soldCredits: 0,
    turretFired: false,
    bugHit: false,
    evacuated: false,
  };

  if (state.phase !== 'playing') return events;
  const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
  state.elapsedSec += dt;

  // Dynamic Day/Night & Dust Storm cycle (every 45s)
  state.dayPhase = (state.elapsedSec % 45) / 45;
  const isNight = state.dayPhase >= 0.58;
  state.isDustStorm = state.dayPhase >= 0.45 && state.dayPhase <= 0.72;

  // Movement
  let mx = input.moveX;
  let mz = input.moveZ;
  const mag = Math.hypot(mx, mz);
  if (mag > 1) {
    mx /= mag;
    mz /= mag;
  }

  const boostActive = input.boost && state.battery > 5;
  const baseSpeed = 6.8 + (state.upgrades.jetpack - 1) * 1.1;
  const speed = (boostActive ? baseSpeed * 1.6 : baseSpeed) * (state.isDustStorm ? 0.85 : 1.0);
  state.player.x = Math.max(-FIELD_LIMIT, Math.min(FIELD_LIMIT, state.player.x + mx * speed * dt));
  state.player.z = Math.max(-FIELD_LIMIT, Math.min(FIELD_LIMIT, state.player.z + mz * speed * dt));

  // Keep astronaut cleanly outside the r=3.4 physical Habitat Dome shell (still inside BASE_RADIUS=6.5)
  const rawBaseDist = Math.hypot(state.player.x, state.player.z);
  if (rawBaseDist < HABITAT_DOME_COLLISION_RADIUS) {
    if (rawBaseDist > 1e-4) {
      state.player.x = (state.player.x / rawBaseDist) * HABITAT_DOME_COLLISION_RADIUS;
      state.player.z = (state.player.z / rawBaseDist) * HABITAT_DOME_COLLISION_RADIUS;
    } else {
      state.player.x = 0;
      state.player.z = HABITAT_DOME_COLLISION_RADIUS;
    }
  }

  state.player.speedNorm = Math.min(1, mag + (boostActive ? 0.4 : 0));
  if (mag > 0.1) {
    state.player.yaw = Math.atan2(mx, mz);
  }

  // Habitat Base zone: auto-refill O2 & battery + auto-sell carried ore
  const distToBase = Math.hypot(state.player.x, state.player.z);
  state.inBaseZone = distToBase <= BASE_RADIUS;
  if (state.inBaseZone) {
    state.o2 = 100;
    state.battery = 100;
    if (state.cargoValue > 0) {
      events.soldCredits = state.cargoValue;
      state.sessionCreditsEarned += state.cargoValue;
      state.sessionScore += state.cargoValue;
      state.cargoCount = 0;
      state.cargoValue = 0;
    }
  } else {
    const o2Drain = (state.isDustStorm ? 4.8 : 2.9) / (1 + (state.upgrades.o2 - 1) * 0.35);
    state.o2 = Math.max(0, state.o2 - o2Drain * dt);
    if (boostActive) {
      state.battery = Math.max(0, state.battery - 18 * dt);
    }
  }

  // Respawn depleted crystal veins
  for (const v of state.veins) {
    if (v.remaining <= 0) {
      v.respawnTimer -= dt;
      if (v.respawnTimer <= 0) {
        v.remaining = v.maxRemaining;
      }
    }
  }

  // Laser Mining nearest vein within 4.5 units
  state.isMining = false;
  state.miningTargetVeinId = null;
  if (input.mine && state.battery > 1 && state.cargoCount < state.cargoCapacity) {
    let closestVein: CrystalVein | null = null;
    let closestDist = 4.6;
    for (const v of state.veins) {
      if (v.remaining <= 0) continue;
      const d = Math.hypot(v.x - state.player.x, v.z - state.player.z);
      if (d < closestDist) {
        closestDist = d;
        closestVein = v;
      }
    }
    if (closestVein) {
      state.isMining = true;
      state.miningTargetVeinId = closestVein.id;
      state.player.yaw = Math.atan2(closestVein.x - state.player.x, closestVein.z - state.player.z);
      const laserSpeed = 0.72 + (state.upgrades.laser - 1) * 0.32;
      state.miningProgress += laserSpeed * dt;
      state.battery = Math.max(0, state.battery - 6.5 * dt);
      if (state.miningProgress >= 1.0) {
        state.miningProgress = 0;
        closestVein.remaining -= 1;
        if (closestVein.remaining <= 0) {
          closestVein.respawnTimer = 14;
        }
        state.cargoCount += 1;
        state.cargoValue += ORE_VALUES[closestVein.type];
        events.minedOre = true;
      }
    }
  } else {
    state.miningProgress = Math.max(0, state.miningProgress - dt * 0.5);
  }

  // Night alien bugs spawn outside base perimeter
  state.bugSpawnTimer -= dt;
  const maxBugs = isNight ? 6 : 2;
  if (state.bugSpawnTimer <= 0 && state.bugs.length < maxBugs) {
    state.bugSpawnTimer = isNight ? 3.2 : 8.5;
    const angle = (state.nextEntityId * 2.1) % (Math.PI * 2);
    state.bugs.push({
      id: state.nextEntityId++,
      x: Math.cos(angle) * 23,
      z: Math.sin(angle) * 23,
      hp: 32,
      maxHp: 32,
      speed: isNight ? 3.8 : 2.6,
    });
  }

  // Decay turret laser flashes
  for (let i = state.turretShots.length - 1; i >= 0; i--) {
    state.turretShots[i].life -= dt;
    if (state.turretShots[i].life <= 0) state.turretShots.splice(i, 1);
  }

  // Auto-Defense Turrets (0..3) protect base & perimeter
  const turretCount = Math.min(3, state.upgrades.turrets);
  if (turretCount > 0 && state.bugs.length > 0) {
    state.turretFireTimer -= dt;
    if (state.turretFireTimer <= 0) {
      state.turretFireTimer = 0.55;
      for (let t = 0; t < turretCount; t++) {
        const slot = TURRET_SLOTS[t];
        let target: AlienBug | null = null;
        let bestD = 15.5;
        for (const bug of state.bugs) {
          if (bug.hp <= 0) continue;
          const d = Math.hypot(bug.x - slot.x, bug.z - slot.z);
          if (d < bestD) {
            bestD = d;
            target = bug;
          }
        }
        if (target) {
          target.hp -= 18;
          state.turretShots.push({ x1: slot.x, z1: slot.z, x2: target.x, z2: target.z, life: 0.16 });
          events.turretFired = true;
        }
      }
    }
  }

  // Update alien bugs
  for (let i = state.bugs.length - 1; i >= 0; i--) {
    const bug = state.bugs[i];
    if (bug.hp <= 0) {
      state.sessionScore += 30;
      state.bugs.splice(i, 1);
      continue;
    }
    const dx = state.player.x - bug.x;
    const dz = state.player.z - bug.z;
    const dist = Math.hypot(dx, dz) || 1;
    if (dist > 0.8) {
      bug.x += (dx / dist) * bug.speed * dt;
      bug.z += (dz / dist) * bug.speed * dt;
    }
    // Enforce Habitat Base dome shield around origin (0, 0) so bugs cannot enter from any angle (G12)
    const bugOriginDist = Math.hypot(bug.x, bug.z);
    const shieldR = BASE_RADIUS + 0.8;
    if (bugOriginDist < shieldR) {
      if (bugOriginDist > 1e-4) {
        bug.x = (bug.x / bugOriginDist) * shieldR;
        bug.z = (bug.z / bugOriginDist) * shieldR;
      } else {
        bug.x = shieldR;
        bug.z = 0;
      }
    }
    if (dist < 1.3 && !state.inBaseZone) {
      state.o2 = Math.max(0, state.o2 - 14 * dt);
      events.bugHit = true;
    }
  }

  // Emergency Evacuation when O2 hits 0 -> forfeit only unbanked carried ore!
  if (state.o2 <= 0) {
    state.o2 = 0;
    state.cargoCount = 0;
    state.cargoValue = 0;
    state.phase = 'evacuated';
    events.evacuated = true;
  }

  return events;
}

export function snapshotExoMiner(state: ExoMinerState): ExoMinerHudSnapshot {
  return {
    phase: state.phase,
    o2: Math.round(state.o2),
    battery: Math.round(state.battery),
    cargoCount: state.cargoCount,
    cargoCapacity: state.cargoCapacity,
    cargoValue: state.cargoValue,
    sessionCreditsEarned: state.sessionCreditsEarned,
    sessionScore: state.sessionScore,
    inBaseZone: state.inBaseZone,
    isMining: state.isMining,
    isDustStorm: state.isDustStorm,
    isNight: state.dayPhase >= 0.58,
    activeTurrets: Math.min(3, state.upgrades.turrets),
    bugCount: state.bugs.length,
  };
}

export const exoMinerChannel = createGameChannel<ExoMinerHudSnapshot, ExoMinerCommand>(
  snapshotExoMiner(createExoMinerState({ o2: 1, laser: 1, jetpack: 1, turrets: 0 }))
);
