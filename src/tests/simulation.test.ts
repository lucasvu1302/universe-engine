import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { SimulationClock } from '../engine/simulation/SimulationClock';

describe('SimulationClock Engine', () => {
  let clock: SimulationClock;

  beforeEach(() => {
    clock = SimulationClock.getInstance();
    clock.reset();
    clock.setTimeScale(1.0);
    clock.setPaused(false);
  });

  it('advances simulation time based on delta and timeScale', () => {
    clock.lastFrameTimestamp = 1000;
    const delta = clock.update(1050); // 50ms = 0.05s
    expect(delta).toBeCloseTo(0.05, 4);
    expect(clock.simulationTime).toBeCloseTo(0.05, 4);
  });

  it('clamps large delta times when tab is backgrounded', () => {
    clock.lastFrameTimestamp = 1000;
    // 10 seconds later (tab backgrounded)
    const delta = clock.update(11000);
    // Must be clamped to 0.1s
    expect(delta).toBeCloseTo(0.1, 4);
    expect(clock.simulationTime).toBeCloseTo(0.1, 4);
  });

  it('does not advance simulation time when paused', () => {
    clock.setPaused(true);
    clock.lastFrameTimestamp = 1000;
    clock.update(1050);
    expect(clock.simulationTime).toBe(0);
  });

  it('accurately applies timeScale multipliers', () => {
    clock.setTimeScale(10.0);
    clock.lastFrameTimestamp = 1000;
    clock.update(1050); // 0.05s * 10 = 0.5s
    expect(clock.simulationTime).toBeCloseTo(0.5, 4);
  });

  it('calculates deterministic orbit positions without object allocation', () => {
    const target = new THREE.Vector3();
    const pos1 = SimulationClock.calculateOrbitPosition(
      { distance: 100, speed: 1.0 },
      0,
      target
    );
    expect(pos1.x).toBeCloseTo(100, 2);
    expect(pos1.y).toBeCloseTo(0, 2);
    expect(pos1.z).toBeCloseTo(0, 2);

    // Quarter circle at time t when angle = PI/2
    const quarterTime = (Math.PI / 2) / 0.1;
    SimulationClock.calculateOrbitPosition(
      { distance: 100, speed: 1.0 },
      quarterTime,
      target
    );
    expect(target.x).toBeCloseTo(0, 2);
    expect(target.z).toBeCloseTo(100, 2);
  });
});
