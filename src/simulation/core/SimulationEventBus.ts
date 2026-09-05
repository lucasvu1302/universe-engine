import {
  ScenarioType,
  SimulationCameraMode,
  LaunchStep,
  LaunchPhaseType,
  EarthPeriod,
  HistoricalEvent,
  CosmicEventData,
  NarrationData
} from "./types";

export interface SimulationEventMap {
  "simulation:scenario_change": (scenario: ScenarioType) => void;
  "timeline:time_update": (currentTime: number, progress: number) => void;
  "timeline:play_state_change": (isPlaying: boolean) => void;
  "timeline:speed_change": (speed: number) => void;
  "launch:step_change": (step: LaunchStep) => void;
  "launch:telemetry_update": (
    altitudeKm: number,
    velocityKms: number,
    gForce: number,
    phase: LaunchPhaseType
  ) => void;
  "earth:period_change": (
    currentPeriod: EarthPeriod,
    nextPeriod: EarthPeriod | null,
    blendFactor: number
  ) => void;
  "earth:event_trigger": (event: HistoricalEvent) => void;
  "cosmic:event_trigger": (event: CosmicEventData) => void;
  "camera:mode_change": (mode: SimulationCameraMode) => void;
  "camera:shake": (intensity: number, durationSeconds: number) => void;
  "story:show": (narration: NarrationData) => void;
  "story:dismiss": () => void;
}

type GenericListener = (...args: never[]) => void;

export class SimulationEventBus {
  private static instance: SimulationEventBus;
  private listeners: Map<string, Set<GenericListener>> = new Map();

  private constructor() {}

  public static getInstance(): SimulationEventBus {
    if (!SimulationEventBus.instance) {
      SimulationEventBus.instance = new SimulationEventBus();
    }
    return SimulationEventBus.instance;
  }

  public on<K extends keyof SimulationEventMap>(
    event: K,
    listener: SimulationEventMap[K]
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as unknown as GenericListener);

    return () => this.off(event, listener);
  }

  public off<K extends keyof SimulationEventMap>(
    event: K,
    listener: SimulationEventMap[K]
  ): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener as unknown as GenericListener);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  public emit<K extends keyof SimulationEventMap>(
    event: K,
    ...args: Parameters<SimulationEventMap[K]>
  ): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((listener) => {
        try {
          (listener as unknown as (...a: unknown[]) => void)(...args);
        } catch (err) {
          console.error(`Error in SimulationEventBus listener for ${event}:`, err);
        }
      });
    }
  }

  public clear(): void {
    this.listeners.clear();
  }
}
