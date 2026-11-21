import { useAppStore } from '@/stores/useAppStore';

export class AudioManager {
  private static instance: AudioManager;

  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private uiGain: GainNode | null = null;
  private warpGain: GainNode | null = null;

  private ambientOsc: OscillatorNode | null = null;
  private warpOsc: OscillatorNode | null = null;
  private warpFilter: BiquadFilterNode | null = null;

  private isInitialized = false;

  private constructor() {
    // Lazy initialized on first user interaction
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  public init(): void {
    if (this.isInitialized) return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master bus
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Ambient bus
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      this.ambientGain.connect(this.masterGain);

      // UI bus
      this.uiGain = this.ctx.createGain();
      this.uiGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      this.uiGain.connect(this.masterGain);

      // Cinematic Warp bus
      this.warpGain = this.ctx.createGain();
      this.warpGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      this.warpGain.connect(this.masterGain);

      this.setupAmbientDrone();
      this.setupWarpSynthesizer();

      this.isInitialized = true;
    } catch (err) {
      // Graceful fallback if Web Audio is unsupported
      console.warn('Web Audio API not supported or blocked:', err);
    }
  }

  private setupAmbientDrone(): void {
    if (!this.ctx || !this.ambientGain) return;

    // Deep cosmic fundamental (sub-bass 55Hz sine wave with slow LFO)
    this.ambientOsc = this.ctx.createOscillator();
    this.ambientOsc.type = 'sine';
    this.ambientOsc.frequency.setValueAtTime(55, this.ctx.currentTime);

    // Warm low-pass filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(160, this.ctx.currentTime);

    this.ambientOsc.connect(filter);
    filter.connect(this.ambientGain);
    this.ambientOsc.start();
  }

  private setupWarpSynthesizer(): void {
    if (!this.ctx || !this.warpGain) return;

    this.warpOsc = this.ctx.createOscillator();
    this.warpOsc.type = 'sawtooth';
    this.warpOsc.frequency.setValueAtTime(80, this.ctx.currentTime);

    this.warpFilter = this.ctx.createBiquadFilter();
    this.warpFilter.type = 'bandpass';
    this.warpFilter.frequency.setValueAtTime(400, this.ctx.currentTime);
    this.warpFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    this.warpOsc.connect(this.warpFilter);
    this.warpFilter.connect(this.warpGain);
    this.warpOsc.start();
  }

  public playUIClick(): void {
    if (!this.ctx || !this.uiGain || !useAppStore.getState().soundEnabled) return;
    this.ensureContextRunning();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.08);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.uiGain);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playUIHover(): void {
    if (!this.ctx || !this.uiGain || !useAppStore.getState().soundEnabled) return;
    this.ensureContextRunning();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.04);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.uiGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  public setWarpIntensity(normalizedSpeed: number): void {
    if (!this.ctx || !this.warpGain || !this.warpOsc || !this.warpFilter) return;
    if (!useAppStore.getState().soundEnabled) return;
    this.ensureContextRunning();

    const clampedSpeed = Math.min(Math.max(0, normalizedSpeed), 1.0);
    const now = this.ctx.currentTime;

    // Smooth gain & frequency shift
    const targetGain = clampedSpeed * 0.35;
    const targetFreq = 80 + clampedSpeed * 280;
    const targetCutoff = 400 + clampedSpeed * 1200;

    this.warpGain.gain.setTargetAtTime(targetGain, now, 0.08);
    this.warpOsc.frequency.setTargetAtTime(targetFreq, now, 0.08);
    this.warpFilter.frequency.setTargetAtTime(targetCutoff, now, 0.08);
  }

  public playWarpDrive(): void {
    if (!this.ctx || !this.warpGain) return;
    this.ensureContextRunning();
    const now = this.ctx.currentTime;
    this.warpGain.gain.cancelScheduledValues(now);
    this.warpGain.gain.setValueAtTime(0.4, now);
    this.warpGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
  }

  /**
   * Synthesizes a deep kinetic/laser planetary defense deflection pulse (100% offline, headless-safe).
   */
  public playDefenseImpact(): void {
    if (!useAppStore.getState().soundEnabled || !this.ctx || !this.masterGain) return;
    try {
      this.ensureContextRunning();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(34, now + 0.55);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.28, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.62);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.65);
    } catch {
      // Safe no-op in headless/restricted audio contexts
    }
  }

  /**
   * Synthesizes an authentic GW150914-inspired LIGO gravitational wave chirp (42 Hz -> 260 Hz)
   * with damped ringdown harmonic using native Web Audio API (100% offline).
   */
  public playLigoChirp(): void {
    if (!useAppStore.getState().soundEnabled || !this.ctx || !this.masterGain) return;
    try {
      this.ensureContextRunning();
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const harmonic = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const harmonicGain = this.ctx.createGain();

      osc.type = 'sine';
      harmonic.type = 'triangle';

      osc.frequency.setValueAtTime(42, now);
      osc.frequency.exponentialRampToValueAtTime(95, now + 0.36);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.62);
      osc.frequency.exponentialRampToValueAtTime(165, now + 0.88);

      harmonic.frequency.setValueAtTime(84, now);
      harmonic.frequency.exponentialRampToValueAtTime(520, now + 0.62);
      harmonic.frequency.exponentialRampToValueAtTime(320, now + 0.88);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.42, now + 0.6);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.92);

      harmonicGain.gain.setValueAtTime(0.0005, now);
      harmonicGain.gain.exponentialRampToValueAtTime(0.14, now + 0.6);
      harmonicGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.88);

      osc.connect(gain);
      harmonic.connect(harmonicGain);
      gain.connect(this.masterGain);
      harmonicGain.connect(this.masterGain);

      osc.start(now);
      harmonic.start(now);
      osc.stop(now + 0.95);
      harmonic.stop(now + 0.95);
    } catch {
      // Headless or suspended AudioContext safe no-op
    }
  }

  /**
   * Synthesizes a subtle geomagnetic CME plasma pulse when solar storm triggers.
   */
  public playSolarStormPulse(): void {
    if (!useAppStore.getState().soundEnabled || !this.ctx || !this.masterGain) return;
    try {
      this.ensureContextRunning();
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(64, now + 0.85);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(920, now);
      filter.frequency.exponentialRampToValueAtTime(220, now + 0.85);
      filter.Q.setValueAtTime(2.5, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.24, now + 0.14);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.92);
    } catch {
      // Headless safe no-op
    }
  }

  public updateSoundState(enabled: boolean): void {
    if (enabled) {
      if (!this.isInitialized) {
        this.init();
      }
      this.ensureContextRunning();
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(0.3, this.ctx.currentTime, 0.1);
      }
    } else {
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.1);
      }
    }
  }

  private ensureContextRunning(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
}
