import { describe, it, expect, beforeEach, vi } from "vitest";
import { TimelineEngine } from "../simulation/core/TimelineEngine";
import { SimulationEventBus } from "../simulation/core/SimulationEventBus";

describe("TimelineEngine", () => {
  let engine: TimelineEngine;
  let bus: SimulationEventBus;

  beforeEach(() => {
    bus = SimulationEventBus.getInstance();
    bus.clear();
    engine = new TimelineEngine({ min: 0, max: 100 }, 0);
  });

  it("initializes with provided time range and initial time", () => {
    expect(engine.getCurrentTime()).toBe(0);
    expect(engine.getTimeRange()).toEqual({ min: 0, max: 100 });
    expect(engine.getProgress()).toBe(0);
    expect(engine.getIsPlaying()).toBe(false);
  });

  it("calculates progress accurately across range", () => {
    engine.seek(50);
    expect(engine.getProgress()).toBeCloseTo(0.5, 4);
    engine.seek(100);
    expect(engine.getProgress()).toBeCloseTo(1.0, 4);
  });

  it("clamps seek time within min and max", () => {
    engine.seek(-20);
    expect(engine.getCurrentTime()).toBe(0);

    engine.seek(150);
    expect(engine.getCurrentTime()).toBe(100);
  });

  it("seeks by percentage correctly", () => {
    engine.seekPercent(0.25);
    expect(engine.getCurrentTime()).toBeCloseTo(25, 4);

    engine.seekPercent(0.75);
    expect(engine.getCurrentTime()).toBeCloseTo(75, 4);
  });

  it("controls play, pause, and togglePlay", () => {
    const playListener = vi.fn();
    bus.on("timeline:play_state_change", playListener);

    engine.play();
    expect(engine.getIsPlaying()).toBe(true);
    expect(playListener).toHaveBeenCalledWith(true);

    engine.pause();
    expect(engine.getIsPlaying()).toBe(false);
    expect(playListener).toHaveBeenCalledWith(false);

    engine.togglePlay();
    expect(engine.getIsPlaying()).toBe(true);
  });

  it("advances time on update when playing", () => {
    const timeListener = vi.fn();
    bus.on("timeline:time_update", timeListener);

    engine.play();
    engine.update(1.0); // delta = 1.0s, speed = 1.0
    expect(engine.getCurrentTime()).toBeCloseTo(1.0, 4);
    expect(timeListener).toHaveBeenCalledWith(1.0, 0.01);

    engine.setSpeed(2.0);
    engine.update(0.5); // delta = 0.5s, speed = 2.0 -> advance 1.0s
    expect(engine.getCurrentTime()).toBeCloseTo(2.0, 4);
  });

  it("does not advance time when paused", () => {
    engine.pause();
    engine.update(1.0);
    expect(engine.getCurrentTime()).toBe(0);
  });

  it("stops and pauses at max time when loop is false", () => {
    engine.seek(99);
    engine.play();
    engine.update(2.0);

    expect(engine.getCurrentTime()).toBe(100);
    expect(engine.getIsPlaying()).toBe(false);
  });

  it("loops back to min time when loop is true", () => {
    engine.setLoop(true);
    engine.seek(99);
    engine.play();
    engine.update(2.0);

    expect(engine.getCurrentTime()).toBe(0);
    expect(engine.getIsPlaying()).toBe(true);
  });

  it("dispatches events when crossing event timestamp", () => {
    const storyListener = vi.fn();
    bus.on("story:show", storyListener);

    engine.registerEvent({
      id: "event-1",
      time: 10,
      type: "narration",
      title: "Liftoff",
      data: { title: "Liftoff", body: "We have liftoff!" },
    });

    engine.play();
    engine.update(5); // time: 5 -> not reached
    expect(storyListener).not.toHaveBeenCalled();

    engine.update(6); // time: 11 -> crossed 10
    expect(storyListener).toHaveBeenCalledTimes(1);
    expect(storyListener).toHaveBeenCalledWith({
      title: "Liftoff",
      body: "We have liftoff!",
    });

    // Subsequent updates do not re-trigger
    engine.update(5);
    expect(storyListener).toHaveBeenCalledTimes(1);
  });

  it("resets triggers when seeking backward", () => {
    const storyListener = vi.fn();
    bus.on("story:show", storyListener);

    engine.registerEvent({
      id: "event-1",
      time: 20,
      type: "narration",
      title: "Stage 1",
      data: { title: "Stage 1", body: "MECO" },
    });

    engine.seek(25); // crossed 20
    expect(storyListener).toHaveBeenCalledTimes(1);

    // Seek back to 10
    engine.seek(10);

    // Advance again past 20
    engine.play();
    engine.update(15); // advances to 25
    expect(storyListener).toHaveBeenCalledTimes(2);
  });
});
