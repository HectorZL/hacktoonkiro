export type AudioAlert = "start" | "care" | "scene" | "pause" | "resume" | "jump" | "finish";

type Tone = {
  frequency: number;
  duration: number;
  delay: number;
};

const alertTones: Record<AudioAlert, Tone[]> = {
  start: [
    { frequency: 392, duration: 0.12, delay: 0 },
    { frequency: 523, duration: 0.18, delay: 0.14 },
  ],
  care: [
    { frequency: 523, duration: 0.1, delay: 0 },
    { frequency: 659, duration: 0.16, delay: 0.12 },
  ],
  scene: [{ frequency: 440, duration: 0.16, delay: 0 }],
  pause: [{ frequency: 330, duration: 0.16, delay: 0 }],
  resume: [{ frequency: 523, duration: 0.16, delay: 0 }],
  jump: [
    { frequency: 523, duration: 0.09, delay: 0 },
    { frequency: 698, duration: 0.13, delay: 0.09 },
  ],
  finish: [
    { frequency: 523, duration: 0.12, delay: 0 },
    { frequency: 659, duration: 0.12, delay: 0.13 },
    { frequency: 784, duration: 0.22, delay: 0.26 },
  ],
};

const musicNotes = [262, 330, 392, 330, 294, 349, 440, 349];
const musicStepSeconds = 0.38;

export class AudioManager {
  private context: AudioContext | null = null;
  private enabled = false;
  private musicTimer: number | null = null;
  private musicGain: GainNode | null = null;
  private musicPlaying = false;

  get isEnabled() {
    return this.enabled;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (enabled) {
      void this.resumeContext();
    } else {
      this.stopMusic();
    }
  }

  startMusic() {
    if (!this.enabled || this.musicPlaying || typeof window === "undefined") {
      return;
    }

    const context = this.getContext();
    if (!context) {
      return;
    }

    const begin = () => {
      if (!this.enabled || this.musicPlaying) {
        return;
      }

      this.musicPlaying = true;
      const musicGain = context.createGain();
      musicGain.gain.setValueAtTime(0.035, context.currentTime);
      musicGain.connect(context.destination);
      this.musicGain = musicGain;
      this.scheduleMusicBar(context, musicGain);
      this.musicTimer = window.setInterval(() => {
        if (this.enabled && this.musicPlaying) {
          this.scheduleMusicBar(context, musicGain);
        }
      }, musicNotes.length * musicStepSeconds * 1000);
    };

    if (context.state === "suspended") {
      void context.resume().then(begin);
    } else {
      begin();
    }
  }

  stopMusic() {
    if (this.musicTimer !== null && typeof window !== "undefined") {
      window.clearInterval(this.musicTimer);
    }
    this.musicTimer = null;
    this.musicPlaying = false;
    this.musicGain?.disconnect();
    this.musicGain = null;
  }

  play(alert: AudioAlert) {
    if (!this.enabled) {
      return;
    }

    const context = this.getContext();
    if (!context) {
      return;
    }

    if (context.state === "suspended") {
      void context.resume().then(() => this.playTones(context, alert));
      return;
    }

    this.playTones(context, alert);
  }

  dispose() {
    this.stopMusic();
    if (this.context && this.context.state !== "closed") {
      void this.context.close();
    }
    this.context = null;
  }

  private getContext() {
    if (this.context || typeof window === "undefined" || !window.AudioContext) {
      return this.context;
    }

    this.context = new window.AudioContext();
    return this.context;
  }

  private async resumeContext() {
    const context = this.getContext();
    if (context?.state === "suspended") {
      await context.resume();
    }
  }

  private scheduleMusicBar(context: AudioContext, destination: GainNode) {
    const now = context.currentTime + 0.03;
    musicNotes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = now + index * musicStepSeconds;
      const end = start + 0.26;

      oscillator.type = index % 2 === 0 ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.7, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.connect(gain);
      gain.connect(destination);
      oscillator.start(start);
      oscillator.stop(end);
    });
  }

  private playTones(context: AudioContext, alert: AudioAlert) {
    const now = context.currentTime;
    for (const tone of alertTones[alert]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = now + tone.delay;
      const end = start + tone.duration;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(tone.frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.08, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(end);
    }
  }
}
