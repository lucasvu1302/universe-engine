/**
 * HarmonicesMundiSynth.ts
 * 100% Native Web Audio API Synthesizer based on Johannes Kepler's "Music of the Spheres"
 * Combined with Hans Zimmer style interstellar organ ambient chords.
 * Zero external libraries, zero API keys, 100% offline-ready.
 */

export class HarmonicesMundiSynth {
  private static instance: HarmonicesMundiSynth;
  private ctx: AudioContext | null = null;
  private isPlaying = false;

  // Master nodes
  private masterGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayGain: GainNode | null = null;

  // Planet orbital voice oscillators
  private voices: Array<{
    osc: OscillatorNode;
    gain: GainNode;
    panner: StereoPannerNode;
    baseFreq: number;
    detuneLfo: OscillatorNode;
  }> = [];

  // Master drones for deep cosmic space
  private subDrone: OscillatorNode | null = null;
  private subDroneGain: GainNode | null = null;

  private constructor() {}

  public static getInstance(): HarmonicesMundiSynth {
    if (!HarmonicesMundiSynth.instance) {
      HarmonicesMundiSynth.instance = new HarmonicesMundiSynth();
    }
    return HarmonicesMundiSynth.instance;
  }

  private initAudioContext(): void {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    // Master bus
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    // Warm analog lowpass filter
    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(650, this.ctx.currentTime);
    this.filterNode.Q.setValueAtTime(2.5, this.ctx.currentTime);

    // Cosmic space delay/reverb feedback
    this.delayNode = this.ctx.createDelay();
    this.delayNode.delayTime.setValueAtTime(0.48, this.ctx.currentTime);

    this.delayGain = this.ctx.createGain();
    this.delayGain.gain.setValueAtTime(0.42, this.ctx.currentTime);

    // Delay loop
    this.delayNode.connect(this.delayGain);
    this.delayGain.connect(this.delayNode);
    this.delayNode.connect(this.masterGain);

    this.filterNode.connect(this.masterGain);
    this.filterNode.connect(this.delayNode);
    this.masterGain.connect(this.ctx.destination);

    this.setupVoices();
  }

  private setupVoices(): void {
    if (!this.ctx || !this.filterNode) return;

    // Keplerian pitch frequencies (Fundamental: D-minor cosmic chord: D, F, A, C, E)
    const planetFrequencies = [
      { name: 'mercury', freq: 587.33, pan: -0.6, type: 'sine' as OscillatorType },   // D5
      { name: 'venus',   freq: 440.00, pan: -0.3, type: 'triangle' as OscillatorType }, // A4
      { name: 'earth',   freq: 293.66, pan: 0.0,  type: 'sine' as OscillatorType },     // D4 (Terra Root)
      { name: 'mars',    freq: 349.23, pan: 0.2,  type: 'triangle' as OscillatorType }, // F4
      { name: 'jupiter', freq: 146.83, pan: 0.5,  type: 'sawtooth' as OscillatorType }, // D3 (King Drone)
      { name: 'saturn',  freq: 220.00, pan: 0.7,  type: 'triangle' as OscillatorType }, // A3
      { name: 'uranus',  freq: 174.61, pan: -0.4, type: 'sine' as OscillatorType },     // F3
      { name: 'neptune', freq: 130.81, pan: 0.4,  type: 'sine' as OscillatorType }      // C3
    ];

    planetFrequencies.forEach((p) => {
      if (!this.ctx || !this.filterNode) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const panner = this.ctx.createStereoPanner();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();

      osc.type = p.type;
      osc.frequency.setValueAtTime(p.freq, this.ctx.currentTime);

      // Subtle slow detune chorus effect
      lfo.frequency.setValueAtTime(0.08 + Math.random() * 0.05, this.ctx.currentTime);
      lfoGain.gain.setValueAtTime(4.0, this.ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.detune);

      panner.pan.setValueAtTime(p.pan, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.045, this.ctx.currentTime);

      osc.connect(gain);
      gain.connect(panner);
      panner.connect(this.filterNode);

      osc.start();
      lfo.start();

      this.voices.push({
        osc,
        gain,
        panner,
        baseFreq: p.freq,
        detuneLfo: lfo
      });
    });

    // Deep Sub-Bass Interstellar Organ Drone (D1 = 36.71 Hz)
    this.subDrone = this.ctx.createOscillator();
    this.subDrone.type = 'sawtooth';
    this.subDrone.frequency.setValueAtTime(36.71, this.ctx.currentTime);

    this.subDroneGain = this.ctx.createGain();
    this.subDroneGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    const subFilter = this.ctx.createBiquadFilter();
    subFilter.type = 'lowpass';
    subFilter.frequency.setValueAtTime(90, this.ctx.currentTime);

    if (this.subDrone && this.subDroneGain && this.masterGain) {
      this.subDrone.connect(this.subDroneGain);
      this.subDroneGain.connect(subFilter);
      subFilter.connect(this.masterGain);
      this.subDrone.start();
    }
  }

  public start(): void {
    this.initAudioContext();
    if (!this.ctx || !this.masterGain) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Smooth cinematic fade-in
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(0.38, this.ctx.currentTime + 3.0);
    this.isPlaying = true;
  }

  public stop(): void {
    if (!this.ctx || !this.masterGain || !this.isPlaying) return;

    // Smooth cinematic fade-out
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 2.0);
    this.isPlaying = false;
  }

  public toggle(): boolean {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  /**
   * Modulate harmonics according to simulation time acceleration and proximity
   */
  public update(timeScale: number, isNearBlackHole: boolean = false): void {
    if (!this.ctx || !this.isPlaying || !this.filterNode || !this.masterGain) return;

    // Filter frequency opens up as time accelerates
    const targetFilterFreq = isNearBlackHole
      ? 1800
      : Math.min(2200, 500 + Math.log10(Math.max(1, timeScale)) * 380);

    this.filterNode.frequency.setTargetAtTime(targetFilterFreq, this.ctx.currentTime, 0.4);

    // If near black hole, deepen the sub drone and increase intensity
    if (this.subDroneGain) {
      const targetSub = isNearBlackHole ? 0.22 : 0.08;
      this.subDroneGain.gain.setTargetAtTime(targetSub, this.ctx.currentTime, 0.5);
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
