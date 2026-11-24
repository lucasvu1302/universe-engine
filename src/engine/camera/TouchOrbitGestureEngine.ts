export interface GesturePointerInput {
  pointerId: number;
  pointerType: string;
  clientX: number;
  clientY: number;
  button?: number;
  shiftKey?: boolean;
}

export interface TouchOrbitGestureCallbacks {
  onRotate: (deltaTheta: number, deltaPhi: number) => void;
  onPan: (deltaX: number, deltaY: number) => void;
  onZoom: (deltaRaw: number) => void;
  onReleaseInertia: (velTheta: number, velPhi: number) => void;
  onClearInertia: () => void;
  onDoubleTap: () => void;
}

interface TrackedPointer {
  x: number;
  y: number;
  startX: number;
  startY: number;
  downTime: number;
  maxTravelSq: number;
  pointerType: string;
  isPanButton: boolean;
}

const MOUSE_ROTATE_SPEED = 0.0045;
const TOUCH_ROTATE_SPEED = 0.0095;
const PINCH_LOG_GAIN = 680;
const MIN_PINCH_DIST = 8;
const DOUBLE_TAP_WINDOW_MS = 300;
const DOUBLE_TAP_MAX_DIST_SQ = 28 * 28;
const TAP_MAX_MOVE_SQ = 12 * 12;
const TAP_MAX_DURATION_MS = 280;
const MAX_INERTIA_VEL = 8.5;

/**
 * Unified Pointer Events state machine for single-finger orbit (with touch-only inertia),
 * logarithmic two-finger pinch-to-zoom without 2->1 finger jumps, double-tap quick zoom,
 * and strict pointercancel cleanup.
 */
export class TouchOrbitGestureEngine {
  private readonly callbacks: TouchOrbitGestureCallbacks;
  private readonly pointers = new Map<number, TrackedPointer>();

  private prevPinchDist: number | null = null;
  private prevMidX = 0;
  private prevMidY = 0;
  private wasMultiTouch = false;

  private lastMoveTime = 0;
  private velTheta = 0;
  private velPhi = 0;

  private lastTapTime = -Infinity;
  private lastTapX = 0;
  private lastTapY = 0;

  constructor(callbacks: TouchOrbitGestureCallbacks) {
    this.callbacks = callbacks;
  }

  public getActivePointerCount(): number {
    return this.pointers.size;
  }

  public reset(): void {
    this.pointers.clear();
    this.prevPinchDist = null;
    this.wasMultiTouch = false;
    this.velTheta = 0;
    this.velPhi = 0;
    this.lastTapTime = -Infinity;
    this.callbacks.onClearInertia();
  }

  public onPointerDown(input: GesturePointerInput, nowMs: number = performance.now()): void {
    this.callbacks.onClearInertia();

    const isPanButton =
      input.pointerType !== 'touch' &&
      (input.button === 2 || input.button === 1 || Boolean(input.shiftKey));

    this.pointers.set(input.pointerId, {
      x: input.clientX,
      y: input.clientY,
      startX: input.clientX,
      startY: input.clientY,
      downTime: nowMs,
      maxTravelSq: 0,
      pointerType: input.pointerType,
      isPanButton,
    });

    this.velTheta = 0;
    this.velPhi = 0;
    this.lastMoveTime = nowMs;

    if (this.pointers.size >= 2) {
      this.wasMultiTouch = true;
      this.syncTwoFingerAnchor();
    } else {
      this.wasMultiTouch = false;
      this.prevPinchDist = null;
    }
  }

  public onPointerMove(input: GesturePointerInput, nowMs: number = performance.now()): void {
    const ptr = this.pointers.get(input.pointerId);
    if (!ptr) return;

    const dx = input.clientX - ptr.x;
    const dy = input.clientY - ptr.y;
    ptr.x = input.clientX;
    ptr.y = input.clientY;

    const travelX = input.clientX - ptr.startX;
    const travelY = input.clientY - ptr.startY;
    const travelSq = travelX * travelX + travelY * travelY;
    if (travelSq > ptr.maxTravelSq) {
      ptr.maxTravelSq = travelSq;
    }

    if (this.pointers.size >= 2) {
      this.handleTwoFingerMove();
      this.lastMoveTime = nowMs;
      return;
    }

    if (ptr.isPanButton) {
      this.callbacks.onPan(dx, dy);
      this.velTheta = 0;
      this.velPhi = 0;
      this.lastMoveTime = nowMs;
      return;
    }

    const isTouch = ptr.pointerType === 'touch';
    const rotSpeed = isTouch ? TOUCH_ROTATE_SPEED : MOUSE_ROTATE_SPEED;
    const dTheta = dx * rotSpeed;
    const dPhi = dy * rotSpeed;

    this.callbacks.onRotate(dTheta, dPhi);

    if (isTouch) {
      const dtSec = Math.max((nowMs - this.lastMoveTime) / 1000, 0.008);
      if (dtSec < 0.2) {
        const instVelTheta = Math.max(-MAX_INERTIA_VEL, Math.min(MAX_INERTIA_VEL, dTheta / dtSec));
        const instVelPhi = Math.max(-MAX_INERTIA_VEL, Math.min(MAX_INERTIA_VEL, dPhi / dtSec));
        this.velTheta = this.velTheta * 0.45 + instVelTheta * 0.55;
        this.velPhi = this.velPhi * 0.45 + instVelPhi * 0.55;
      } else {
        this.velTheta = 0;
        this.velPhi = 0;
      }
    } else {
      this.velTheta = 0;
      this.velPhi = 0;
    }

    this.lastMoveTime = nowMs;
  }

  public onPointerUp(input: GesturePointerInput, nowMs: number = performance.now()): void {
    const ptr = this.pointers.get(input.pointerId);
    if (!ptr) return;

    const wasTwoOrMore = this.pointers.size >= 2;
    this.pointers.delete(input.pointerId);

    if (this.pointers.size >= 2) {
      this.syncTwoFingerAnchor();
      return;
    }

    if (wasTwoOrMore) {
      // Transitioning 2 -> 1 finger: re-anchor cleanly with zero jump and zero residual velocity
      this.prevPinchDist = null;
      this.velTheta = 0;
      this.velPhi = 0;
      this.lastMoveTime = nowMs;
      this.callbacks.onClearInertia();
      return;
    }

    // Final single pointer released
    this.prevPinchDist = null;
    const isTouch = ptr.pointerType === 'touch';

    if (isTouch && !this.wasMultiTouch) {
      const durationMs = nowMs - ptr.downTime;
      const isShortTap = ptr.maxTravelSq <= TAP_MAX_MOVE_SQ && durationMs <= TAP_MAX_DURATION_MS;

      if (isShortTap) {
        const tapDx = input.clientX - this.lastTapX;
        const tapDy = input.clientY - this.lastTapY;
        const withinWindow = nowMs - this.lastTapTime <= DOUBLE_TAP_WINDOW_MS;
        const withinDist = tapDx * tapDx + tapDy * tapDy <= DOUBLE_TAP_MAX_DIST_SQ;

        if (withinWindow && withinDist) {
          this.lastTapTime = -Infinity;
          this.velTheta = 0;
          this.velPhi = 0;
          this.callbacks.onClearInertia();
          this.callbacks.onDoubleTap();
          return;
        }

        this.lastTapTime = nowMs;
        this.lastTapX = input.clientX;
        this.lastTapY = input.clientY;
        this.velTheta = 0;
        this.velPhi = 0;
        this.callbacks.onClearInertia();
        return;
      }

      // Apply touch-only release inertia when finger released cleanly after swipe
      const idleSinceMoveMs = nowMs - this.lastMoveTime;
      if (idleSinceMoveMs < 110 && (Math.abs(this.velTheta) > 0.05 || Math.abs(this.velPhi) > 0.05)) {
        this.callbacks.onReleaseInertia(this.velTheta, this.velPhi);
      } else {
        this.callbacks.onClearInertia();
      }
    } else {
      // Desktop mouse or post-pinch single-finger lift: zero inertia
      this.callbacks.onClearInertia();
    }

    this.velTheta = 0;
    this.velPhi = 0;
    this.wasMultiTouch = false;
  }

  public onPointerCancel(pointerId: number): void {
    this.pointers.delete(pointerId);
    this.prevPinchDist = null;
    this.velTheta = 0;
    this.velPhi = 0;
    if (this.pointers.size === 0) {
      this.wasMultiTouch = false;
    } else if (this.pointers.size >= 2) {
      this.syncTwoFingerAnchor();
    }
    this.callbacks.onClearInertia();
  }

  private getFirstTwoPointers(): [TrackedPointer, TrackedPointer] | null {
    let first: TrackedPointer | null = null;
    for (const ptr of this.pointers.values()) {
      if (!first) {
        first = ptr;
      } else {
        return [first, ptr];
      }
    }
    return null;
  }

  private syncTwoFingerAnchor(): void {
    const pair = this.getFirstTwoPointers();
    if (!pair) {
      this.prevPinchDist = null;
      return;
    }
    const [a, b] = pair;
    this.prevPinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    this.prevMidX = (a.x + b.x) * 0.5;
    this.prevMidY = (a.y + b.y) * 0.5;
  }

  private handleTwoFingerMove(): void {
    const pair = this.getFirstTwoPointers();
    if (!pair) return;
    const [a, b] = pair;

    const currDist = Math.hypot(a.x - b.x, a.y - b.y);
    const midX = (a.x + b.x) * 0.5;
    const midY = (a.y + b.y) * 0.5;

    if (this.prevPinchDist !== null && this.prevPinchDist >= MIN_PINCH_DIST && currDist >= MIN_PINCH_DIST) {
      const logRatio = Math.log(this.prevPinchDist / currDist);
      if (Math.abs(logRatio) > 1e-4) {
        this.callbacks.onZoom(logRatio * PINCH_LOG_GAIN);
      }

      // Only pan when user clearly drags both fingers in parallel without pinching,
      // keeping focused celestial bodies locked during pinch-to-zoom.
      const panDx = midX - this.prevMidX;
      const panDy = midY - this.prevMidY;
      if (Math.abs(logRatio) < 0.012 && Math.hypot(panDx, panDy) > 3.5) {
        this.callbacks.onPan(panDx, panDy);
      }
    }

    this.prevPinchDist = currDist;
    this.prevMidX = midX;
    this.prevMidY = midY;
  }
}
