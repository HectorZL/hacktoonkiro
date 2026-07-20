import type { GameInput } from "@/lib/input/types";

export type GameState =
  | "idle"
  | "showing"
  | "waiting-for-action"
  | "accepted"
  | "feedback"
  | "paused"
  | "completed";

export type AssistanceLevel = "basic" | "guided" | "assisted";

export type GameConfig = {
  totalSteps: number;
  optionsCount?: number;
  showDurationMs?: number;
  feedbackDurationMs?: number;
  scanIntervalMs?: number;
  hitboxSize?: number;
  maxRetries?: number;
};

export type GameSnapshot = {
  state: GameState;
  step: number;
  totalSteps: number;
  highlightedOption: number;
  optionsCount: number;
  retries: number;
  maxRetries: number;
  hitboxSize: number;
  assistanceLevel: AssistanceLevel;
  message: string;
};

type SnapshotListener = (snapshot: GameSnapshot) => void;

type AssistanceProfile = {
  showDurationMs: number;
  feedbackDurationMs: number;
  scanIntervalMs: number;
  hitboxSize: number;
  maxRetries: number;
};

const assistanceProfiles: Record<AssistanceLevel, AssistanceProfile> = {
  basic: {
    showDurationMs: 1200,
    feedbackDurationMs: 900,
    scanIntervalMs: 3000,
    hitboxSize: 44,
    maxRetries: 2,
  },
  guided: {
    showDurationMs: 1800,
    feedbackDurationMs: 1200,
    scanIntervalMs: 4500,
    hitboxSize: 56,
    maxRetries: 4,
  },
  assisted: {
    showDurationMs: 2600,
    feedbackDurationMs: 1600,
    scanIntervalMs: 6500,
    hitboxSize: 72,
    maxRetries: 8,
  },
};

export const assistanceLabels: Record<AssistanceLevel, string> = {
  basic: "Básico",
  guided: "Guiado",
  assisted: "Asistido",
};

export function createInitialSnapshot(
  config: GameConfig,
  assistanceLevel: AssistanceLevel = "guided",
): GameSnapshot {
  const profile = assistanceProfiles[assistanceLevel];
  return {
    state: "idle",
    step: 0,
    totalSteps: config.totalSteps,
    highlightedOption: 0,
    optionsCount: config.optionsCount ?? 3,
    retries: 0,
    maxRetries: config.maxRetries ?? profile.maxRetries,
    hitboxSize: config.hitboxSize ?? profile.hitboxSize,
    assistanceLevel,
    message: "La práctica está lista para comenzar.",
  };
}

export class AccessibleGameEngine {
  private readonly config: GameConfig;
  private readonly listener: SnapshotListener;
  private snapshot: GameSnapshot;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private scanTimer: ReturnType<typeof setInterval> | null = null;
  private resumeState: GameState = "idle";
  private destroyed = false;

  constructor(config: GameConfig, listener: SnapshotListener) {
    this.config = config;
    this.listener = listener;
    this.snapshot = createInitialSnapshot(config);
    this.listener(this.snapshot);
  }

  get currentSnapshot() {
    return this.snapshot;
  }

  start() {
    if (this.destroyed || (this.snapshot.state !== "idle" && this.snapshot.state !== "completed")) {
      return;
    }

    this.clearTimers();
    this.update({
      state: "showing",
      step: 0,
      highlightedOption: 0,
      retries: 0,
      message: "Observa la opción destacada. La siguiente acción aparecerá lentamente.",
    });
    this.scheduleShowing();
  }

  handleInput(input: GameInput) {
    if (this.destroyed) {
      return;
    }

    if (input.type === "pause") {
      if (this.snapshot.state === "paused") {
        this.resume();
      } else {
        this.pause();
      }
      return;
    }

    if (input.type !== "action") {
      return;
    }

    if (this.snapshot.state === "waiting-for-action") {
      this.acceptAction();
      return;
    }

    if (this.snapshot.state === "paused") {
      return;
    }

    this.update({
      message: "La acción se recibirá cuando la opción esté lista. No hay penalización.",
    });
  }

  registerRecoverableError() {
    if (this.snapshot.state !== "waiting-for-action") {
      return;
    }

    const nextRetries = Math.min(this.snapshot.retries + 1, this.snapshot.maxRetries);
    this.update({
      retries: nextRetries,
      message: "Puedes intentarlo otra vez. El error no elimina tu progreso.",
    });
  }

  setAssistanceLevel(assistanceLevel: AssistanceLevel) {
    const profile = assistanceProfiles[assistanceLevel];
    this.update({
      assistanceLevel,
      maxRetries: this.config.maxRetries ?? profile.maxRetries,
      hitboxSize: this.config.hitboxSize ?? profile.hitboxSize,
      message: `Nivel ${assistanceLabels[assistanceLevel]} seleccionado.`,
    });
  }

  pause() {
    if (this.snapshot.state === "idle" || this.snapshot.state === "completed" || this.snapshot.state === "paused") {
      return;
    }

    this.resumeState = this.snapshot.state;
    this.clearTimers();
    this.update({
      state: "paused",
      message: "Práctica pausada. Puedes reanudar sin perder el progreso.",
    });
  }

  resume() {
    if (this.snapshot.state !== "paused") {
      return;
    }

    const stateToResume = this.resumeState;
    this.update({ state: stateToResume, message: "Práctica reanudada. Continúa cuando estés listo." });

    if (stateToResume === "showing") {
      this.scheduleShowing();
    } else if (stateToResume === "waiting-for-action") {
      this.startScanning();
    } else if (stateToResume === "accepted") {
      this.scheduleFeedback();
    } else if (stateToResume === "feedback") {
      this.scheduleNextStep();
    }
  }

  destroy() {
    this.destroyed = true;
    this.clearTimers();
  }

  private scheduleShowing() {
    this.clearMainTimer();
    this.timer = setTimeout(() => {
      if (this.destroyed || this.snapshot.state !== "showing") {
        return;
      }
      this.update({
        state: "waiting-for-action",
        message: "La opción está lista. Pulsa una vez para confirmar.",
      });
      this.startScanning();
    }, this.getProfile().showDurationMs);
  }

  private startScanning() {
    this.clearScanTimer();
    if (this.snapshot.optionsCount <= 1) {
      return;
    }

    this.scanTimer = setInterval(() => {
      if (this.snapshot.state !== "waiting-for-action") {
        return;
      }
      this.update({
        highlightedOption: (this.snapshot.highlightedOption + 1) % this.snapshot.optionsCount,
        message: "La opción cambia lentamente. Pulsa cuando estés listo.",
      });
    }, this.getProfile().scanIntervalMs);
  }

  private acceptAction() {
    this.clearTimers();
    this.update({
      state: "accepted",
      message: "Acción recibida. Confirmación visual completada.",
    });
    this.scheduleFeedback();
  }

  private scheduleFeedback() {
    this.clearMainTimer();
    this.timer = setTimeout(() => {
      if (this.destroyed || this.snapshot.state !== "accepted") {
        return;
      }
      this.update({
        state: "feedback",
        message: "Bien hecho. La siguiente acción aparecerá sin penalizar errores.",
      });
      this.scheduleNextStep();
    }, this.getProfile().feedbackDurationMs);
  }

  private scheduleNextStep() {
    this.clearMainTimer();
    this.timer = setTimeout(() => {
      if (this.destroyed || this.snapshot.state !== "feedback") {
        return;
      }

      const nextStep = this.snapshot.step + 1;
      if (nextStep >= this.snapshot.totalSteps) {
        this.update({
          state: "completed",
          step: this.snapshot.totalSteps,
          message: "Práctica completada. Puedes reiniciar cuando quieras.",
        });
        return;
      }

      this.update({
        state: "showing",
        step: nextStep,
        highlightedOption: 0,
        retries: 0,
        message: "Nueva opción preparada. Tómate tu tiempo.",
      });
      this.scheduleShowing();
    }, this.getProfile().feedbackDurationMs);
  }

  private getProfile(): AssistanceProfile {
    const profile = assistanceProfiles[this.snapshot.assistanceLevel];
    return {
      ...profile,
      showDurationMs: this.config.showDurationMs ?? profile.showDurationMs,
      feedbackDurationMs: this.config.feedbackDurationMs ?? profile.feedbackDurationMs,
      scanIntervalMs: this.config.scanIntervalMs ?? profile.scanIntervalMs,
      hitboxSize: this.config.hitboxSize ?? profile.hitboxSize,
      maxRetries: this.config.maxRetries ?? profile.maxRetries,
    };
  }

  private update(changes: Partial<GameSnapshot>) {
    this.snapshot = { ...this.snapshot, ...changes };
    this.listener(this.snapshot);
  }

  private clearMainTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private clearScanTimer() {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
  }

  private clearTimers() {
    this.clearMainTimer();
    this.clearScanTimer();
  }
}
