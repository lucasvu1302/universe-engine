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
