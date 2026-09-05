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

describe('Cosmic History Simulation', () => {
  it('correctly ranges timeline to 75s and evaluates all 5 cosmic events', async () => {
    const { SimulationManager } = await import('../simulation/core/SimulationManager');
    const { CosmicEventManager } = await import('../simulation/cosmic/CosmicEventManager');
    const { COSMIC_EVENTS } = await import('../simulation/data/cosmicEventsData');

    const sm = SimulationManager.getInstance();
    const cm = CosmicEventManager.getInstance();

    sm.startScenario('cosmic_history');
    const timeline = sm.getTimelineEngine();

    expect(timeline.getTimeRange()).toEqual({ min: 0, max: 75 });
    expect(COSMIC_EVENTS.length).toBe(5);

    // Event 0: BIG_BANG (0s to 15s)
    timeline.seek(0);
    let state = cm.evaluateAtTime(timeline.getCurrentTime());
    expect(state.currentEvent.type).toBe('BIG_BANG');
    expect(state.progress).toBeCloseTo(0, 2);

    // Event 1: STAR_BIRTH (15s to 30s)
    timeline.seek(15);
    state = cm.evaluateAtTime(timeline.getCurrentTime());
    expect(state.currentEvent.type).toBe('STAR_BIRTH');
    expect(state.progress).toBeCloseTo(0, 2);

    // Event 2: SUPERNOVA (30s to 45s)
    timeline.seek(30);
    state = cm.evaluateAtTime(timeline.getCurrentTime());
    expect(state.currentEvent.type).toBe('SUPERNOVA');
    expect(state.progress).toBeCloseTo(0, 2);

    // Event 3: PLANET_FORMATION (45s to 60s)
    timeline.seek(45);
    state = cm.evaluateAtTime(timeline.getCurrentTime());
    expect(state.currentEvent.type).toBe('PLANET_FORMATION');
    expect(state.progress).toBeCloseTo(0, 2);

    // Event 4: GALAXY_COLLISION (60s to 75s)
    timeline.seek(60);
    state = cm.evaluateAtTime(timeline.getCurrentTime());
    expect(state.currentEvent.type).toBe('GALAXY_COLLISION');
    expect(state.progress).toBeCloseTo(0, 2);

    // Mid-event progress check (7.5s into Big Bang)
    timeline.seek(7.5);
    state = cm.evaluateAtTime(timeline.getCurrentTime());
    expect(state.currentEvent.type).toBe('BIG_BANG');
    expect(state.progress).toBeCloseTo(0.5, 2);

    sm.exitScenario();
  });
});
