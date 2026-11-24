import { useAppStore } from '@/stores/useAppStore';

export class InputManager {
  private static instance: InputManager;

  public keys: Record<string, boolean> = {};
  public pointerX = 0;
  public pointerY = 0;
  public deltaX = 0;
  public deltaY = 0;
  public isPointerDown = false;

  private lastClientX = 0;
  private lastClientY = 0;
  private isListening = false;

  private constructor() {
    this.attach();
  }

  public static getInstance(): InputManager {
    if (!InputManager.instance) {
      InputManager.instance = new InputManager();
    }
    return InputManager.instance;
  }

  public attach(): void {
    if (this.isListening || typeof window === 'undefined') return;

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('pointercancel', this.handleResetState);
    window.addEventListener('blur', this.handleResetState);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    this.isListening = true;
  }

  public detach(): void {
    if (!this.isListening || typeof window === 'undefined') return;

    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('pointercancel', this.handleResetState);
    window.removeEventListener('blur', this.handleResetState);
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }

    this.isListening = false;
  }

  private handleResetState = (): void => {
    this.keys = {};
    this.isPointerDown = false;
    this.resetDeltas();
  };

  private handleVisibilityChange = (): void => {
    if (typeof document !== 'undefined' && document.hidden) {
      this.handleResetState();
    }
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    // Avoid capturing inputs if typing inside form fields or using OS/browser modifier shortcuts
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
    ) {
      return;
    }
    if (e.metaKey) return;
    // Allow standalone Control/Alt precision flight keys while ignoring browser combos (Ctrl+R, Ctrl+K, Alt+Left)
    if ((e.ctrlKey || e.altKey) && e.key !== 'Control' && e.key !== 'Alt') return;

    // Prevent Space / Arrow keys from activating focused HUD buttons or scrolling during active 3D Space Games (G1)
    const activeGame = useAppStore.getState().activeSpaceGame;
    if (
      activeGame !== 'none' &&
      (e.code === 'Space' ||
        e.key === ' ' ||
        e.code === 'ArrowUp' ||
        e.code === 'ArrowDown' ||
        e.code === 'ArrowLeft' ||
        e.code === 'ArrowRight')
    ) {
      e.preventDefault();
    }

    this.keys[e.key.toLowerCase()] = true;
    this.keys[e.code] = true;
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys[e.key.toLowerCase()] = false;
    this.keys[e.code] = false;
  };

  private handlePointerMove = (e: PointerEvent): void => {
    const hasPointerLock = typeof document !== 'undefined' && !!document.pointerLockElement;
    if (hasPointerLock) {
      this.deltaX += e.movementX || 0;
      this.deltaY += e.movementY || 0;
    } else if (this.isPointerDown) {
      this.deltaX += e.clientX - this.lastClientX;
      this.deltaY += e.clientY - this.lastClientY;
    }
    this.lastClientX = e.clientX;
    this.lastClientY = e.clientY;
    this.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
    this.pointerY = -(e.clientY / window.innerHeight) * 2 + 1;
  };

  private handlePointerDown = (e: PointerEvent): void => {
    const target = e.target as HTMLElement | null;
    // Ignore pointer drags initiated on HUD/SuperNav controls; only canvas drags steer Free Flight look
    if (target && typeof target.tagName === 'string' && target.tagName !== 'CANVAS') {
      this.isPointerDown = false;
      return;
    }
    this.lastClientX = e.clientX;
    this.lastClientY = e.clientY;
    this.isPointerDown = true;
  };

  private handlePointerUp = (): void => {
    this.isPointerDown = false;
  };

  public isKeyPressed(key: string): boolean {
    return !!this.keys[key.toLowerCase()] || !!this.keys[key];
  }

  public resetDeltas(): void {
    this.deltaX = 0;
    this.deltaY = 0;
  }
}
