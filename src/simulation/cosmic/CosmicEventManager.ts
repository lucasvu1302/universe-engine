import { CosmicEventData } from "../core/types";
import { COSMIC_EVENTS } from "../data/cosmicEventsData";
import { SimulationEventBus } from "../core/SimulationEventBus";

export interface CosmicPlaybackState {
  currentEvent: CosmicEventData;
  progress: number; // 0 to 1 within the event
  timeGyrAgo: number;
}

export class CosmicEventManager {
  private static instance: CosmicEventManager;
  private currentEventIndex = 0;
  private eventProgress = 0;
  private eventBus: SimulationEventBus;

  private constructor() {
    this.eventBus = SimulationEventBus.getInstance();

    this.eventBus.on("timeline:time_update", (time) => {
      this.evaluateAtTime(time);
    });
  }

  public static getInstance(): CosmicEventManager {
    if (!CosmicEventManager.instance) {
      CosmicEventManager.instance = new CosmicEventManager();
    }
    return CosmicEventManager.instance;
  }

  public getPlaybackState(): CosmicPlaybackState {
    const currentEvent = COSMIC_EVENTS[this.currentEventIndex] || COSMIC_EVENTS[0];
    return {
      currentEvent,
      progress: this.eventProgress,
      timeGyrAgo: currentEvent.timeGyrAgo
    };
  }

  public selectEventByIndex(index: number): void {
    if (index >= 0 && index < COSMIC_EVENTS.length) {
      this.currentEventIndex = index;
      this.eventProgress = 0;
      this.eventBus.emit("cosmic:event_trigger", COSMIC_EVENTS[index]);
    }
  }

  public evaluateAtTime(timeSeconds: number): CosmicPlaybackState {
    // Each event occupies 15 seconds in the 75-second timeline (0 to 75)
    const eventDuration = 15;
    const totalEvents = COSMIC_EVENTS.length;
    const clampedTime = Math.min(Math.max(timeSeconds, 0), totalEvents * eventDuration);

    const index = Math.min(Math.floor(clampedTime / eventDuration), totalEvents - 1);
    const progress = (clampedTime % eventDuration) / eventDuration;

    if (index !== this.currentEventIndex) {
      this.currentEventIndex = index;
      this.eventBus.emit("cosmic:event_trigger", COSMIC_EVENTS[index]);
    }

    this.eventProgress = progress;
    return this.getPlaybackState();
  }
}
