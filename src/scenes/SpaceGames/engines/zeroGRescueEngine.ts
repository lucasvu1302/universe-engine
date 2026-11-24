import type { GameRank } from '@/stores/useAppStore';
import { createGameChannel } from '@/scenes/SpaceGames/shared/gameRuntimeBus';

export interface ReactorCore {
  id: number;
  label: 'ALPHA' | 'BETA' | 'GAMMA' | 'DELTA';
  x: number;
  y: number;
  z: number;
  repairSec: number;
  requiredSec: number;
  repaired: boolean;
}

export interface OrbitalParasite {
  id: number;
  x: number;
  y: number;
  z: number;
  hp: number;
  maxHp: number;
  targetCoreIndex: number;
}

export interface PulseBolt {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
}

export interface RescueStepEvents {
  fired: boolean;
  parasiteKilled: boolean;
  coreRepaired: boolean;
  grappleActive: boolean;
  hit: boolean;
  victory: boolean;
  failed: boolean;
}

export interface ZeroGRescueState {
  phase: 'playing' | 'victory' | 'failed';
  failReason: 'timeout' | 'armor' | null;
  stabilitySec: number;
  suitArmor: number;
  maxSuitArmor: number;
  elapsedSec: number;
  score: number;
  parasitesCleared: number;
  rank: GameRank | null;
  player: { x: number; y: number; z: number; vx: number; vy: number; vz: number; yaw: number };
  fireCooldown: number;
  grappleTargetCoreIndex: number | null;
  repairingCoreIndex: number | null;
  spawnTimer: number;
  nextEntityId: number;
  cores: ReactorCore[];
  parasites: OrbitalParasite[];
  bolts: PulseBolt[];
}

export interface ZeroGRescueHudSnapshot {
  phase: 'playing' | 'victory' | 'failed';
  failReason: 'timeout' | 'armor' | null;
  stabilitySec: number;
  suitArmor: number;
  score: number;
  parasitesCleared: number;
  rank: GameRank | null;
  grappleActive: boolean;
  repairingLabel: string | null;
  cores: Array<{ label: string; pct: number; repaired: boolean }>;
}

export type ZeroGRescueCommand = { type: 'restart' };

export function gradeRescueRank(remainingSec: number): GameRank {
  if (remainingSec >= 65) return 'S';
  if (remainingSec >= 40) return 'A';
  if (remainingSec >= 20) return 'B';
  return 'C';
}

export function createZeroGRescueState(): ZeroGRescueState {
  // Position ALPHA/BETA clear of the upper solar arrays (x = ±12, z = 0) so all 4 cores read cleanly on frame 1
  const cores: ReactorCore[] = [
    { id: 0, label: 'ALPHA', x: -15.0, y: 2.8, z: -2.8, repairSec: 0, requiredSec: 3.0, repaired: false },
    { id: 1, label: 'BETA', x: 15.0, y: 3.4, z: -2.8, repairSec: 0, requiredSec: 3.0, repaired: false },
    { id: 2, label: 'GAMMA', x: -10.5, y: -3.2, z: 7.0, repairSec: 0, requiredSec: 3.0, repaired: false },
    { id: 3, label: 'DELTA', x: 10.5, y: -2.2, z: 7.0, repairSec: 0, requiredSec: 3.0, repaired: false },
  ];

  const parasites: OrbitalParasite[] = cores.map((c, idx) => ({
    id: idx + 1,
    x: c.x + 1.8,
    y: c.y + 0.8,
    z: c.z + 1.5,
    hp: 36,
    maxHp: 36,
    targetCoreIndex: idx,
  }));

  return {
    phase: 'playing',
    failReason: null,
    stabilitySec: 120,
    suitArmor: 100,
    maxSuitArmor: 100,
    elapsedSec: 0,
    score: 0,
    parasitesCleared: 0,
    rank: null,
    // Offset slightly below the central Z-truss cap so the marine silhouettes clearly against deep space & Earth limb
    player: { x: 0, y: -2.0, z: 12.6, vx: 0, vy: 0, vz: 0, yaw: Math.PI },
    fireCooldown: 0,
    grappleTargetCoreIndex: null,
    repairingCoreIndex: null,
    spawnTimer: 7.5,
    nextEntityId: 20,
    cores,
    parasites,
    bolts: [],
  };
}

export function stepZeroGRescue(
  state: ZeroGRescueState,
  rawDt: number,
  input: {
    moveX: number;
    moveY: number;
    moveZ: number;
    fire: boolean;
    grapple: boolean;
    repair: boolean;
  }
): RescueStepEvents {
  const events: RescueStepEvents = {
    fired: false,
    parasiteKilled: false,
    coreRepaired: false,
    grappleActive: false,
    hit: false,
    victory: false,
    failed: false,
  };

  if (state.phase !== 'playing') return events;
  const dt = Math.min(Math.max(rawDt, 0.001), 0.5);
  state.elapsedSec += dt;
  state.stabilitySec = Math.max(0, state.stabilitySec - dt);
  state.fireCooldown = Math.max(0, state.fireCooldown - dt);

  // Zero-G 6-DOF/3D micro-thruster inertia acceleration
  const thrust = 16.5;
  state.player.vx += input.moveX * thrust * dt;
  state.player.vy += input.moveY * thrust * dt;
  state.player.vz += input.moveZ * thrust * dt;

  // Magnetic Grapple pulls smoothly toward nearest unrepaired core
  state.grappleTargetCoreIndex = null;
  if (input.grapple) {
    let bestIdx: number | null = null;
    let bestDist = Infinity;
    state.cores.forEach((c, idx) => {
      if (c.repaired) return;
      const d = Math.hypot(c.x - state.player.x, c.y - state.player.y, c.z - state.player.z);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = idx;
      }
    });
    if (bestIdx !== null && bestDist > 1.2) {
      const target = state.cores[bestIdx];
      state.grappleTargetCoreIndex = bestIdx;
      events.grappleActive = true;
      const pull = 28.0;
      state.player.vx += ((target.x - state.player.x) / bestDist) * pull * dt;
      state.player.vy += ((target.y - state.player.y) / bestDist) * pull * dt;
      state.player.vz += ((target.z - state.player.z) / bestDist) * pull * dt;
    }
  }

  // Zero-G space drag damping (gentle inertial glide)
  const damp = Math.exp(-1.75 * dt);
  state.player.vx *= damp;
  state.player.vy *= damp;
  state.player.vz *= damp;

  state.player.x = Math.max(-22, Math.min(22, state.player.x + state.player.vx * dt));
  state.player.y = Math.max(-10, Math.min(10, state.player.y + state.player.vy * dt));
  state.player.z = Math.max(-18, Math.min(20, state.player.z + state.player.vz * dt));

  if (Math.hypot(state.player.vx, state.player.vz) > 0.25) {
    state.player.yaw = Math.atan2(state.player.vx, state.player.vz);
  }

  // Auto-aim Pulse Rifle at nearest parasite
  if (input.fire && state.fireCooldown <= 0) {
    state.fireCooldown = 0.2;
    let target: OrbitalParasite | null = null;
    let bestDist = 26;
    for (const p of state.parasites) {
      const d = Math.hypot(p.x - state.player.x, p.y - state.player.y, p.z - state.player.z);
      if (d < bestDist) {
        bestDist = d;
        target = p;
      }
    }
    let dx = Math.sin(state.player.yaw);
    let dy = 0;
    let dz = Math.cos(state.player.yaw);
    if (target && bestDist > 0.01) {
      dx = (target.x - state.player.x) / bestDist;
      dy = (target.y - state.player.y) / bestDist;
      dz = (target.z - state.player.z) / bestDist;
      state.player.yaw = Math.atan2(dx, dz);
    }
    state.bolts.push({
      id: state.nextEntityId++,
      x: state.player.x + dx * 0.9,
      y: state.player.y + dy * 0.9,
      z: state.player.z + dz * 0.9,
      vx: dx * 34,
      vy: dy * 34,
      vz: dz * 34,
      life: 1.0,
    });
    events.fired = true;
  }

  // Update pulse bolts
  for (let i = state.bolts.length - 1; i >= 0; i--) {
    const b = state.bolts[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
    b.life -= dt;
    let consumed = b.life <= 0;
    if (!consumed) {
      for (const p of state.parasites) {
        if (Math.hypot(p.x - b.x, p.y - b.y, p.z - b.z) < 1.25) {
          p.hp -= 20;
          consumed = true;
          break;
        }
      }
    }
    if (consumed) state.bolts.splice(i, 1);
  }

  // Spawn reinforcements around unrepaired cores
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0 && state.parasites.length < 7) {
    state.spawnTimer = 8.5;
    const damagedIdx = state.cores.findIndex((c) => !c.repaired);
    if (damagedIdx >= 0) {
      const c = state.cores[damagedIdx];
      state.parasites.push({
        id: state.nextEntityId++,
        x: c.x + Math.cos(state.elapsedSec) * 3.5,
        y: c.y + 1.5,
        z: c.z + Math.sin(state.elapsedSec) * 3.5,
        hp: 36,
        maxHp: 36,
        targetCoreIndex: damagedIdx,
      });
    }
  }

  // Update parasites & suit armor drain
  let takingDamage = false;
  for (let i = state.parasites.length - 1; i >= 0; i--) {
    const p = state.parasites[i];
    if (p.hp <= 0) {
      state.parasitesCleared += 1;
      state.score += 75;
      events.parasiteKilled = true;
      state.parasites.splice(i, 1);
      continue;
    }

    const distToPlayer = Math.hypot(
      state.player.x - p.x,
      state.player.y - p.y,
      state.player.z - p.z
    );
    const core = state.cores[p.targetCoreIndex] ?? state.cores[0];
    const chasePlayer = distToPlayer < 8.5;
    const tx = chasePlayer ? state.player.x : core.x;
    const ty = chasePlayer ? state.player.y : core.y;
    const tz = chasePlayer ? state.player.z : core.z;
    const dx = tx - p.x;
    const dy = ty - p.y;
    const dz = tz - p.z;
    const d = Math.hypot(dx, dy, dz) || 1;
    if (d > 1.1) {
      p.x += (dx / d) * 3.2 * dt;
      p.y += (dy / d) * 3.2 * dt;
      p.z += (dz / d) * 3.2 * dt;
    }

    if (distToPlayer < 2.2) {
      state.suitArmor = Math.max(0, state.suitArmor - 18 * dt);
      takingDamage = true;
      events.hit = true;
    }
  }

  if (!takingDamage) {
    state.suitArmor = Math.min(state.maxSuitArmor, state.suitArmor + 6 * dt);
  }

  // Hold-to-Repair damaged Reactor Core within 4.5 units (parasites within 4.5 slow rate by 50%)
  state.repairingCoreIndex = null;
  if (input.repair) {
    for (let i = 0; i < state.cores.length; i++) {
      const c = state.cores[i];
      if (c.repaired) continue;
      const d = Math.hypot(c.x - state.player.x, c.y - state.player.y, c.z - state.player.z);
      if (d <= 4.5) {
        state.repairingCoreIndex = i;
        // Magnetic stabilization clamps Zero-G drift while actively repairing a Reactor Core
        const repairClamp = Math.exp(-6.5 * dt);
        state.player.vx *= repairClamp;
        state.player.vy *= repairClamp;
        state.player.vz *= repairClamp;
        const parasiteNear = state.parasites.some(
          (p) => Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z) <= 4.5
        );
        const rate = parasiteNear ? 0.5 : 1.0;
        c.repairSec = Math.min(c.requiredSec, c.repairSec + dt * rate);
        if (c.repairSec >= c.requiredSec) {
          c.repaired = true;
          state.score += 250;
          events.coreRepaired = true;
        }
        break;
      }
    }
  }

  // Victory check: all 4 cores stabilized
  if (state.cores.every((c) => c.repaired)) {
    state.phase = 'victory';
    state.rank = gradeRescueRank(state.stabilitySec);
    state.score += Math.round(state.stabilitySec * 12 + state.suitArmor * 3);
    events.victory = true;
    return events;
  }

  // Fail checks: timeout or suit armor destroyed
  if (state.suitArmor <= 0) {
    state.suitArmor = 0;
    state.phase = 'failed';
    state.failReason = 'armor';
    events.failed = true;
  } else if (state.stabilitySec <= 0) {
    state.stabilitySec = 0;
    state.phase = 'failed';
    state.failReason = 'timeout';
    events.failed = true;
  }

  return events;
}

export function snapshotZeroGRescue(state: ZeroGRescueState): ZeroGRescueHudSnapshot {
  return {
    phase: state.phase,
    failReason: state.failReason,
    stabilitySec: Math.round(state.stabilitySec * 10) / 10,
    suitArmor: Math.round(state.suitArmor),
    score: state.score,
    parasitesCleared: state.parasitesCleared,
    rank: state.rank,
    grappleActive: state.grappleTargetCoreIndex !== null,
    repairingLabel:
      state.repairingCoreIndex !== null ? state.cores[state.repairingCoreIndex].label : null,
    cores: state.cores.map((c) => ({
      label: c.label,
      pct: Math.round((c.repairSec / c.requiredSec) * 100),
      repaired: c.repaired,
    })),
  };
}

export const zeroGRescueChannel = createGameChannel<ZeroGRescueHudSnapshot, ZeroGRescueCommand>(
  snapshotZeroGRescue(createZeroGRescueState())
);
