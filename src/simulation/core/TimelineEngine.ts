import { TimelineEvent, TimelineTimeRange, NarrationData } from "./types";
import { SimulationEventBus } from "./SimulationEventBus";

export class TimelineEngine {
  private currentTime: number;
  private timeRange: TimelineTimeRange;
  private speed: number = 1.0;
  private isPlaying: boolean = false;
  private loop: boolean = false;
  private events: TimelineEvent[] = [];
  private triggeredEventIds: Set<string> = new Set();
  private eventBus: SimulationEventBus;

  constructor(
    timeRange: TimelineTimeRange = { min: 0, max: 100 },
    initialTime?: number
  ) {
    this.timeRange = { ...timeRange };
    this.currentTime = initialTime !== undefined ? initialTime : this.timeRange.min;
    this.eventBus = SimulationEventBus.getInstance();
  }

  public getCurrentTime(): number {
    return this.currentTime;
  }

  public getProgress(): number {
    const span = this.timeRange.max - this.timeRange.min;
    if (span <= 0) return 0;
    return Math.min(Math.max((this.currentTime - this.timeRange.min) / span, 0), 1);
  }

  public getTimeRange(): TimelineTimeRange {
    return { ...this.timeRange };
  }

  public setTimeRange(min: number, max: number): void {
    this.timeRange = { min, max };
    if (this.currentTime < min) this.currentTime = min;
    if (this.currentTime > max) this.currentTime = max;
    this.eventBus.emit("timeline:time_update", this.currentTime, this.getProgress());
  }

  public getSpeed(): number {
    return this.speed;
  }

  public setSpeed(speed: number): void {
    if (!Number.isFinite(speed) || speed <= 0) return;
    this.speed = speed;
    this.eventBus.emit("timeline:speed_change", this.speed);
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public setLoop(loop: boolean): void {
    this.loop = loop;
  }

  public play(): void {
    if (this.currentTime >= this.timeRange.max && !this.loop) {
      this.currentTime = this.timeRange.min;
      this.triggeredEventIds.clear();
    }
    this.isPlaying = true;
    this.eventBus.emit("timeline:play_state_change", true);
  }

  public pause(): void {
    this.isPlaying = false;
    this.eventBus.emit("timeline:play_state_change", false);
  }

  public togglePlay(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public seek(targetTime: number): void {
    const prevTime = this.currentTime;
    this.currentTime = Math.min(Math.max(targetTime, this.timeRange.min), this.timeRange.max);

    // Re-evaluate triggered events after jump
    this.checkEventsAfterSeek(prevTime, this.currentTime);

    this.eventBus.emit("timeline:time_update", this.currentTime, this.getProgress());
  }

  public seekPercent(percent: number): void {
    const clamped = Math.min(Math.max(percent, 0), 1);
    const target = this.timeRange.min + clamped * (this.timeRange.max - this.timeRange.min);
    this.seek(target);
  }

  public registerEvent(event: TimelineEvent): void {
    this.events.push(event);
    this.events.sort((a, b) => a.time - b.time);
  }

  public registerEvents(events: TimelineEvent[]): void {
    events.forEach((e) => this.registerEvent(e));
  }

  public unregisterEvent(id: string): void {
    this.events = this.events.filter((e) => e.id !== id);
    this.triggeredEventIds.delete(id);
  }

  public clearEvents(): void {
    this.events = [];
    this.triggeredEventIds.clear();
  }

  public getEvents(): TimelineEvent[] {
    return [...this.events];
  }

  /**
   * Deterministic per-frame update with clamped delta time.
   */
  public update(deltaSeconds: number): void {
    if (!this.isPlaying || deltaSeconds <= 0) return;

    const prevTime = this.currentTime;
    const advance = deltaSeconds * this.speed;
    this.currentTime += advance;

    if (this.currentTime >= this.timeRange.max) {
      if (this.loop) {
        this.currentTime = this.timeRange.min;
        this.triggeredEventIds.clear();
      } else {
        this.currentTime = this.timeRange.max;
        this.pause();
      }
    }

    // Trigger any events crossed during this step
    this.checkEvents(prevTime, this.currentTime);

    this.eventBus.emit("timeline:time_update", this.currentTime, this.getProgress());
  }

  private checkEvents(fromTime: number, toTime: number): void {
    for (const event of this.events) {
      if (fromTime <= event.time && toTime >= event.time) {
        if (!this.triggeredEventIds.has(event.id)) {
          this.triggeredEventIds.add(event.id);
          this.dispatchEvent(event);
        }
      }
    }
  }

  private checkEventsAfterSeek(prevTime: number, newTime: number): void {
    if (newTime < prevTime) {
      // Seek backwards: reset triggers for events ahead of newTime
      this.triggeredEventIds.forEach((id) => {
        const ev = this.events.find((e) => e.id === id);
        if (ev && ev.time > newTime) {
          this.triggeredEventIds.delete(id);
        }
      });
    } else {
      // Seek forward: trigger all events between prevTime and newTime
      this.checkEvents(prevTime, newTime);
    }
  }

  private dispatchEvent(event: TimelineEvent): void {
    if (event.type === "narration" && event.data) {
      this.eventBus.emit("story:show", event.data as NarrationData);
    }
  }

  public reset(): void {
    this.currentTime = this.timeRange.min;
    this.isPlaying = false;
    this.triggeredEventIds.clear();
    this.eventBus.emit("timeline:time_update", this.currentTime, 0);
    this.eventBus.emit("timeline:play_state_change", false);
  }
}
