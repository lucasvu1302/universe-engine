export interface HudThrottle {
  maybeEmit: (nowMs: number, fn: () => void) => void;
  forceEmit: (nowMs: number, fn: () => void) => void;
  reset: () => void;
}

/**
 * Caps continuous 60 FPS game loop HUD state updates to <= 15 Hz (default 67ms interval)
 * while permitting immediate discrete pushes (level up, victory, defeat, purchase).
 */
export function createHudThrottle(minIntervalMs = 67): HudThrottle {
  let lastEmitMs = -Infinity;

  return {
    maybeEmit(nowMs: number, fn: () => void) {
      if (nowMs - lastEmitMs >= minIntervalMs) {
        lastEmitMs = nowMs;
        fn();
      }
    },
    forceEmit(nowMs: number, fn: () => void) {
      lastEmitMs = nowMs;
      fn();
    },
    reset() {
      lastEmitMs = -Infinity;
    },
  };
}
