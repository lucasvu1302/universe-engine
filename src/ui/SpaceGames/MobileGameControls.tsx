import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface MobileGameActionConfig {
  id: string;
  label: string;
  sublabel?: string;
  color?: 'cyan' | 'amber' | 'rose' | 'emerald' | 'violet';
  disabled?: boolean;
  highlight?: boolean;
  onPressChange: (pressed: boolean) => void;
}

export interface MobileGameControlsProps {
  onMove: (x: number, y: number) => void;
  actions: MobileGameActionConfig[];
  /** When true (e.g. a modal/pause screen is open), immediately resets and suppresses all touch inputs. */
  disabled?: boolean;
}

const COLOR_STYLES: Record<NonNullable<MobileGameActionConfig['color']>, string> = {
  cyan: 'border-cyan-400/60 bg-cyan-500/25 text-cyan-100 active:bg-cyan-400/45 shadow-cyan-500/25',
  amber: 'border-amber-400/60 bg-amber-500/25 text-amber-100 active:bg-amber-400/45 shadow-amber-500/25',
  rose: 'border-rose-400/60 bg-rose-500/25 text-rose-100 active:bg-rose-400/45 shadow-rose-500/25',
  emerald: 'border-emerald-400/60 bg-emerald-500/25 text-emerald-100 active:bg-emerald-400/45 shadow-emerald-500/25',
  violet: 'border-violet-400/60 bg-violet-500/25 text-violet-100 active:bg-violet-400/45 shadow-violet-500/25',
};

const STICK_MAX_RADIUS = 38;

/**
 * Shared responsive Virtual Dual-Thumb Gamepad overlay for all 5 3D Space Games.
 * Isolates per-finger pointerIds across thumbstick and tactical buttons, clears cleanly on
 * blur / visibilitychange / lostpointercapture / modal pause, and honors safe-area insets.
 */
export const MobileGameControls: React.FC<MobileGameControlsProps> = ({
  onMove,
  actions,
  disabled = false,
}) => {
  const stickRef = useRef<HTMLDivElement>(null);
  const stickPointerId = useRef<number | null>(null);
  const actionPointersRef = useRef<Map<string, number>>(new Map());
  const actionsRef = useRef(actions);
  const onMoveRef = useRef(onMove);
  actionsRef.current = actions;
  onMoveRef.current = onMove;

  const [nub, setNub] = useState({ x: 0, y: 0 });
  const [pressedIds, setPressedIds] = useState<Record<string, boolean>>({});

  const resetStick = useCallback(() => {
    stickPointerId.current = null;
    setNub({ x: 0, y: 0 });
    onMoveRef.current(0, 0);
  }, []);

  const resetAllInputs = useCallback(() => {
    stickPointerId.current = null;
    setNub({ x: 0, y: 0 });
    onMoveRef.current(0, 0);

    if (actionPointersRef.current.size > 0) {
      actionPointersRef.current.clear();
    }
    setPressedIds((prev) => (Object.keys(prev).length === 0 ? prev : {}));
    for (const act of actionsRef.current) {
      act.onPressChange(false);
    }
  }, []);

  // Reset immediately whenever disabled/paused flips true (modal popup, level-up, end screen)
  useEffect(() => {
    if (disabled) {
      resetAllInputs();
    }
  }, [disabled, resetAllInputs]);

  // Also clear any held button that becomes individually disabled
  useEffect(() => {
    for (const act of actions) {
      if (act.disabled && actionPointersRef.current.has(act.id)) {
        actionPointersRef.current.delete(act.id);
        setPressedIds((prev) => (prev[act.id] ? { ...prev, [act.id]: false } : prev));
        act.onPressChange(false);
      }
    }
  }, [actions]);

  // Global focus loss, tab switch & unmount cleanup
  useEffect(() => {
    const onBlur = () => resetAllInputs();
    const onVis = () => {
      if (document.hidden) resetAllInputs();
    };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVis);
      resetAllInputs();
    };
  }, [resetAllInputs]);

  const updateStickFromClient = (clientX: number, clientY: number) => {
    const el = stickRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    const rawDx = clientX - cx;
    const rawDy = clientY - cy;
    const dist = Math.hypot(rawDx, rawDy);
    const clamped = Math.min(dist, STICK_MAX_RADIUS);
    const nx = dist > 1 ? (rawDx / dist) * (clamped / STICK_MAX_RADIUS) : 0;
    const ny = dist > 1 ? (rawDy / dist) * (clamped / STICK_MAX_RADIUS) : 0;
    setNub({ x: nx * STICK_MAX_RADIUS, y: ny * STICK_MAX_RADIUS });
    onMove(nx, ny);
  };

  const handleActionState = (action: MobileGameActionConfig, pressed: boolean, pointerId?: number) => {
    if (pressed) {
      if (disabled || action.disabled) return;
      if (pointerId !== undefined) {
        if (actionPointersRef.current.has(action.id) && actionPointersRef.current.get(action.id) !== pointerId) {
          return;
        }
        actionPointersRef.current.set(action.id, pointerId);
      }
      setPressedIds((prev) => (prev[action.id] ? prev : { ...prev, [action.id]: true }));
      action.onPressChange(true);
    } else {
      if (
        pointerId !== undefined &&
        actionPointersRef.current.has(action.id) &&
        actionPointersRef.current.get(action.id) !== pointerId
      ) {
        return;
      }
      actionPointersRef.current.delete(action.id);
      setPressedIds((prev) => (!prev[action.id] ? prev : { ...prev, [action.id]: false }));
      action.onPressChange(false);
    }
  };

  const compactActions = actions.length >= 5;

  return (
    <div
      data-testid="mobile-game-controls"
      className="fixed inset-x-0 bottom-0 z-40 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(0.9rem,env(safe-area-inset-bottom))] pt-2 flex items-end justify-between pointer-events-none select-none lg:hidden"
    >
      {/* Left Virtual Analog Thumbstick */}
      <div
        ref={stickRef}
        data-testid="mobile-game-joystick"
        onPointerDown={(e) => {
          e.stopPropagation();
          if (disabled || stickPointerId.current !== null) return;
          stickPointerId.current = e.pointerId;
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // Safe fallback in jsdom
          }
          updateStickFromClient(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (disabled || stickPointerId.current !== e.pointerId) return;
          e.stopPropagation();
          updateStickFromClient(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (stickPointerId.current !== e.pointerId) return;
          resetStick();
        }}
        onPointerCancel={(e) => {
          if (stickPointerId.current !== e.pointerId) return;
          resetStick();
        }}
        onLostPointerCapture={(e) => {
          if (stickPointerId.current !== e.pointerId) return;
          resetStick();
        }}
        className={`pointer-events-auto touch-none relative w-[112px] h-[112px] rounded-full border border-sky-400/40 bg-slate-950/60 backdrop-blur-md shadow-2xl flex items-center justify-center ${
          disabled ? 'opacity-40 pointer-events-none' : ''
        }`}
      >
        <div className="absolute inset-3 rounded-full border border-dashed border-sky-400/25 pointer-events-none" />
        <div
          className="w-11 h-11 rounded-full bg-gradient-to-br from-sky-300 to-cyan-500 border-2 border-white/70 shadow-lg shadow-cyan-500/40 pointer-events-none transition-transform duration-75"
          style={{ transform: `translate3d(${nub.x}px, ${nub.y}px, 0)` }}
        />
      </div>

      {/* Right Tactical Action Cluster */}
      <div
        className={`pointer-events-auto touch-none flex flex-wrap justify-end gap-1.5 sm:gap-2 ${
          compactActions ? 'max-w-[232px]' : 'max-w-[216px]'
        } ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
      >
        {actions.map((action) => {
          const style = COLOR_STYLES[action.color ?? 'cyan'];
          const isPressed = Boolean(pressedIds[action.id]);
          return (
            <button
              key={action.id}
              type="button"
              data-testid={`mobile-game-action-${action.id}`}
              disabled={disabled || action.disabled}
              onPointerDown={(e) => {
                e.stopPropagation();
                if (disabled || action.disabled) return;
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                  // jsdom fallback
                }
                handleActionState(action, true, e.pointerId);
              }}
              onPointerUp={(e) => {
                handleActionState(action, false, e.pointerId);
              }}
              onPointerCancel={(e) => handleActionState(action, false, e.pointerId)}
              onLostPointerCapture={(e) => handleActionState(action, false, e.pointerId)}
              onPointerLeave={(e) => {
                if (isPressed && actionPointersRef.current.get(action.id) === e.pointerId) {
                  handleActionState(action, false, e.pointerId);
                }
              }}
              className={`${
                compactActions ? 'min-w-[58px] h-[48px] px-2' : 'min-w-[60px] h-[54px] px-2.5'
              } rounded-2xl border backdrop-blur-md shadow-lg flex flex-col items-center justify-center font-mono transition-transform cursor-pointer touch-none ${style} ${
                isPressed ? 'scale-92 brightness-125' : ''
              } ${action.highlight ? 'ring-2 ring-amber-300 animate-pulse' : ''} ${
                disabled || action.disabled ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              <span className="text-[11px] font-bold tracking-wider leading-tight">{action.label}</span>
              {action.sublabel && (
                <span className="text-[9px] opacity-80 leading-none mt-0.5">{action.sublabel}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
