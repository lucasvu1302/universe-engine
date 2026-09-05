import { describe, it, expect, beforeEach, vi } from "vitest";
import { SimulationEventBus } from "../simulation/core/SimulationEventBus";

describe("SimulationEventBus", () => {
  let bus: SimulationEventBus;

  beforeEach(() => {
    bus = SimulationEventBus.getInstance();
    bus.clear();
  });

  it("registers listeners and receives emitted events", () => {
    const handler = vi.fn();
    bus.on("simulation:scenario_change", handler);

    bus.emit("simulation:scenario_change", "earth_launch");
    expect(handler).toHaveBeenCalledWith("earth_launch");
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("allows unsubscription via returned cleanup function", () => {
    const handler = vi.fn();
    const unsubscribe = bus.on("camera:shake", handler);

    bus.emit("camera:shake", 0.5, 1.0);
    expect(handler).toHaveBeenCalledTimes(1);

    unsubscribe();
    bus.emit("camera:shake", 0.8, 2.0);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("allows unsubscription via off method", () => {
    const handler = vi.fn();
    bus.on("camera:mode_change", handler);

    bus.emit("camera:mode_change", "COCKPIT");
    expect(handler).toHaveBeenCalledWith("COCKPIT");

    bus.off("camera:mode_change", handler);
    bus.emit("camera:mode_change", "WINDOW");
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("handles errors in listeners without crashing bus execution", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const faultyHandler = vi.fn().mockImplementation(() => {
      throw new Error("Failure in handler");
    });
    const goodHandler = vi.fn();

    bus.on("timeline:play_state_change", faultyHandler);
    bus.on("timeline:play_state_change", goodHandler);

    expect(() => {
      bus.emit("timeline:play_state_change", true);
    }).not.toThrow();

    expect(faultyHandler).toHaveBeenCalledWith(true);
    expect(goodHandler).toHaveBeenCalledWith(true);
    consoleSpy.mockRestore();
  });

  it("clears all listeners cleanly", () => {
    const handler = vi.fn();
    bus.on("timeline:speed_change", handler);

    bus.clear();
    bus.emit("timeline:speed_change", 2.0);
    expect(handler).not.toHaveBeenCalled();
  });
});
