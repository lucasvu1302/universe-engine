/**
 * AstroCopilot.ts
 * 100% Native Browser Web Speech API Copilot (TARS Personality)
 * Zero external libraries, zero API keys, 100% free and offline-capable.
 */

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: SpeechRecognitionResultItem;
    };
  };
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface IWindowWithSpeech extends Window {
  webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  SpeechRecognition?: new () => BrowserSpeechRecognition;
}

export interface CopilotState {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  response: string;
  honesty: number;
  humor: number;
}

type CommandCallback = (command: { type: string; payload?: string }) => void;

export class AstroCopilot {
  private static instance: AstroCopilot;
  private recognition: BrowserSpeechRecognition | null = null;
  private synth: SpeechSynthesis | null = null;
  private isListening = false;
  public isSpeaking = false;
  private commandListener: CommandCallback | null = null;

  public honesty = 95;
  public humor = 75;

  private constructor() {
    if (typeof window !== 'undefined') {
      const win = window as unknown as IWindowWithSpeech;
      const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (SpeechRec) {
        this.recognition = new SpeechRec();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event: SpeechRecognitionEvent) => {
          const text = event.results[0][0].transcript;
          this.processVoiceInput(text);
        };

        this.recognition.onend = () => {
          this.isListening = false;
        };

        this.recognition.onerror = () => {
          this.isListening = false;
        };
      }

      this.synth = window.speechSynthesis || null;
    }
  }

  public static getInstance(): AstroCopilot {
    if (!AstroCopilot.instance) {
      AstroCopilot.instance = new AstroCopilot();
    }
    return AstroCopilot.instance;
  }

  public setCommandListener(listener: CommandCallback): void {
    this.commandListener = listener;
  }

  public startListening(): boolean {
    if (!this.recognition) return false;
    try {
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch {
      return false;
    }
  }

  public stopListening(): void {
    if (!this.recognition) return;
    try {
      this.recognition.stop();
      this.isListening = false;
    } catch {
      // Ignored
    }
  }

  public toggleListening(): boolean {
    if (this.isListening) {
      this.stopListening();
      return false;
    } else {
      return this.startListening();
    }
  }

  public speak(text: string): void {
    if (!this.synth) return;
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 0.82; // Deeper baritone robot voice

    // Look for male/deeper voice
    const voices = this.synth.getVoices();
    const tarsVoice = voices.find(
      (v) => v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('daniel') || v.lang === 'en-US'
    );
    if (tarsVoice) {
      utterance.voice = tarsVoice;
    }

    utterance.onstart = () => { this.isSpeaking = true; };
    utterance.onend = () => { this.isSpeaking = false; };
    this.synth.speak(utterance);
  }

  public processVoiceInput(input: string): string {
    const lower = input.toLowerCase();
    let reply = "Standing by. What are your orders?";

    if (lower.includes('mars') || lower.includes('hỏa')) {
      reply = "Setting course for Mars. Watch your step around Olympus Mons.";
      this.dispatch({ type: 'NAVIGATE', payload: 'mars' });
    } else if (lower.includes('earth') || lower.includes('đất')) {
      reply = "Returning to Earth orbit. Oxygen levels: 21 percent. You can breathe again.";
      this.dispatch({ type: 'NAVIGATE', payload: 'earth' });
    } else if (lower.includes('black hole') || lower.includes('gargantua') || lower.includes('hố đen')) {
      reply = `Honesty at ${this.honesty} percent: The gravitational tidal forces near Gargantua will shred any spacecraft to atomic dust. Proceeding anyway.`;
      this.dispatch({ type: 'NAVIGATE', payload: 'blackhole' });
    } else if (lower.includes('cinema') || lower.includes('điện ảnh') || lower.includes('phim')) {
      reply = "Entering Cinema mode. 2.39:1 aspect ratio locked. Try not to spill popcorn in microgravity.";
      this.dispatch({ type: 'CINEMA', payload: 'AUTO' });
    } else if (lower.includes('music') || lower.includes('kepler') || lower.includes('nhạc')) {
      reply = "Synthesizing Kepler's Music of the Spheres. Harmonizing orbital frequencies.";
      this.dispatch({ type: 'MUSIC' });
    } else if (lower.includes('galaxy') || lower.includes('ngân hà')) {
      reply = "Zooming out to Milky Way galactic overview. 40,000 star particles rendering.";
      this.dispatch({ type: 'GALAXY' });
    } else if (lower.includes('moon') || lower.includes('trăng')) {
      reply = "Plotting transfer to the Moon. Sea of Tranquility awaits.";
      this.dispatch({ type: 'NAVIGATE', payload: 'moon' });
    } else if (lower.includes('saturn') || lower.includes('thổ')) {
      reply = "Approaching Saturn. Those ice rings are composed of pure frozen water fragments.";
      this.dispatch({ type: 'NAVIGATE', payload: 'saturn' });
    } else if (lower.includes('jupiter') || lower.includes('mộc')) {
      reply = "Entering Jupiter system. Radiation shielding on maximum.";
      this.dispatch({ type: 'NAVIGATE', payload: 'jupiter' });
    } else if (lower.includes('pulsar')) {
      reply = "Targeting high-frequency rotating neutron star. Beware of relativistic radio beams.";
      this.dispatch({ type: 'PULSAR' });
    } else {
      reply = `Command received: "${input}". Telemetry standing by.`;
    }

    this.speak(reply);
    return reply;
  }

  private dispatch(cmd: { type: string; payload?: string }): void {
    if (this.commandListener) {
      this.commandListener(cmd);
    }
  }

  public getIsListening(): boolean {
    return this.isListening;
  }
}
