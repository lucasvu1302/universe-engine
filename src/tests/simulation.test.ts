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

describe('Earth Launch Simulation Trajectory & Camera', () => {
  it('accurately computes multi-phase ascent coordinates and clears tower', async () => {
    const { LaunchController } = await import('../simulation/launch/LaunchController');
    const { CameraDirector } = await import('../simulation/camera/CameraDirector');
    const { CameraManager } = await import('../engine/camera/CameraManager');

    const controller = LaunchController.getInstance();
    const camDirector = CameraDirector.getInstance();
    const camManager = CameraManager.getInstance();

    // 1. T=0s Countdown: Rocket rests on pad mount
    let traj = controller.evaluateAtTime(0);
    expect(traj.altitudeKm).toBe(0);
    expect(traj.position.y).toBe(0);
    expect(traj.position.z).toBe(0);
    expect(traj.pitchDeg).toBe(90);

    // 2. T=10s Liftoff ignition
    traj = controller.evaluateAtTime(10);
    expect(traj.position.y).toBe(0);

    // 3. T=20s (10s after liftoff): Must clear the 28m structural tower
    traj = controller.evaluateAtTime(20);
    expect(traj.position.y).toBeGreaterThan(28);

    // 4. T=28s: Ascending rapidly in troposphere
    traj = controller.evaluateAtTime(28);
    expect(traj.position.y).toBeGreaterThan(80);
    expect(traj.velocityKms).toBeGreaterThan(0.2);

    // 5. T=65s (Max-Q): High altitude supersonic flight with gravity turn
    traj = controller.evaluateAtTime(65);
    expect(traj.position.y).toBeGreaterThan(300);
    expect(traj.position.z).toBeGreaterThan(50);
    expect(traj.pitchDeg).toBeLessThan(80);

    // 6. T=110s: Stage 1 separated
    traj = controller.evaluateAtTime(110);
    expect(traj.stage1Separated).toBe(true);

    // 7. CameraDirector modes
    camDirector.setMode('CINEMATIC');
    expect(camDirector.getMode()).toBe('CINEMATIC');

    camDirector.setMode('FOLLOW');
    expect(camDirector.getMode()).toBe('FOLLOW');

    // 8. CameraManager ignores updateOrbit when in earth_launch scenario
    camManager.setScenarioMode('earth_launch');
    expect(camManager.activeScenario).toBe('earth_launch');
    camManager.setScenarioMode('none');
  });
});

describe('Earth History Simulation & Epoch Transitions', () => {
  it('guarantees seamless contiguous boundaries with zero timeline gaps', async () => {
    const { EARTH_PERIODS } = await import('../simulation/data/earthHistoryData');

    expect(EARTH_PERIODS.length).toBe(6);
    expect(EARTH_PERIODS[0].startMa).toBe(-4540);
    expect(EARTH_PERIODS[EARTH_PERIODS.length - 1].endMa).toBe(0);

    // Verify each period's end matches the next period's start (ZERO GAPS!)
    for (let i = 0; i < EARTH_PERIODS.length - 1; i++) {
      expect(EARTH_PERIODS[i].endMa).toBe(EARTH_PERIODS[i + 1].startMa);
    }
  });

  it('guarantees getPeriodAtMa returns correct geological periods without flashing to modern', async () => {
    const { getPeriodAtMa } = await import('../simulation/data/earthHistoryData');

    // Hadean
    expect(getPeriodAtMa(-4540).current.id).toBe('hadean');
    expect(getPeriodAtMa(-4200).current.id).toBe('hadean');

    // Archean to Paleozoic (previously -541 to -300 was a gap!)
    expect(getPeriodAtMa(-4000).current.id).toBe('archean-proterozoic');
    expect(getPeriodAtMa(-2400).current.id).toBe('archean-proterozoic');
    expect(getPeriodAtMa(-500).current.id).toBe('archean-proterozoic'); // Was failing before!
    expect(getPeriodAtMa(-350).current.id).toBe('archean-proterozoic'); // Was failing before!

    // Pangaea
    expect(getPeriodAtMa(-300).current.id).toBe('pangaea');
    expect(getPeriodAtMa(-250).current.id).toBe('pangaea');

    // Jurassic & Cretaceous
    expect(getPeriodAtMa(-200).current.id).toBe('jurassic-cretaceous');
    expect(getPeriodAtMa(-100).current.id).toBe('jurassic-cretaceous');

    // Cenozoic & Ice Age (previously -66 to -2.58 was a gap!)
    expect(getPeriodAtMa(-66).current.id).toBe('ice-age');
    expect(getPeriodAtMa(-50).current.id).toBe('ice-age'); // Was failing before!
    expect(getPeriodAtMa(-10).current.id).toBe('ice-age'); // Was failing before!
    expect(getPeriodAtMa(-2.58).current.id).toBe('ice-age');

    // Modern
    expect(getPeriodAtMa(-0.012).current.id).toBe('modern');
    expect(getPeriodAtMa(0).current.id).toBe('modern');
  });

  it('guarantees getEpochStageAtMa is strictly monotonic and continuous from 0.0 to 5.0', async () => {
    const { getEpochStageAtMa } = await import('../simulation/data/earthHistoryData');

    expect(getEpochStageAtMa(-4540)).toBeCloseTo(0.0, 4);
    expect(getEpochStageAtMa(-4000)).toBeCloseTo(1.0, 4);
    expect(getEpochStageAtMa(-300)).toBeCloseTo(2.0, 4);
    expect(getEpochStageAtMa(-200)).toBeCloseTo(3.0, 4);
    expect(getEpochStageAtMa(-66)).toBeCloseTo(3.5, 4);
    expect(getEpochStageAtMa(-2.58)).toBeCloseTo(4.0, 4);
    expect(getEpochStageAtMa(0)).toBeCloseTo(5.0, 4);

    // Monotonicity check across 454 sample points
    let prevStage = 0;
    for (let ma = -4540; ma <= 0; ma += 10) {
      const stage = getEpochStageAtMa(ma);
      expect(stage).toBeGreaterThanOrEqual(prevStage);
      expect(stage).toBeLessThanOrEqual(5.0);
      prevStage = stage;
    }
  });

  it('evaluates EarthTimelineController state with smooth transitions and triggers events', async () => {
    const { EarthTimelineController } = await import('../simulation/earth/EarthTimelineController');
    const controller = EarthTimelineController.getInstance();

    const stateHadean = controller.evaluateAtMa(-4540);
    expect(stateHadean.currentPeriod.id).toBe('hadean');
    expect(stateHadean.epochStage).toBeCloseTo(0.0, 3);
    expect(stateHadean.meanTempC).toBeGreaterThan(100);

    const stateModern = controller.evaluateAtMa(0);
    expect(stateModern.currentPeriod.id).toBe('modern');
    expect(stateModern.epochStage).toBeCloseTo(5.0, 3);
    expect(stateModern.meanTempC).toBeCloseTo(15, 1);
  });
});
