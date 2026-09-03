import * as THREE from 'three';

export interface OrbitParameters {
  distance: number;
  speed: number;
  eccentricity?: number;
  inclinationDeg?: number;
  initialPhase?: number;
}

export class SimulationClock {
  private static instance: SimulationClock;

  public simulationTime: number = 0;
  public timeScale: number = 1.0;
  public isPaused: boolean = false;
  public lastFrameTimestamp: number = 0;

  private constructor() {
    this.lastFrameTimestamp = performance.now();
  }

  public static getInstance(): SimulationClock {
    if (!SimulationClock.instance) {
      SimulationClock.instance = new SimulationClock();
    }
    return SimulationClock.instance;
  }

  /**
   * Advances the simulation clock by clamped real-time delta.
   * Prevents delta time explosion if tab was backgrounded.
   */
  public update(currentTimestamp: number = performance.now()): number {
    if (this.lastFrameTimestamp === 0) {
      this.lastFrameTimestamp = currentTimestamp;
      return 0;
    }

    const rawDelta = (currentTimestamp - this.lastFrameTimestamp) / 1000;
    this.lastFrameTimestamp = currentTimestamp;

    // Strict delta clamp to 100ms (0.1s)
    const clampedDelta = Math.min(Math.max(0, rawDelta), 0.1);

    if (!this.isPaused) {
      this.simulationTime += clampedDelta * this.timeScale;
    }

    return clampedDelta;
  }

  public setTimeScale(scale: number): void {
    // Prevent invalid or NaN values
    if (!Number.isFinite(scale)) return;
    this.timeScale = scale;
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
  }

  public reset(): void {
    this.simulationTime = 0;
    this.lastFrameTimestamp = performance.now();
  }

  /**
   * Computes Keplerian-approximated orbital coordinates at the given simulation time.
   * Outputs directly into target vector to guarantee 0 GC allocation.
   */
  public static calculateOrbitPosition(
    params: OrbitParameters,
    time: number,
    target: THREE.Vector3
  ): THREE.Vector3 {
    const {
      distance,
      speed,
      eccentricity = 0.0,
      inclinationDeg = 0.0,
      initialPhase = 0.0
    } = params;

    if (distance === 0 || speed === 0) {
      return target.set(0, 0, 0);
    }

    // Mean anomaly / angular progression (radians)
    const angle = (time * speed * 0.1 + initialPhase) % (Math.PI * 2);

    // Approximate elliptical radius
    const r = distance * (1 - eccentricity * eccentricity) / (1 + eccentricity * Math.cos(angle));

    // Base orbit on X-Z plane
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;

    // Apply orbital inclination tilt
    const incRad = THREE.MathUtils.degToRad(inclinationDeg);
    const y = -z * Math.sin(incRad);
    const zFinal = z * Math.cos(incRad);

    return target.set(x, y, zFinal);
  }

  /**
   * Computes axial rotation angle around Y axis.
   */
  public static calculateRotationAngle(
    rotationSpeed: number,
    time: number
  ): number {
    return (time * rotationSpeed * 0.5) % (Math.PI * 2);
  }
}
