import type { MechUpgradeKey } from '@/stores/useAppStore';
import { createGameChannel } from '@/scenes/SpaceGames/shared/gameRuntimeBus';

export interface MechEnemy {
  id: number;
  x: number;
  z: number;
  yaw: number;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  isBoss: boolean;
  fireTimer: number;
}

export interface MechProjectile {
  id: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  damage: number;
  fromPlayer: boolean;
  life: number;
}

export interface MechRailBeam {
  id: number;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  life: number;
}

export interface MechTelegraph {
  id: number;
  x: number;
  z: number;
  radius: number;
  timer: number;
  maxTimer: number;
  damage: number;
}

export interface MechStepEvents {
  plasmaFired: boolean;
  railgunFired: boolean;
  boosted: boolean;
  overdriveStarted: boolean;
  enemyKilled: boolean;
  playerHit: boolean;
  victory: boolean;
  gameOver: boolean;
}

export interface MechArenaState {
  phase: 'playing' | 'victory' | 'game_over';
  wave: number;
  elapsedSec: number;
  player: { x: number; z: number; yaw: number; speedNorm: number };
  armor: number;
  maxArmor: number;
  upgrades: Record<MechUpgradeKey, number>;
  plasmaCooldown: number;
  railgunCooldown: number;
  boostCooldown: number;
  boostActiveTimer: number;
  invulnTimer: number;
  overdriveCharge: number;
  overdriveActiveTimer: number;
  creditsEarned: number;
  kills: number;
  nextEntityId: number;
  enemies: MechEnemy[];
  projectiles: MechProjectile[];
  railBeams: MechRailBeam[];
  telegraphs: MechTelegraph[];
}

export interface MechArenaHudSnapshot {
  phase: 'playing' | 'victory' | 'game_over';
  wave: number;
  armor: number;
  maxArmor: number;
  overdriveCharge: number;
  overdriveActive: boolean;
  railgunReadyRatio: number;
  boostReadyRatio: number;
  creditsEarned: number;
  kills: number;
  bossHpRatio: number | null;
}

export type MechArenaCommand =
  | { type: 'restart' }
  | { type: 'refresh_upgrades' }
  | { type: 'set_paused'; paused: boolean };

export const ARENA_RADIUS = 22;

export const ARENA_PILLARS: ReadonlyArray<{ x: number; z: number; hx: number; hz: number }> = [
  { x: -10, z: -6, hx: 1.5, hz: 1.5 },
  { x: 10, z: -6, hx: 1.5, hz: 1.5 },
  { x: -10, z: 6, hx: 1.5, hz: 1.5 },
  { x: 10, z: 6, hx: 1.5, hz: 1.5 },
];

function resolvePillarAndRimBounds(entity: { x: number; z: number }, radius: number): void {
  for (const p of ARENA_PILLARS) {
    const clampedX = Math.max(p.x - p.hx, Math.min(p.x + p.hx, entity.x));
    const clampedZ = Math.max(p.z - p.hz, Math.min(p.z + p.hz, entity.z));
    const dx = entity.x - clampedX;
    const dz = entity.z - clampedZ;
    const distSq = dx * dx + dz * dz;
    if (distSq < radius * radius) {
      if (distSq > 1e-6) {
        const dist = Math.sqrt(distSq);
        const push = radius - dist;
        entity.x += (dx / dist) * push;
        entity.z += (dz / dist) * push;
      } else {
        // Center fell inside pillar AABB — eject along shallowest axis
        const penX = p.hx + radius - Math.abs(entity.x - p.x);
        const penZ = p.hz + radius - Math.abs(entity.z - p.z);
        if (penX < penZ) {
          entity.x = p.x + (entity.x >= p.x ? 1 : -1) * (p.hx + radius);
        } else {
          entity.z = p.z + (entity.z >= p.z ? 1 : -1) * (p.hz + radius);
        }
      }
    }
  }

  const maxR = ARENA_RADIUS - Math.min(radius, 0.8);
  const r = Math.hypot(entity.x, entity.z);
  if (r > maxR) {
    entity.x = (entity.x / r) * maxR;
    entity.z = (entity.z / r) * maxR;
  }
}

function spawnWaveEnemies(state: MechArenaState): void {
  if (state.wave === 3) {
    state.enemies.push({
      id: state.nextEntityId++,
      x: 0,
      z: -14,
      yaw: 0,
      hp: 460,
      maxHp: 460,
      speed: 2.6,
      radius: 2.4,
      isBoss: true,
      fireTimer: 2.2,
    });
    // Plus 2 escort mechs
    for (const sx of [-9, 9]) {
      const escort = {
        id: state.nextEntityId++,
        x: sx,
        z: -11,
        yaw: 0,
        hp: 95,
        maxHp: 95,
        speed: 3.6,
        radius: 1.4,
        isBoss: false,
        fireTimer: 1.6,
      };
      resolvePillarAndRimBounds(escort, escort.radius);
      state.enemies.push(escort);
    }
    return;
  }

  // Spawn wave mechs along clear northern & flank arcs away from the four cover pillars
  const wave1Spots = [
    { x: -13.5, z: -11.5 },
    { x: 0, z: -14.5 },
    { x: 13.5, z: -11.5 },
  ];
  const wave2Spots = [
    { x: -14.5, z: -10.5 },
    { x: -4.8, z: -14.5 },
    { x: 4.8, z: -14.5 },
    { x: 14.5, z: -10.5 },
  ];
  const spots = state.wave === 1 ? wave1Spots : wave2Spots;
  for (let i = 0; i < spots.length; i++) {
    const hp = 70 + state.wave * 35;
    const enemy = {
      id: state.nextEntityId++,
      x: spots[i].x,
      z: spots[i].z,
      yaw: 0,
      hp,
      maxHp: hp,
      speed: 3.3 + state.wave * 0.35,
      radius: 1.4,
      isBoss: false,
      fireTimer: 1.2 + i * 0.4,
    };
    resolvePillarAndRimBounds(enemy, enemy.radius);
    state.enemies.push(enemy);
  }
}

export function createMechArenaState(upgrades: Record<MechUpgradeKey, number>): MechArenaState {
  const maxArmor = 120 + (upgrades.armor - 1) * 35;
  const st: MechArenaState = {
    phase: 'playing',
    wave: 1,
    elapsedSec: 0,
    player: { x: 0, z: 8, yaw: Math.PI, speedNorm: 0 },
    armor: maxArmor,
    maxArmor,
    upgrades: { ...upgrades },
    plasmaCooldown: 0,
    railgunCooldown: 0,
    boostCooldown: 0,
    boostActiveTimer: 0,
    invulnTimer: 0,
    overdriveCharge: 0,
    overdriveActiveTimer: 0,
    creditsEarned: 0,
    kills: 0,
    nextEntityId: 1,
    enemies: [],
    projectiles: [],
    railBeams: [],
    telegraphs: [],
  };
  spawnWaveEnemies(st);
  return st;
}

export function stepMechArena(
  state: MechArenaState,
  rawDt: number,
  input: {
    moveX: number;
    moveZ: number;
    firePlasma: boolean;
    fireRailgun: boolean;
    boost: boolean;
    overdrive: boolean;
  }
): MechStepEvents {
  const events: MechStepEvents = {
    plasmaFired: false,
    railgunFired: false,
    boosted: false,
    overdriveStarted: false,
    enemyKilled: false,
    playerHit: false,
    victory: false,
    gameOver: false,
  };

  if (state.phase !== 'playing') return events;
  const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
  state.elapsedSec += dt;

  state.plasmaCooldown = Math.max(0, state.plasmaCooldown - dt);
  state.railgunCooldown = Math.max(0, state.railgunCooldown - dt);
  state.boostCooldown = Math.max(0, state.boostCooldown - dt);
  state.boostActiveTimer = Math.max(0, state.boostActiveTimer - dt);
  state.invulnTimer = Math.max(0, state.invulnTimer - dt);
  state.overdriveActiveTimer = Math.max(0, state.overdriveActiveTimer - dt);

  // Overdrive activation at 100% -> 6s duration, 2x fire rate + +25 armor regen
  if (input.overdrive && state.overdriveCharge >= 100 && state.overdriveActiveTimer <= 0) {
    state.overdriveCharge = 0;
    state.overdriveActiveTimer = 6.0;
    state.armor = Math.min(state.maxArmor, state.armor + 25);
    events.overdriveStarted = true;
  }

  // Movement + Boost Dash
  let mx = input.moveX;
  let mz = input.moveZ;
  const mag = Math.hypot(mx, mz);
  if (mag > 1) {
    mx /= mag;
    mz /= mag;
  }

  const boostCdMax = Math.max(1.2, 2.5 - (state.upgrades.booster - 1) * 0.25);
  if (input.boost && state.boostCooldown <= 0) {
    state.boostCooldown = boostCdMax;
    state.boostActiveTimer = 0.25;
    state.invulnTimer = Math.max(state.invulnTimer, 0.35);
    const dx = mag > 0.1 ? mx : Math.sin(state.player.yaw);
    const dz = mag > 0.1 ? mz : Math.cos(state.player.yaw);
    state.player.x += dx * 4.2;
    state.player.z += dz * 4.2;
    events.boosted = true;
  }

  const baseSpeed = 7.4 + (state.upgrades.booster - 1) * 0.9;
  const speed = state.boostActiveTimer > 0 ? baseSpeed * 1.9 : baseSpeed;
  state.player.x += mx * speed * dt;
  state.player.z += mz * speed * dt;

  // Clamp player inside circular orbital crater arena and clear of solid cover pillars
  resolvePillarAndRimBounds(state.player, 1.35);
  state.player.speedNorm = Math.min(1, mag + (state.boostActiveTimer > 0 ? 0.5 : 0));

  // Auto-lock nearest enemy mech
  let nearest: MechEnemy | null = null;
  let nearestDist = Infinity;
  for (const e of state.enemies) {
    const d = Math.hypot(e.x - state.player.x, e.z - state.player.z);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = e;
    }
  }
  if (nearest) {
    state.player.yaw = Math.atan2(nearest.x - state.player.x, nearest.z - state.player.z);
  } else if (mag > 0.1) {
    state.player.yaw = Math.atan2(mx, mz);
  }

  const odMult = state.overdriveActiveTimer > 0 ? 2.0 : 1.0;
  const weaponBonus = 1 + (state.upgrades.weapon - 1) * 0.28;

  // Plasma Autocannon
  if (input.firePlasma && state.plasmaCooldown <= 0) {
    state.plasmaCooldown = 0.22 / odMult;
    const a = state.player.yaw;
    state.projectiles.push({
      id: state.nextEntityId++,
      x: state.player.x + Math.sin(a) * 1.6,
      z: state.player.z + Math.cos(a) * 1.6,
      vx: Math.sin(a) * 32,
      vz: Math.cos(a) * 32,
      damage: 18 * weaponBonus,
      fromPlayer: true,
      life: 1.2,
    });
    events.plasmaFired = true;
  }

  // Piercing Railgun (instant beam piercing all enemies along sightline)
  const railCdMax = Math.max(1.2, 2.6 - (state.upgrades.weapon - 1) * 0.2) / odMult;
  if (input.fireRailgun && state.railgunCooldown <= 0) {
    state.railgunCooldown = railCdMax;
    const a = state.player.yaw;
    const dirX = Math.sin(a);
    const dirZ = Math.cos(a);
    const beamLen = 30;
    state.railBeams.push({
      id: state.nextEntityId++,
      x1: state.player.x + dirX * 1.5,
      z1: state.player.z + dirZ * 1.5,
      x2: state.player.x + dirX * beamLen,
      z2: state.player.z + dirZ * beamLen,
      life: 0.22,
    });
    for (const e of state.enemies) {
      const rx = e.x - state.player.x;
      const rz = e.z - state.player.z;
      const proj = rx * dirX + rz * dirZ;
      if (proj > 0 && proj < beamLen) {
        const perp = Math.abs(rx * -dirZ + rz * dirX);
        if (perp <= e.radius + 1.1) {
          e.hp -= 62 * weaponBonus;
          if (state.overdriveActiveTimer <= 0) {
            state.overdriveCharge = Math.min(100, state.overdriveCharge + 4);
          }
        }
      }
    }
    events.railgunFired = true;
  }

  // Decay rail beams
  for (let i = state.railBeams.length - 1; i >= 0; i--) {
    state.railBeams[i].life -= dt;
    if (state.railBeams[i].life <= 0) state.railBeams.splice(i, 1);
  }

  // Update projectiles
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    p.x += p.vx * dt;
    p.z += p.vz * dt;
    p.life -= dt;
    let consumed = p.life <= 0;

    if (!consumed && p.fromPlayer) {
      for (const e of state.enemies) {
        if (Math.hypot(e.x - p.x, e.z - p.z) < e.radius + 0.65) {
          e.hp -= p.damage;
          if (state.overdriveActiveTimer <= 0) {
            state.overdriveCharge = Math.min(100, state.overdriveCharge + 4);
          }
          consumed = true;
          break;
        }
      }
    } else if (!consumed && !p.fromPlayer) {
      if (Math.hypot(state.player.x - p.x, state.player.z - p.z) < 1.55) {
        if (state.invulnTimer <= 0) {
          state.armor = Math.max(0, state.armor - p.damage);
          state.invulnTimer = 0.28;
          events.playerHit = true;
        }
        consumed = true;
      }
    }

    if (consumed) state.projectiles.splice(i, 1);
  }

  // Update Boss / Heavy red telegraph zones
  for (let i = state.telegraphs.length - 1; i >= 0; i--) {
    const tg = state.telegraphs[i];
    tg.timer -= dt;
    if (tg.timer <= 0) {
      if (
        Math.hypot(state.player.x - tg.x, state.player.z - tg.z) <= tg.radius &&
        state.invulnTimer <= 0
      ) {
        state.armor = Math.max(0, state.armor - tg.damage);
        state.invulnTimer = 0.5;
        events.playerHit = true;
      }
      state.telegraphs.splice(i, 1);
    }
  }

  // Update AI enemy mechs
  let bossDefeated = false;
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    if (e.hp <= 0) {
      state.kills += 1;
      state.creditsEarned += e.isBoss ? 300 : 45;
      if (state.overdriveActiveTimer <= 0) {
        state.overdriveCharge = Math.min(100, state.overdriveCharge + 15);
      }
      if (e.isBoss) {
        bossDefeated = true;
      }
      events.enemyKilled = true;
      state.enemies.splice(i, 1);
      continue;
    }

    const dx = state.player.x - e.x;
    const dz = state.player.z - e.z;
    const dist = Math.hypot(dx, dz) || 1;
    e.yaw = Math.atan2(dx, dz);

    // Maintain tactical combat distance while staying inside arena & clear of cover pillars
    if (dist > (e.isBoss ? 9.5 : 8.0)) {
      e.x += (dx / dist) * e.speed * dt;
      e.z += (dz / dist) * e.speed * dt;
    } else if (dist < 5.0) {
      e.x -= (dx / dist) * e.speed * 0.6 * dt;
      e.z -= (dz / dist) * e.speed * 0.6 * dt;
    }
    resolvePillarAndRimBounds(e, e.radius);

    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      if (e.isBoss) {
        e.fireTimer = 2.6;
        // Red warning telegraph artillery slam + spread shots
        state.telegraphs.push({
          id: state.nextEntityId++,
          x: state.player.x,
          z: state.player.z,
          radius: 4.2,
          timer: 1.25,
          maxTimer: 1.25,
          damage: 24,
        });
      } else {
        e.fireTimer = 2.1;
        state.projectiles.push({
          id: state.nextEntityId++,
          x: e.x + (dx / dist) * 1.6,
          z: e.z + (dz / dist) * 1.6,
          vx: (dx / dist) * 16,
          vz: (dz / dist) * 16,
          damage: 11,
          fromPlayer: false,
          life: 2.0,
        });
      }
    }
  }

  // Check defeat
  if (state.armor <= 0) {
    state.armor = 0;
    state.phase = 'game_over';
    events.gameOver = true;
    return events;
  }

  // Defeating Wave 3 Boss Titan immediately clears remaining escorts and triggers Victory
  if (bossDefeated && state.wave >= 3) {
    state.enemies = [];
    state.telegraphs = [];
    state.phase = 'victory';
    events.victory = true;
    return events;
  }

  // Advance waves or Victory after Wave 3 Boss Titan defeated
  if (state.enemies.length === 0) {
    if (state.wave >= 3) {
      state.phase = 'victory';
      events.victory = true;
    } else {
      state.wave += 1;
      state.armor = Math.min(state.maxArmor, state.armor + 25);
      spawnWaveEnemies(state);
    }
  }

  return events;
}

export function snapshotMechArena(state: MechArenaState): MechArenaHudSnapshot {
  const boss = state.enemies.find((e) => e.isBoss);
  const boostCdMax = Math.max(1.2, 2.5 - (state.upgrades.booster - 1) * 0.25);
  const railCdMax = Math.max(1.2, 2.6 - (state.upgrades.weapon - 1) * 0.2);
  return {
    phase: state.phase,
    wave: state.wave,
    armor: Math.ceil(state.armor),
    maxArmor: state.maxArmor,
    overdriveCharge: Math.round(state.overdriveCharge),
    overdriveActive: state.overdriveActiveTimer > 0,
    railgunReadyRatio: Math.max(0, Math.min(1, 1 - state.railgunCooldown / railCdMax)),
    boostReadyRatio: Math.max(0, Math.min(1, 1 - state.boostCooldown / boostCdMax)),
    creditsEarned: state.creditsEarned,
    kills: state.kills,
    bossHpRatio: boss ? Math.max(0, boss.hp / boss.maxHp) : null,
  };
}

export const mechArenaChannel = createGameChannel<MechArenaHudSnapshot, MechArenaCommand>(
  snapshotMechArena(createMechArenaState({ armor: 1, weapon: 1, booster: 1 }))
);
