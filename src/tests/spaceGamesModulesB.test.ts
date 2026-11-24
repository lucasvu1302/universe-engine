import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { useAppStore } from '@/stores/useAppStore';
import { ARENA_PILLARS, ARENA_RADIUS, createMechArenaState, mechArenaChannel, snapshotMechArena, stepMechArena } from '@/scenes/SpaceGames/engines/mechArenaEngine';
import { MechArenaHUD } from '@/ui/SpaceGames/MechArenaHUD';
import { BASE_RADIUS, createExoMinerState, stepExoMiner, ORE_VALUES } from '@/scenes/SpaceGames/engines/exoMinerEngine';
import { createZeroGRescueState, stepZeroGRescue, gradeRescueRank } from '@/scenes/SpaceGames/engines/zeroGRescueEngine';

describe('Space Games Modules B: Mech Arena, Exo-Miner & Zero-G Rescue (SPEC-UNIV-2026-11-24-001 T4)', () => {
  it('R4.a runs Mech Arena 3D with Plasma, Railgun, Boost, 100% Overdrive (6s 2x fire +25 armor), Wave 3 Boss Titan & +300 bonus credits', () => {
    const st = createMechArenaState({ armor: 2, weapon: 2, booster: 2 });
    expect(st.wave).toBe(1);
    expect(st.enemies.length).toBeGreaterThan(0);

    // Boost dash + fire plasma & railgun
    const startX = st.player.x;
    const target = st.enemies[0];
    target.x = st.player.x + 8;
    target.z = st.player.z;
    const enemyHpBefore = target.hp;
    stepMechArena(st, 0.05, { moveX: 1, moveZ: 0, firePlasma: true, fireRailgun: true, boost: true, overdrive: false });
    expect(st.player.x).toBeGreaterThan(startX + 0.5);
    expect(target.hp).toBeLessThan(enemyHpBefore);

    // Overdrive activation at 100% grants +25 armor & 6s active duration
    st.armor = st.maxArmor - 40;
    st.overdriveCharge = 100;
    const armorBeforeOd = st.armor;
    stepMechArena(st, 0.05, { moveX: 0, moveZ: 0, firePlasma: false, fireRailgun: false, boost: false, overdrive: true });
    expect(st.overdriveActiveTimer).toBeGreaterThan(5.5);
    expect(st.armor).toBeGreaterThanOrEqual(armorBeforeOd + 20);

    // Advance to Wave 3 Boss Titan -> defeat grants victory + >=300 credits
    st.wave = 2;
    st.enemies = [];
    stepMechArena(st, 0.05, { moveX: 0, moveZ: 0, firePlasma: false, fireRailgun: false, boost: false, overdrive: false });
    expect(st.wave).toBe(3);
    const boss = st.enemies.find((e) => e.isBoss);
    expect(boss).toBeDefined();

    const creditsBefore = st.creditsEarned;
    boss!.hp = 1;
    boss!.x = st.player.x + 6;
    boss!.z = st.player.z;
    st.railgunCooldown = 0;
    stepMechArena(st, 0.05, { moveX: 0, moveZ: 0, firePlasma: false, fireRailgun: true, boost: false, overdrive: false });
    expect(st.phase).toBe('victory');
    expect(st.creditsEarned).toBeGreaterThanOrEqual(creditsBefore + 300);

    // F1 + U1 + U2 regressions: MechArenaHUD live credits match store, Hangar stacks z-[60], Escape closes Hangar cleanly, and end modal exposes Exit button
    useAppStore.getState().resetGameProgress();
    useAppStore.getState().recordGameResult('mech_arena', { creditsEarned: st.creditsEarned, wave: 3 });
    mechArenaChannel.publishSnapshot(snapshotMechArena(st));
    const hud = render(React.createElement(MechArenaHUD));
    expect(hud.getByTestId('mech-credits-readout').textContent).toBe(String(st.creditsEarned));
    expect(hud.getByTestId('mech-end-exit-btn')).toBeTruthy();
    fireEvent.click(hud.getByTestId('mech-hangar-btn'));
    const hangarModal = hud.getByTestId('mech-hangar-modal');
    expect(hangarModal.className).toContain('z-[60]');
    // Capture-phase Escape closes Hangar without exiting the game
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(hud.queryByTestId('mech-hangar-modal')).toBeNull();
    hud.unmount();

    // U9/G12 regression: Wave 1 enemies stay clear of cover pillars & inside circular arena rim
    const freshMech = createMechArenaState({ armor: 1, weapon: 1, booster: 1 });
    freshMech.enemies[0].x = ARENA_PILLARS[0].x;
    freshMech.enemies[0].z = ARENA_PILLARS[0].z;
    stepMechArena(freshMech, 0.05, { moveX: 0, moveZ: 0, firePlasma: false, fireRailgun: false, boost: false, overdrive: false });
    const e0 = freshMech.enemies[0];
    const insidePillar =
      Math.abs(e0.x - ARENA_PILLARS[0].x) < ARENA_PILLARS[0].hx &&
      Math.abs(e0.z - ARENA_PILLARS[0].z) < ARENA_PILLARS[0].hz;
    expect(insidePillar).toBe(false);
    expect(Math.hypot(e0.x, e0.z)).toBeLessThanOrEqual(ARENA_RADIUS);
  });

  it('R4.b runs Exo-Miner Survival 3D laser mining (helium3/cryo/magma), base O2/battery refill & ore sale, and auto-turret bug defense', () => {
    expect(ORE_VALUES.helium3).toBe(25);
    expect(ORE_VALUES.cryo).toBe(45);
    expect(ORE_VALUES.magma).toBe(75);

    const st = createExoMinerState({ o2: 2, laser: 2, jetpack: 1, turrets: 2 });
    const vein = st.veins.find((v) => v.type === 'magma') ?? st.veins[0];
    st.player.x = vein.x + 1.5;
    st.player.z = vein.z;
    st.o2 = 40;
    st.battery = 50;

    // Hold mining laser until ore extracted
    for (let i = 0; i < 45; i++) {
      stepExoMiner(st, 0.05, { moveX: 0, moveZ: 0, mine: true, boost: false });
    }
    expect(st.cargoCount).toBeGreaterThan(0);
    expect(st.cargoValue).toBeGreaterThan(0);

    // Return inside Habitat Base radius (<= 6.5) -> refills O2 & battery to 100 and banks credits
    st.player.x = 1.0;
    st.player.z = 1.0;
    stepExoMiner(st, 0.05, { moveX: 0, moveZ: 0, mine: false, boost: false });
    expect(st.o2).toBe(100);
    expect(st.battery).toBe(100);
    expect(st.cargoCount).toBe(0);
    expect(st.sessionCreditsEarned).toBeGreaterThan(0);

    // Auto-defense turrets damage night alien bugs & Habitat Dome shield holds bugs outside BASE_RADIUS from origin (G12/U10)
    const freshMiner = createExoMinerState({ o2: 1, laser: 1, jetpack: 1, turrets: 0 });
    expect(Math.hypot(freshMiner.player.x, freshMiner.player.z)).toBeGreaterThanOrEqual(3.9);
    expect(freshMiner.inBaseZone).toBe(true);
    freshMiner.player.x = -5;
    freshMiner.player.z = 0;
    freshMiner.bugs = [{ id: 11, x: 2.0, z: 0, hp: 30, maxHp: 30, speed: 3.0 }];
    stepExoMiner(freshMiner, 0.05, { moveX: 0, moveZ: 0, mine: false, boost: false });
    expect(Math.hypot(freshMiner.bugs[0].x, freshMiner.bugs[0].z)).toBeGreaterThanOrEqual(BASE_RADIUS + 0.79);

    st.bugs = [{ id: 10, x: 5.5, z: 0, hp: 30, maxHp: 30, speed: 2.5 }];
    for (let i = 0; i < 20; i++) {
      stepExoMiner(st, 0.05, { moveX: 0, moveZ: 0, mine: false, boost: false });
    }
    expect(st.bugs.length === 0 || st.bugs[0].hp < 30).toBe(true);
  });

  it('R4.c (neg) handles Mech Arena 0-armor defeat and Exo-Miner 0-O2 emergency evacuation forfeiting only unbanked ore', () => {
    const mech = createMechArenaState({ armor: 1, weapon: 1, booster: 1 });
    mech.armor = 5;
    mech.creditsEarned = 140;
    mech.telegraphs = [{ id: 1, x: mech.player.x, z: mech.player.z, radius: 4, timer: 0.02, maxTimer: 1.2, damage: 25 }];
    stepMechArena(mech, 0.05, { moveX: 0, moveZ: 0, firePlasma: false, fireRailgun: false, boost: false, overdrive: false });
    expect(mech.armor).toBe(0);
    expect(mech.phase).toBe('game_over');
    expect(mech.creditsEarned).toBe(140);

    const miner = createExoMinerState({ o2: 1, laser: 1, jetpack: 1, turrets: 2 });
    miner.player.x = 18;
    miner.player.z = 18;
    miner.cargoCount = 3;
    miner.cargoValue = 165;
    miner.sessionCreditsEarned = 200;
    miner.o2 = 0.05;
    stepExoMiner(miner, 0.2, { moveX: 0, moveZ: 0, mine: false, boost: false });
    expect(miner.phase).toBe('evacuated');
    expect(miner.cargoCount).toBe(0);
    expect(miner.cargoValue).toBe(0);
    expect(miner.sessionCreditsEarned).toBe(200);
  });

  it('R5.a & R5.b (neg) runs Zero-G Space Rescue 3D thrust, magnetic grapple, parasite slowdown, 4-core repair victory + S/A/B/C ranks & timeout/armor-0 failure', () => {
    const st = createZeroGRescueState();
    expect(st.stabilitySec).toBe(120);
    expect(st.cores.map((c) => c.label)).toEqual(['ALPHA', 'BETA', 'GAMMA', 'DELTA']);

    // Magnetic grapple pulls astronaut toward nearest damaged core (DELTA at (10,-2,7) is closest to spawn z=12)
    const nearestCore = st.cores[3];
    const distBefore = Math.hypot(
      st.player.x - nearestCore.x,
      st.player.y - nearestCore.y,
      st.player.z - nearestCore.z
    );
    for (let i = 0; i < 15; i++) {
      stepZeroGRescue(st, 0.05, { moveX: 0, moveY: 0, moveZ: 0, fire: false, grapple: true, repair: false });
    }
    const distAfter = Math.hypot(
      st.player.x - nearestCore.x,
      st.player.y - nearestCore.y,
      st.player.z - nearestCore.z
    );
    expect(distAfter).toBeLessThan(distBefore - 1.5);

    // Parasite near core slows repair by 50% and drains suit armor
    st.player.x = nearestCore.x;
    st.player.y = nearestCore.y;
    st.player.z = nearestCore.z;
    st.parasites = [{ id: 1, x: nearestCore.x + 0.5, y: nearestCore.y, z: nearestCore.z, hp: 30, maxHp: 30, targetCoreIndex: 0 }];
    const armorBefore = st.suitArmor;
    stepZeroGRescue(st, 0.5, { moveX: 0, moveY: 0, moveZ: 0, fire: false, grapple: false, repair: true });
    expect(st.suitArmor).toBeLessThan(armorBefore);
    const slowedProgress = nearestCore.repairSec;
    expect(slowedProgress).toBeLessThan(0.35);

    // Eliminate parasites and repair all 4 cores (firing pulse rifle if reinforcements arrive) -> Victory!
    st.parasites = [];
    st.stabilitySec = 82;
    for (const core of st.cores) {
      st.player.x = core.x;
      st.player.y = core.y;
      st.player.z = core.z;
      st.player.vx = 0;
      st.player.vy = 0;
      st.player.vz = 0;
      for (let i = 0; i < 130; i++) {
        stepZeroGRescue(st, 0.05, { moveX: 0, moveY: 0, moveZ: 0, fire: true, grapple: false, repair: true });
        if (core.repaired) break;
      }
      expect(core.repaired).toBe(true);
    }
    expect(st.phase).toBe('victory');
    expect(st.rank).toBe('S');
    expect(gradeRescueRank(65)).toBe('S');
    expect(gradeRescueRank(40)).toBe('A');
    expect(gradeRescueRank(20)).toBe('B');
    expect(gradeRescueRank(10)).toBe('C');

    // Negative 1: Timer hits 0 -> failed
    const timeoutState = createZeroGRescueState();
    timeoutState.stabilitySec = 0.02;
    stepZeroGRescue(timeoutState, 0.05, { moveX: 0, moveY: 0, moveZ: 0, fire: false, grapple: false, repair: false });
    expect(timeoutState.phase).toBe('failed');

    // Negative 2: Suit armor hits 0 -> failed (F9)
    const armorFail = createZeroGRescueState();
    armorFail.suitArmor = 1;
    armorFail.parasites = [{ id: 2, x: armorFail.player.x, y: armorFail.player.y, z: armorFail.player.z, hp: 20, maxHp: 20, targetCoreIndex: 0 }];
    stepZeroGRescue(armorFail, 0.5, { moveX: 0, moveY: 0, moveZ: 0, fire: false, grapple: false, repair: false });
    expect(armorFail.suitArmor).toBe(0);
    expect(armorFail.phase).toBe('failed');
  });
});
