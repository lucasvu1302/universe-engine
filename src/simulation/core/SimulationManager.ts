import { ScenarioType } from "./types";
import { TimelineEngine } from "./TimelineEngine";
import { SimulationEventBus } from "./SimulationEventBus";

export class SimulationManager {
  private static instance: SimulationManager;
  private activeScenario: ScenarioType = "none";
  private timelineEngine: TimelineEngine;
  private eventBus: SimulationEventBus;

  private constructor() {
    this.timelineEngine = new TimelineEngine();
    this.eventBus = SimulationEventBus.getInstance();
  }

  public static getInstance(): SimulationManager {
    if (!SimulationManager.instance) {
      SimulationManager.instance = new SimulationManager();
    }
    return SimulationManager.instance;
  }

  public getActiveScenario(): ScenarioType {
    return this.activeScenario;
  }

  public getTimelineEngine(): TimelineEngine {
    return this.timelineEngine;
  }

  public startScenario(scenario: ScenarioType): void {
    if (this.activeScenario === scenario) return;

    this.activeScenario = scenario;
    this.timelineEngine.reset();

    // Configure timeline engine for specific scenario
    switch (scenario) {
      case "earth_launch":
        // Launch timeline: 0 seconds to 360 seconds (6 minutes to orbit)
        this.timelineEngine.setTimeRange(0, 360);
        this.timelineEngine.setSpeed(1.0);
        break;

      case "earth_history":
        // Earth Geological timeline: -4540 Ma (Hadean) to 0 Ma (Present)
        this.timelineEngine.setTimeRange(-4540, 0);
        this.timelineEngine.seek(-4540);
        this.timelineEngine.setSpeed(40.0); // 40 million years per sec by default
        break;

      case "cosmic_history":
        // Cosmic timeline: 5 events * 15 seconds = 75 seconds total
        this.timelineEngine.setTimeRange(0, 75);
        this.timelineEngine.seek(0);
        this.timelineEngine.setSpeed(1.0);
        this.timelineEngine.setLoop(true);
        this.timelineEngine.play();
        break;

      case "none":
      default:
        this.timelineEngine.setTimeRange(0, 100);
        break;
    }

    this.eventBus.emit("simulation:scenario_change", scenario);
  }

  public exitScenario(): void {
    this.activeScenario = "none";
    this.timelineEngine.pause();
    this.timelineEngine.reset();
    this.eventBus.emit("simulation:scenario_change", "none");
  }

  public update(deltaSeconds: number): void {
    if (this.activeScenario !== "none") {
      this.timelineEngine.update(deltaSeconds);
    }
  }
}
