import { createGameChannel } from '@/scenes/SpaceGames/shared/gameRuntimeBus';

export type SurvivorArenaId = 'mars' | 'enceladus' | 'io';
export type SurvivorSkillId =
  | 'plasma_spread'
  | 'orbit_drones'
  | 'lightning_aura'
  | 'sweep_laser'
  | 'fire_trail';

export interface SurvivorSkillMeta {
  id: SurvivorSkillId;
  nameVi: string;
  nameEn: string;
  descVi: string;
  descEn: string;
  accent: string;
}

export const SURVIVOR_SKILLS: SurvivorSkillMeta[] = [
  {
    id: 'plasma_spread',
    nameVi: 'Tia Plasma 3 Hướng',
    nameEn: '3-Way Plasma Spread',
    descVi: 'Bắn thêm loạt đạn tỏa cánh quạt và tăng tốc độ bắn',
    descEn: 'Fires multi-angle plasma fan bolts with faster fire rate',
    accent: '#38bdf8',
  },
  {
    id: 'orbit_drones',
    nameVi: 'Drone Tấn Công Quỹ Đạo',
    nameEn: 'Orbiting Attack Drones',
    descVi: 'Triệu hồi Drone bay quanh phi hành gia nghiền nát quái cận chiến',
    descEn: 'Deploys orbiting combat drones slicing nearby alien swarmers',
    accent: '#22d3ee',
  },
  {
    id: 'lightning_aura',
    nameVi: 'Vòng Sét Quá Tải',
    nameEn: 'Overload Lightning Aura',
    descVi: 'Xung điện từ định kỳ giật sát thương diện rộng xung quanh',
    descEn: 'Periodic EMP shockwave zapping every enemy in range',
    accent: '#a855f7',
  },
  {
    id: 'sweep_laser',
    nameVi: 'Tia Laser Quét 360°',
    nameEn: '360° Sweep Laser',
    descVi: 'Chùm tia năng lượng quay tròn cắt xuyên mọi đợt quái',
    descEn: 'Rotating energy beam cutting continuously through waves',
    accent: '#f43f5e',
  },
  {
    id: 'fire_trail',
    nameVi: 'Vệt Lửa Jetpack',
    nameEn: 'Jetpack Fire Trail',
    descVi: 'Để lại vệt plasma nóng rực đốt cháy kẻ địch đuổi phía sau',
    descEn: 'Leaves searing thruster embers burning pursuing enemies',
    accent: '#f97316',
  },
];

export interface SurvivorEnemy {
  id: number;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  isBoss: boolean;
  attackTimer: number;
}

export interface SurvivorBullet {
  id: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  damage: number;
  life: number;
}

export interface SurvivorCrystal {
  id: number;
  x: number;
  z: number;
  value: number;
}

export interface SurvivorHazard {
  id: number;
  x: number;
  z: number;
  radius: number;
  timer: number;
  maxTimer: number;
}

export interface SurvivorFirePatch {
  id: number;
  x: number;
  z: number;
  life: number;
}

export interface SurvivorStepEvents {
  shot: boolean;
  explosion: boolean;
  levelUp: boolean;
  dash: boolean;
  hit: boolean;
  pickup: boolean;
  bossKilled: boolean;
  gameOver: boolean;
}

export interface AstroSurvivorState {
  arena: SurvivorArenaId;
  phase: 'playing' | 'level_up' | 'game_over';
  player: { x: number; z: number; yaw: number; speedNorm: number };
  hp: number;
  maxHp: number;
  xp: number;
  xpToNext: number;
  level: number;
  wave: number;
  waveTimer: number;
  elapsedSec: number;
  score: number;
  kills: number;
  dashCooldown: number;
  dashActiveTimer: number;
  invulnTimer: number;
  fireCooldown: number;
  spawnTimer: number;
  hazardTimer: number;
  auraTimer: number;
  trailTimer: number;
  sweepAngle: number;
  droneAngle: number;
  nextEntityId: number;
  skills: Record<SurvivorSkillId, number>;
  upgradeChoices: SurvivorSkillId[];
  enemies: SurvivorEnemy[];
  bullets: SurvivorBullet[];
  crystals: SurvivorCrystal[];
  hazards: SurvivorHazard[];
  firePatches: SurvivorFirePatch[];
}

export interface AstroSurvivorHudSnapshot {
  arena: SurvivorArenaId;
  phase: 'playing' | 'level_up' | 'game_over';
  hp: number;
  maxHp: number;
  xp: number;
  xpToNext: number;
  level: number;
  wave: number;
  score: number;
  kills: number;
  elapsedSec: number;
  dashReadyRatio: number;
  bossHpRatio: number | null;
  skills: Record<SurvivorSkillId, number>;
  upgradeChoices: SurvivorSkillId[];
}

export type AstroSurvivorCommand =
  | { type: 'select_upgrade'; skill: SurvivorSkillId }
  | { type: 'switch_arena'; arena: SurvivorArenaId }
  | { type: 'restart' };

const ARENA_LIMIT = 24;
const WAVE_DURATION_SEC = 18;

export function createAstroSurvivorState(arena: SurvivorArenaId = 'mars'): AstroSurvivorState {
  const st: AstroSurvivorState = {
    arena,
    phase: 'playing',
    player: { x: 0, z: 0, yaw: 0, speedNorm: 0 },
    hp: 100,
    maxHp: 100,
    xp: 0,
    xpToNext: 30,
    level: 1,
    wave: 1,
    waveTimer: 0,
    elapsedSec: 0,
    score: 0,
    kills: 0,
    dashCooldown: 0,
    dashActiveTimer: 0,
    invulnTimer: 0,
    fireCooldown: 0.1,
    spawnTimer: 0.9,
    hazardTimer: 4.5,
    auraTimer: 1.5,
    trailTimer: 0.2,
    sweepAngle: 0,
    droneAngle: 0,
    nextEntityId: 1,
    skills: {
      plasma_spread: 0,
      orbit_drones: 0,
      lightning_aura: 0,
      sweep_laser: 0,
      fire_trail: 0,
    },
    upgradeChoices: [],
    enemies: [],
    bullets: [],
    crystals: [],
    hazards: [],
    firePatches: [],
  };
  // Spawn 4 opening scouts around perimeter so the battlefield starts alive immediately
  for (let i = 0; i < 4; i++) {
    spawnEnemy(st, false);
  }
  return st;
}

function pickUpgradeChoices(state: AstroSurvivorState): SurvivorSkillId[] {
  const unmaxed = SURVIVOR_SKILLS.map((s) => s.id).filter((id) => state.skills[id] < 5);
  const all = SURVIVOR_SKILLS.map((s) => s.id);
  const picks: SurvivorSkillId[] = [];

  if (unmaxed.length >= 3) {
    // Stride-1 rotation guarantees 3 strictly distinct unmaxed skills for any length >= 3
    const offset = (state.level + state.kills) % unmaxed.length;
    for (let i = 0; i < 3; i++) {
      picks.push(unmaxed[(offset + i) % unmaxed.length]);
    }
    return picks;
  }

  // Always offer remaining unmaxed skills first before padding with maxed (+15 HP) choices
  for (const id of unmaxed) {
    picks.push(id);
  }
  const offset = (state.level + state.kills) % all.length;
  for (let i = 0; i < all.length && picks.length < 3; i++) {
    const candidate = all[(offset + i) % all.length];
    if (!picks.includes(candidate)) {
      picks.push(candidate);
    }
  }
  return picks;
}

function spawnEnemy(state: AstroSurvivorState, isBoss: boolean): void {
  const angle = ((state.nextEntityId * 2.39996) % (Math.PI * 2));
  const dist = isBoss ? 17 : 15 + (state.nextEntityId % 6);
  const x = Math.max(-ARENA_LIMIT + 2, Math.min(ARENA_LIMIT - 2, state.player.x + Math.cos(angle) * dist));
  const z = Math.max(-ARENA_LIMIT + 2, Math.min(ARENA_LIMIT - 2, state.player.z + Math.sin(angle) * dist));
  const baseHp = isBoss ? 220 + state.wave * 75 : 22 + state.wave * 9;
  state.enemies.push({
    id: state.nextEntityId++,
    x,
    z,
    hp: baseHp,
    maxHp: baseHp,
    speed: isBoss ? 2.8 + state.wave * 0.1 : 3.4 + Math.min(3.5, state.wave * 0.25),
    radius: isBoss ? 2.1 : 0.9,
    isBoss,
    attackTimer: isBoss ? 3.5 : 0,
  });
}

export function applySurvivorUpgrade(state: AstroSurvivorState, skill: SurvivorSkillId): void {
  if (state.phase !== 'level_up') return;
  state.skills[skill] = Math.min(5, (state.skills[skill] ?? 0) + 1);
  state.hp = Math.min(state.maxHp, state.hp + 15);
  state.upgradeChoices = [];
  state.phase = 'playing';
}

export function stepAstroSurvivor(
  state: AstroSurvivorState,
  rawDt: number,
  input: { moveX: number; moveZ: number; dash: boolean; burst: boolean }
): SurvivorStepEvents {
  const events: SurvivorStepEvents = {
    shot: false,
    explosion: false,
    levelUp: false,
    dash: false,
    hit: false,
    pickup: false,
    bossKilled: false,
    gameOver: false,
  };

  if (state.phase !== 'playing') return events;
  const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
  state.elapsedSec += dt;
  state.waveTimer += dt;
  state.dashCooldown = Math.max(0, state.dashCooldown - dt);
  state.dashActiveTimer = Math.max(0, state.dashActiveTimer - dt);
  state.invulnTimer = Math.max(0, state.invulnTimer - dt);
  state.fireCooldown = Math.max(0, state.fireCooldown - dt);

  // Movement & Jetpack Dash
  let mx = input.moveX;
  let mz = input.moveZ;
  const mag = Math.hypot(mx, mz);
  if (mag > 1) {
    mx /= mag;
    mz /= mag;
  }

  if (input.dash && state.dashCooldown <= 0) {
    state.dashCooldown = 2.4;
    state.dashActiveTimer = 0.22;
    state.invulnTimer = Math.max(state.invulnTimer, 0.35);
    events.dash = true;
    const dx = mag > 0.1 ? mx : Math.sin(state.player.yaw);
    const dz = mag > 0.1 ? mz : Math.cos(state.player.yaw);
    state.player.x = Math.max(-ARENA_LIMIT, Math.min(ARENA_LIMIT, state.player.x + dx * 3.8));
    state.player.z = Math.max(-ARENA_LIMIT, Math.min(ARENA_LIMIT, state.player.z + dz * 3.8));
  }

  const moveSpeed = state.dashActiveTimer > 0 ? 15.5 : 8.2;
  state.player.x = Math.max(-ARENA_LIMIT, Math.min(ARENA_LIMIT, state.player.x + mx * moveSpeed * dt));
  state.player.z = Math.max(-ARENA_LIMIT, Math.min(ARENA_LIMIT, state.player.z + mz * moveSpeed * dt));
  state.player.speedNorm = Math.min(1, mag + (state.dashActiveTimer > 0 ? 0.5 : 0));
  if (mag > 0.1) {
    state.player.yaw = Math.atan2(mx, mz);
  }

  // Wave progression + Boss spawn every 3rd wave
  if (state.waveTimer >= WAVE_DURATION_SEC) {
    state.waveTimer -= WAVE_DURATION_SEC;
    state.wave += 1;
    if (state.wave % 3 === 0 && !state.enemies.some((e) => e.isBoss)) {
      spawnEnemy(state, true);
    }
  }

  // Regular wave spawns
  state.spawnTimer -= dt;
  const maxEnemies = Math.min(28, 6 + state.wave * 3);
  if (state.spawnTimer <= 0 && state.enemies.length < maxEnemies) {
    spawnEnemy(state, false);
    state.spawnTimer = Math.max(0.42, 1.45 - state.wave * 0.1);
  }

  // Meteor impact telegraph hazards
  state.hazardTimer -= dt;
  if (state.hazardTimer <= 0 && state.hazards.length < 3) {
    state.hazardTimer = Math.max(2.2, 4.8 - state.wave * 0.25);
    state.hazards.push({
      id: state.nextEntityId++,
      x: Math.max(-ARENA_LIMIT + 3, Math.min(ARENA_LIMIT - 3, state.player.x + (Math.sin(state.elapsedSec * 7.3) * 7))),
      z: Math.max(-ARENA_LIMIT + 3, Math.min(ARENA_LIMIT - 3, state.player.z + (Math.cos(state.elapsedSec * 5.9) * 7))),
      radius: 2.6,
      timer: 1.5,
      maxTimer: 1.5,
    });
  }

  for (let i = state.hazards.length - 1; i >= 0; i--) {
    const h = state.hazards[i];
    h.timer -= dt;
    if (h.timer <= 0) {
      const d = Math.hypot(state.player.x - h.x, state.player.z - h.z);
      if (d < h.radius && state.invulnTimer <= 0) {
        state.hp = Math.max(0, state.hp - 18);
        state.invulnTimer = 0.65;
        events.hit = true;
      }
      events.explosion = true;
      state.hazards.splice(i, 1);
    }
  }

  // Find nearest enemy for auto-aim plasma rifle
  let nearest: SurvivorEnemy | null = null;
  let nearestDist = Infinity;
  for (const e of state.enemies) {
    const d = Math.hypot(e.x - state.player.x, e.z - state.player.z);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = e;
    }
  }

  // Auto-fire + manual burst acceleration
  const spreadLv = state.skills.plasma_spread;
  const fireInterval = Math.max(0.12, (input.burst ? 0.18 : 0.34) - spreadLv * 0.03);
  if (nearest && state.fireCooldown <= 0 && nearestDist < 22) {
    state.fireCooldown = fireInterval;
    const baseAngle = Math.atan2(nearest.x - state.player.x, nearest.z - state.player.z);
    state.player.yaw = baseAngle;
    const boltCount = 1 + Math.min(4, spreadLv > 0 ? 2 + Math.floor(spreadLv / 2) : input.burst ? 1 : 0);
    const dmg = 16 + spreadLv * 5;
    for (let b = 0; b < boltCount; b++) {
      const offset = (b - (boltCount - 1) * 0.5) * 0.18;
      const a = baseAngle + offset;
      state.bullets.push({
        id: state.nextEntityId++,
        x: state.player.x + Math.sin(a) * 0.7,
        z: state.player.z + Math.cos(a) * 0.7,
        vx: Math.sin(a) * 26,
        vz: Math.cos(a) * 26,
        damage: dmg,
        life: 1.1,
      });
    }
    events.shot = true;
  }

  // Skill: Orbiting Attack Drones
  const droneLv = state.skills.orbit_drones;
  state.droneAngle += dt * (2.6 + droneLv * 0.45);
  if (droneLv > 0) {
    const droneCount = Math.min(4, 1 + droneLv);
    const orbitR = 3.2;
    for (let d = 0; d < droneCount; d++) {
      const a = state.droneAngle + (d / droneCount) * Math.PI * 2;
      const dx = state.player.x + Math.cos(a) * orbitR;
      const dz = state.player.z + Math.sin(a) * orbitR;
      for (const e of state.enemies) {
        if (Math.hypot(e.x - dx, e.z - dz) < e.radius + 0.85) {
          e.hp -= (28 + droneLv * 12) * dt;
        }
      }
    }
  }

  // Skill: Overload Lightning Aura
  const auraLv = state.skills.lightning_aura;
  if (auraLv > 0) {
    state.auraTimer -= dt;
    if (state.auraTimer <= 0) {
      state.auraTimer = Math.max(0.75, 1.8 - auraLv * 0.18);
      const radius = 5.2 + auraLv * 0.8;
      for (const e of state.enemies) {
        if (Math.hypot(e.x - state.player.x, e.z - state.player.z) <= radius) {
          e.hp -= 18 + auraLv * 8;
        }
      }
    }
  }

  // Skill: 360° Sweep Laser
  const sweepLv = state.skills.sweep_laser;
  state.sweepAngle += dt * (1.8 + sweepLv * 0.3);
  if (sweepLv > 0) {
    const lx = Math.cos(state.sweepAngle);
    const lz = Math.sin(state.sweepAngle);
    const beamLen = 7.5 + sweepLv * 1.1;
    for (const e of state.enemies) {
      const relX = e.x - state.player.x;
      const relZ = e.z - state.player.z;
      const proj = relX * lx + relZ * lz;
      if (proj > 0 && proj < beamLen) {
        const perp = Math.abs(relX * -lz + relZ * lx);
        if (perp < e.radius + 0.6) {
          e.hp -= (36 + sweepLv * 14) * dt;
        }
      }
    }
  }

  // Skill: Jetpack Fire Trail
  const trailLv = state.skills.fire_trail;
  if (trailLv > 0) {
    state.trailTimer -= dt;
    if (state.trailTimer <= 0 && state.player.speedNorm > 0.15) {
      state.trailTimer = 0.28;
      state.firePatches.push({
        id: state.nextEntityId++,
        x: state.player.x,
        z: state.player.z,
        life: 2.2 + trailLv * 0.35,
      });
    }
  }
  for (let i = state.firePatches.length - 1; i >= 0; i--) {
    const p = state.firePatches[i];
    p.life -= dt;
    for (const e of state.enemies) {
      if (Math.hypot(e.x - p.x, e.z - p.z) < e.radius + 1.4) {
        e.hp -= (18 + trailLv * 8) * dt;
      }
    }
    if (p.life <= 0) state.firePatches.splice(i, 1);
  }

  // Move bullets & check hits
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.x += b.vx * dt;
    b.z += b.vz * dt;
    b.life -= dt;
    let consumed = b.life <= 0;
    if (!consumed) {
      for (const e of state.enemies) {
        if (Math.hypot(e.x - b.x, e.z - b.z) < e.radius + 0.55) {
          e.hp -= b.damage;
          consumed = true;
          break;
        }
      }
    }
    if (consumed) state.bullets.splice(i, 1);
  }

  // Move enemies, boss slam telegraph, deaths & player contact damage
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    if (e.hp <= 0) {
      state.kills += 1;
      if (e.isBoss) {
        state.score += 500;
        state.hp = Math.min(state.maxHp, state.hp + 30);
        events.bossKilled = true;
      } else {
        state.score += 25 + state.wave * 5;
      }
      state.crystals.push({
        id: state.nextEntityId++,
        x: e.x,
        z: e.z,
        value: e.isBoss ? 40 : 12,
      });
      events.explosion = true;
      state.enemies.splice(i, 1);
      continue;
    }

    const dx = state.player.x - e.x;
    const dz = state.player.z - e.z;
    const dist = Math.hypot(dx, dz) || 1;
    e.x += (dx / dist) * e.speed * dt;
    e.z += (dz / dist) * e.speed * dt;

    if (e.isBoss) {
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        e.attackTimer = 4.2;
        state.hazards.push({
          id: state.nextEntityId++,
          x: state.player.x,
          z: state.player.z,
          radius: 3.6,
          timer: 1.35,
          maxTimer: 1.35,
        });
      }
    }

    if (dist < e.radius + 0.75 && state.invulnTimer <= 0) {
      const dmg = e.isBoss ? 22 : 12;
      state.hp = Math.max(0, state.hp - dmg);
      state.invulnTimer = 0.65;
      events.hit = true;
    }
  }

  // XP crystal magnet & level up
  for (let i = state.crystals.length - 1; i >= 0; i--) {
    const c = state.crystals[i];
    const dx = state.player.x - c.x;
    const dz = state.player.z - c.z;
    const dist = Math.hypot(dx, dz) || 1;
    if (dist < 6.5) {
      c.x += (dx / dist) * 14 * dt;
      c.z += (dz / dist) * 14 * dt;
    }
    if (dist < 1.35) {
      state.xp += c.value;
      state.score += 10;
      events.pickup = true;
      state.crystals.splice(i, 1);
    }
  }

  if (state.hp <= 0) {
    state.hp = 0;
    state.phase = 'game_over';
    events.gameOver = true;
    return events;
  }

  if (state.xp >= state.xpToNext) {
    state.xp -= state.xpToNext;
    state.level += 1;
    state.xpToNext = Math.round(state.xpToNext * 1.35 + 15);
    state.upgradeChoices = pickUpgradeChoices(state);
    state.phase = 'level_up';
    events.levelUp = true;
  }

  return events;
}

export function snapshotAstroSurvivor(state: AstroSurvivorState): AstroSurvivorHudSnapshot {
  const boss = state.enemies.find((e) => e.isBoss);
  return {
    arena: state.arena,
    phase: state.phase,
    hp: Math.ceil(state.hp),
    maxHp: state.maxHp,
    xp: state.xp,
    xpToNext: state.xpToNext,
    level: state.level,
    wave: state.wave,
    score: state.score,
    kills: state.kills,
    elapsedSec: Math.round(state.elapsedSec * 10) / 10,
    dashReadyRatio: Math.max(0, Math.min(1, 1 - state.dashCooldown / 2.4)),
    bossHpRatio: boss ? Math.max(0, boss.hp / boss.maxHp) : null,
    skills: { ...state.skills },
    upgradeChoices: [...state.upgradeChoices],
  };
}

export const astroSurvivorChannel = createGameChannel<AstroSurvivorHudSnapshot, AstroSurvivorCommand>(
  snapshotAstroSurvivor(createAstroSurvivorState('mars'))
);
