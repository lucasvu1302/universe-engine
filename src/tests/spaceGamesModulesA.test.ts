import { describe, it, expect } from 'vitest';
import {
  createAstroSurvivorState,
  stepAstroSurvivor,
  applySurvivorUpgrade,
  SURVIVOR_SKILLS,
} from '@/scenes/SpaceGames/engines/astroSurvivorEngine';
import {
  createJetpackOdysseyState,
  stepJetpackOdyssey,
  gradeOdysseyRank,
  ODYSSEY_WORLDS,
} from '@/scenes/SpaceGames/engines/jetpackOdysseyEngine';

describe('Space Games Modules A: Astro Survivor 3D & Astro Jetpack Odyssey (SPEC-UNIV-2026-11-24-001 T3)', () => {
  it('R3.a runs Astro Survivor 3D across 3 maps, dashes, kills enemies, opens 3-card upgrade selector from 5 skills, and spawns Wave 3 Boss', () => {
    expect(SURVIVOR_SKILLS.map((s) => s.id)).toEqual([
      'plasma_spread',
      'orbit_drones',
      'lightning_aura',
      'sweep_laser',
      'fire_trail',
    ]);

    for (const arena of ['mars', 'enceladus', 'io'] as const) {
      const s = createAstroSurvivorState(arena);
      expect(s.arena).toBe(arena);
      expect(s.hp).toBe(s.maxHp);
    }

    const state = createAstroSurvivorState('mars');
    // Dash triggers invulnerability + cooldown
    const startX = state.player.x;
    stepAstroSurvivor(state, 0.05, { moveX: 1, moveZ: 0, dash: true, burst: true });
    expect(state.player.x).toBeGreaterThan(startX + 0.5);
    expect(state.dashCooldown).toBeGreaterThan(0);

    // Put an enemy in front and fire plasma until eliminated -> drops XP crystal -> pick up -> triggers level-up choice of 3 cards
    state.enemies = [
      { id: 99, x: state.player.x + 2, z: state.player.z, hp: 10, maxHp: 10, speed: 2, radius: 0.9, isBoss: false, attackTimer: 0 },
    ];
    state.xp = state.xpToNext - 1;
    for (let i = 0; i < 40; i++) {
      stepAstroSurvivor(state, 0.05, { moveX: 0, moveZ: 0, dash: false, burst: true });
      if (state.phase === 'level_up') break;
    }
    expect(state.phase).toBe('level_up');
    expect(state.upgradeChoices.length).toBe(3);

    const picked = state.upgradeChoices[0];
    applySurvivorUpgrade(state, picked);
    expect(state.phase).toBe('playing');
    expect(state.skills[picked]).toBeGreaterThanOrEqual(1);

    // F2 regression: when 1 skill reaches LV.5 (candidates.length === 4), all 3 upgrade choices remain strictly unique
    state.skills.plasma_spread = 5;
    state.skills.orbit_drones = 1;
    state.skills.lightning_aura = 1;
    state.skills.sweep_laser = 1;
    state.skills.fire_trail = 1;
    state.xp = state.xpToNext;
    stepAstroSurvivor(state, 0.05, { moveX: 0, moveZ: 0, dash: false, burst: false });
    expect(state.phase).toBe('level_up');
    expect(state.upgradeChoices.length).toBe(3);
    expect(new Set(state.upgradeChoices).size).toBe(3);
    applySurvivorUpgrade(state, state.upgradeChoices[0]);

    // Wave 3 spawns a Planetary Boss; defeating Boss awards +500 bonus score & heals +30 HP
    state.wave = 2;
    state.waveTimer = 17.95;
    state.enemies = [];
    stepAstroSurvivor(state, 0.1, { moveX: 0, moveZ: 0, dash: false, burst: false });
    expect(state.wave).toBe(3);
    const boss = state.enemies.find((e) => e.isBoss);
    expect(boss).toBeDefined();

    state.hp = 50;
    const scoreBeforeBossKill = state.score;
    boss!.hp = 1;
    boss!.x = state.player.x + 2;
    boss!.z = state.player.z;
    for (let i = 0; i < 30; i++) {
      stepAstroSurvivor(state, 0.05, { moveX: 0, moveZ: 0, dash: false, burst: true });
      if (!state.enemies.some((e) => e.isBoss)) break;
    }
    expect(state.score).toBeGreaterThanOrEqual(scoreBeforeBossKill + 500);
    expect(state.hp).toBeGreaterThanOrEqual(75);
  });

  it('R3.b simulates real planetary gravity (0.11g/0.38g/0.90g), jetpack fuel drain/regen, 5 Quantum Cores, Portal unlock & S/A/B/C rank', () => {
    expect(ODYSSEY_WORLDS.enceladus.gravityG).toBeCloseTo(0.11, 2);
    expect(ODYSSEY_WORLDS.mars.gravityG).toBeCloseTo(0.38, 2);
    expect(ODYSSEY_WORLDS.venus.gravityG).toBeCloseTo(0.9, 2);

    // Verify Enceladus (0.11g) jumps noticeably higher than Venus (0.90g)
    const enc = createJetpackOdysseyState('enceladus');
    const ven = createJetpackOdysseyState('venus');
    let maxEncY = enc.player.y;
    let maxVenY = ven.player.y;
    for (let i = 0; i < 60; i++) {
      stepJetpackOdyssey(enc, 0.03, { moveX: 0, moveZ: 0, jump: i === 0, jetpack: false });
      stepJetpackOdyssey(ven, 0.03, { moveX: 0, moveZ: 0, jump: i === 0, jetpack: false });
      maxEncY = Math.max(maxEncY, enc.player.y);
      maxVenY = Math.max(maxVenY, ven.player.y);
    }
    expect(maxEncY).toBeGreaterThan(maxVenY + 0.8);

    // Jetpack drains fuel when held and regenerates when grounded
    const mars = createJetpackOdysseyState('mars');
    stepJetpackOdyssey(mars, 0.4, { moveX: 0, moveZ: 0, jump: true, jetpack: true });
    const afterJetFuel = mars.fuel;
    expect(afterJetFuel).toBeLessThan(100);
    // Stand still on starting pad to regenerate fuel
    mars.player.y = mars.platforms[0].y + 0.5;
    mars.player.vy = 0;
    mars.grounded = true;
    for (let i = 0; i < 30; i++) {
      stepJetpackOdyssey(mars, 0.05, { moveX: 0, moveZ: 0, jump: false, jetpack: false });
    }
    expect(mars.fuel).toBeGreaterThan(afterJetFuel);

    // Collect all 5 Quantum Cores -> Portal unlocks -> reaching portal wins & grades rank
    expect(mars.cores.length).toBe(5);
    for (const c of mars.cores) {
      mars.player.x = c.x;
      mars.player.y = c.y;
      mars.player.z = c.z;
      stepJetpackOdyssey(mars, 0.016, { moveX: 0, moveZ: 0, jump: false, jetpack: false });
    }
    expect(mars.coresCollected).toBe(5);
    expect(mars.portalUnlocked).toBe(true);

    mars.elapsedSec = 28.5;
    mars.player.x = mars.portal.x;
    mars.player.y = mars.portal.y;
    mars.player.z = mars.portal.z;
    stepJetpackOdyssey(mars, 0.016, { moveX: 0, moveZ: 0, jump: false, jetpack: false });
    expect(mars.phase).toBe('victory');
    expect(mars.rank).toBe('S');

    // Exact rank thresholds
    expect(gradeOdysseyRank(35)).toBe('S');
    expect(gradeOdysseyRank(55)).toBe('A');
    expect(gradeOdysseyRank(80)).toBe('B');
    expect(gradeOdysseyRank(92)).toBe('C');
  });

  it('R3.c (neg) respawns Odyssey player with +1s penalty on falling below y < -8 and triggers clean game_over on Survivor 0 HP', () => {
    const od = createJetpackOdysseyState('mars');
    const timeBefore = od.elapsedSec;
    od.player.y = -9.2;
    stepJetpackOdyssey(od, 0.016, { moveX: 0, moveZ: 0, jump: false, jetpack: false });
    expect(od.player.y).toBeGreaterThan(0);
    expect(od.elapsedSec).toBeGreaterThanOrEqual(timeBefore + 1.0);
    expect(od.falls).toBe(1);

    const sv = createAstroSurvivorState('io');
    sv.hp = 5;
    sv.invulnTimer = 0;
    sv.enemies = [
      { id: 1, x: sv.player.x, z: sv.player.z, hp: 20, maxHp: 20, speed: 3, radius: 1.0, isBoss: false, attackTimer: 0 },
    ];
    stepAstroSurvivor(sv, 0.1, { moveX: 0, moveZ: 0, dash: false, burst: false });
    expect(sv.hp).toBe(0);
    expect(sv.phase).toBe('game_over');
  });

  it('G2/G8/G11/G12 regressions: Astro Survivor offers remaining unmaxed skills first; Odyssey checkpoints avoid geysers, laser invuln prevents double hit, moving bridges carry player', () => {
    // G11: When 3 skills reach LV.5, both remaining unmaxed skills must appear in upgradeChoices
    const sv = createAstroSurvivorState('mars');
    sv.skills.plasma_spread = 5;
    sv.skills.orbit_drones = 5;
    sv.skills.lightning_aura = 5;
    sv.skills.sweep_laser = 2;
    sv.skills.fire_trail = 1;
    sv.xp = sv.xpToNext;
    stepAstroSurvivor(sv, 0.05, { moveX: 0, moveZ: 0, dash: false, burst: false });
    expect(sv.upgradeChoices).toContain('sweep_laser');
    expect(sv.upgradeChoices).toContain('fire_trail');
    expect(new Set(sv.upgradeChoices).size).toBe(3);

    // G8: Landing on geyser Checkpoint 3 stores checkpoint clear of the geyser center (>= 1.35m)
    const od = createJetpackOdysseyState('mars');
    const plat3 = od.platforms[3];
    od.player.x = plat3.x - 1.5;
    od.player.z = plat3.z;
    od.player.y = plat3.y + 0.7;
    od.player.vy = -4;
    stepJetpackOdyssey(od, 0.05, { moveX: 0, moveZ: 0, jump: false, jetpack: false });
    expect(Math.hypot(od.checkpoint.x - plat3.x, od.checkpoint.z - plat3.z)).toBeGreaterThanOrEqual(1.35);

    // G2: Laser gate invuln timer prevents double knockback on immediate next frame
    const gate = od.laserGates[0];
    gate.angle = Math.PI / 2;
    od.player.x = gate.x;
    od.player.y = gate.y;
    od.player.z = gate.z - 0.5;
    const hit1 = stepJetpackOdyssey(od, 0.016, { moveX: 0, moveZ: 0, jump: false, jetpack: false });
    expect(hit1.laserHit).toBe(true);
    od.player.x = gate.x;
    od.player.y = gate.y;
    od.player.z = gate.z;
    const hit2 = stepJetpackOdyssey(od, 0.016, { moveX: 0, moveZ: 0, jump: false, jetpack: false });
    expect(hit2.laserHit).toBe(false);

    // G12: Standing on moving bridge Platform 2 carries player horizontally with the platform
    const od2 = createJetpackOdysseyState('mars');
    const plat2 = od2.platforms[2];
    od2.player.x = plat2.x;
    od2.player.z = plat2.z;
    od2.player.y = plat2.y + 0.5;
    od2.player.vy = 0;
    od2.grounded = true;
    od2.groundedPlatformId = plat2.id;
    const xBefore = od2.player.x;
    stepJetpackOdyssey(od2, 0.05, { moveX: 0, moveZ: 0, jump: false, jetpack: false });
    expect(Math.abs(od2.player.x - xBefore)).toBeGreaterThan(0.05);
  });
});
