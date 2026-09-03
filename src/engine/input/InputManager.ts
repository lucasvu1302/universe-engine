export class InputManager {
  private static instance: InputManager;

  public keys: Record<string, boolean> = {};
  public pointerX = 0;
  public pointerY = 0;
  public deltaX = 0;
  public deltaY = 0;
  public isPointerDown = false;

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

    this.isListening = true;
  }

  public detach(): void {
    if (!this.isListening || typeof window === 'undefined') return;

    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointerup', this.handlePointerUp);

    this.isListening = false;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    // Avoid capturing inputs if typing inside an input element or textarea
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    this.keys[e.key.toLowerCase()] = true;
    this.keys[e.code] = true;
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys[e.key.toLowerCase()] = false;
    this.keys[e.code] = false;
  };

  private handlePointerMove = (e: PointerEvent): void => {
    this.deltaX = e.movementX || 0;
    this.deltaY = e.movementY || 0;
    this.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
    this.pointerY = -(e.clientY / window.innerHeight) * 2 + 1;
  };

  private handlePointerDown = (): void => {
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
