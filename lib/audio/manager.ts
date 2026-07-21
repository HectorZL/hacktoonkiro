export type AudioAlert = "start" | "care" | "scene" | "pause" | "resume";

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
};

export class AudioManager {
  private context: AudioContext | null = null;
  private enabled = false;

  get isEnabled() {
    return this.enabled;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (enabled) {
      void this.resumeContext();
    }
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
