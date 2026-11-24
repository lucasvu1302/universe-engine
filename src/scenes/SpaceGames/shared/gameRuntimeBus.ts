/**
 * Lightweight zero-dependency typed pub/sub channel connecting a 60 FPS R3F game scene
 * to its throttled React HUD overlay and virtual mobile controls.
 * Buffers commands dispatched while a React.lazy 3D scene chunk is still mounting
 * and flushes them immediately once the scene subscribes.
 */
export interface GameChannel<TSnapshot, TCommand> {
  getSnapshot: () => TSnapshot;
  publishSnapshot: (snap: TSnapshot) => void;
  subscribeSnapshot: (fn: (snap: TSnapshot) => void) => () => void;
  dispatchCommand: (cmd: TCommand) => void;
  subscribeCommand: (fn: (cmd: TCommand) => void) => () => void;
  touchMove: { x: number; y: number };
  touchActions: Record<string, boolean>;
  resetTouch: () => void;
  /** Clears pending commands, resets virtual touch inputs, and restores a fresh baseline snapshot on exit/unmount. */
  reset: (freshSnapshot?: TSnapshot) => void;
}

export function createGameChannel<TSnapshot, TCommand>(
  initialSnapshot: TSnapshot
): GameChannel<TSnapshot, TCommand> {
  let current = initialSnapshot;
  const snapListeners = new Set<(s: TSnapshot) => void>();
  const cmdListeners = new Set<(c: TCommand) => void>();
  const pendingCommands: TCommand[] = [];
  const touchMove = { x: 0, y: 0 };
  const touchActions: Record<string, boolean> = {};

  const resetTouch = () => {
    touchMove.x = 0;
    touchMove.y = 0;
    for (const k of Object.keys(touchActions)) {
      touchActions[k] = false;
    }
  };

  return {
    getSnapshot: () => current,
    publishSnapshot(snap: TSnapshot) {
      current = snap;
      snapListeners.forEach((fn) => fn(snap));
    },
    subscribeSnapshot(fn) {
      snapListeners.add(fn);
      return () => {
        snapListeners.delete(fn);
      };
    },
    dispatchCommand(cmd: TCommand) {
      if (cmdListeners.size === 0) {
        pendingCommands.push(cmd);
        return;
      }
      cmdListeners.forEach((fn) => fn(cmd));
    },
    subscribeCommand(fn) {
      cmdListeners.add(fn);
      if (pendingCommands.length > 0) {
        const queued = pendingCommands.splice(0, pendingCommands.length);
        for (const cmd of queued) {
          fn(cmd);
        }
      }
      return () => {
        cmdListeners.delete(fn);
      };
    },
    touchMove,
    touchActions,
    resetTouch,
    reset(freshSnapshot?: TSnapshot) {
      pendingCommands.length = 0;
      resetTouch();
      current = freshSnapshot ?? initialSnapshot;
      snapListeners.forEach((fn) => fn(current));
    },
  };
}
