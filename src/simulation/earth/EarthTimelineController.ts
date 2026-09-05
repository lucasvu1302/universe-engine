import * as THREE from "three";
import { EarthPeriod, HistoricalEvent } from "../core/types";
import { EARTH_PERIODS, getPeriodAtMa } from "../data/earthHistoryData";
import { SimulationEventBus } from "../core/SimulationEventBus";

export interface EarthClimateState {
  millionYearsAgo: number;
  currentPeriod: EarthPeriod;
  nextPeriod: EarthPeriod | null;
  blendFactor: number;
  epochStage: number; // 0.0 to 5.0 for continuous shader crossfade
  meanTempC: number;
  o2Percent: number;
  co2Ppm: number;
  seaLevelM: number;
  activeImpactGlow: number;
  lastTriggeredEvent: HistoricalEvent | null;
}

export class EarthTimelineController {
  private static instance: EarthTimelineController;

  private state: EarthClimateState;
  private eventBus: SimulationEventBus;
  private triggeredEventIds = new Set<string>();

  private constructor() {
    this.eventBus = SimulationEventBus.getInstance();
    const initial = getPeriodAtMa(-4540);

    this.state = {
      millionYearsAgo: -4540,
      currentPeriod: initial.current,
      nextPeriod: initial.next,
      blendFactor: 0,
      epochStage: 0,
      meanTempC: initial.current.meanTempC,
      o2Percent: initial.current.o2Percent,
      co2Ppm: initial.current.co2Ppm,
      seaLevelM: initial.current.seaLevelM,
      activeImpactGlow: 0,
      lastTriggeredEvent: null
    };

    this.eventBus.on("timeline:time_update", (time) => {
      this.evaluateAtMa(time);
    });
  }

  public static getInstance(): EarthTimelineController {
    if (!EarthTimelineController.instance) {
      EarthTimelineController.instance = new EarthTimelineController();
    }
    return EarthTimelineController.instance;
  }

  public getState(): EarthClimateState {
    return this.state;
  }

  public evaluateAtMa(millionYearsAgo: number): EarthClimateState {
    const ma = Math.min(Math.max(millionYearsAgo, -4540), 0);
    const { current, next, blendFactor } = getPeriodAtMa(ma);

    // Calculate epoch stage index (0 to 5)
    const currentIndex = EARTH_PERIODS.findIndex((p) => p.id === current.id);
    const epochStage = Math.min(currentIndex + blendFactor, 5.0);

    // Interpolate climate scalars
    const nextP = next || current;
    const temp = THREE.MathUtils.lerp(current.meanTempC, nextP.meanTempC, blendFactor);
    const o2 = THREE.MathUtils.lerp(current.o2Percent, nextP.o2Percent, blendFactor);
    const co2 = THREE.MathUtils.lerp(current.co2Ppm, nextP.co2Ppm, blendFactor);
    const sea = THREE.MathUtils.lerp(current.seaLevelM, nextP.seaLevelM, blendFactor);

    // Check for geological events around current Ma (within window)
    let impactGlow = 0;
    for (const period of EARTH_PERIODS) {
      for (const ev of period.events) {
        const diff = Math.abs(ma - ev.millionYearsAgo);
        if (diff < 15) {
          if (!this.triggeredEventIds.has(ev.id)) {
            this.triggeredEventIds.add(ev.id);
            this.state.lastTriggeredEvent = ev;
            this.eventBus.emit("earth:event_trigger", ev);
          }
          if (ev.visualEffect === "asteroid_impact") {
            impactGlow = Math.max(0, 1.0 - diff / 15);
          }
        }
      }
    }

    this.state.millionYearsAgo = ma;
    this.state.currentPeriod = current;
    this.state.nextPeriod = next;
    this.state.blendFactor = blendFactor;
    this.state.epochStage = epochStage;
    this.state.meanTempC = temp;
    this.state.o2Percent = o2;
    this.state.co2Ppm = co2;
    this.state.seaLevelM = sea;
    this.state.activeImpactGlow = impactGlow;

    this.eventBus.emit("earth:period_change", current, next, blendFactor);
    return this.state;
  }
}
