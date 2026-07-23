import type {
  GameInput,
  HandLoader,
  HandSignal,
  InputAdapter,
  InputListener,
  InputMode,
  RejectedInputListener,
} from "@/lib/input/types";

export type InputControllerOptions = {
  mode: InputMode;
  onInput: InputListener;
  onRejected?: RejectedInputListener;
  cooldownMs?: number;
  handGestureMode?: "hold" | "cycles";
  handLoader?: HandLoader;
  onHandError?: (error: Error) => void;
  isActionEnabled?: () => boolean;
};

class KeyboardAdapter implements InputAdapter {
  private readonly onInput: InputListener;
  private readonly emit: (input: GameInput) => boolean;
  private readonly isActionEnabled: () => boolean;
  private readonly target: Window;
  private readonly handleKeyDown: (event: KeyboardEvent) => void;

  constructor(target: Window, emit: (input: GameInput) => boolean, onInput: InputListener, isActionEnabled: () => boolean) {
    this.target = target;
    this.emit = emit;
    this.onInput = onInput;
    this.isActionEnabled = isActionEnabled;
    this.handleKeyDown = (event) => {
      if (event.repeat) return;
      if (event.code === "Escape") {
        event.preventDefault();
        this.emit({ type: "pause", timestamp: Date.now(), source: "keyboard" });
        return;
      }
      if (event.code !== "Space") return;
      const element = event.target as HTMLElement | null;
      if (element?.closest("button, a, input, textarea, select") || !this.isActionEnabled()) return;
      event.preventDefault();
      this.emit({ type: "action", timestamp: Date.now(), source: "keyboard" });
    };
  }

  start() {
    this.target.addEventListener("keydown", this.handleKeyDown);
    void this.onInput;
  }

  stop() {
    this.target.removeEventListener("keydown", this.handleKeyDown);
  }
}

class TouchAdapter implements InputAdapter {
  constructor(private readonly emit: (input: GameInput) => boolean) {}
  start() {}
  stop() {}
  action() { return this.emit({ type: "action", timestamp: Date.now(), source: "touch" }); }
  pause() { return this.emit({ type: "pause", timestamp: Date.now(), source: "touch" }); }
}

/** Maps hand gestures consistently across the platform.
 * 1/2/3 fingers select option 1/2/3. One, two, or three quick fist cycles
 * (close then open) emit primary, secondary, or repeat respectively.
 */
class HandAdapter implements InputAdapter {
  private runtime: Awaited<ReturnType<HandLoader>> | null = null;
  private loading: Promise<void> | null = null;
  private fistIsClosed = false;
  private fistCount = 0;
  private sequenceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly emit: (input: GameInput) => boolean, private readonly loader?: HandLoader) {}

  async load() {
    if (this.runtime || !this.loader) return;
    this.loading ??= this.loader().then((runtime) => { this.runtime = runtime; });
    await this.loading;
  }

  async start() {
    await this.load();
    await this.runtime?.start((signal) => this.handleSignal(signal));
  }

  stop() {
    this.clearSequenceTimer();
    this.runtime?.stop();
  }

  action() { return this.emit({ type: "action", timestamp: Date.now(), source: "hand" }); }
  position(x: number, y: number) { return this.emit({ type: "position", x, y, timestamp: Date.now(), source: "hand" }); }
  gesture(gesture: "open" | "closed") { this.handleSignal({ type: "gesture", gesture }); }
  reject() { return this.emit({ type: "secondary", timestamp: Date.now(), source: "hand" }); }

  private handleSignal(signal: HandSignal) {
    const timestamp = signal.timestamp ?? Date.now();
    if (signal.type === "action") {
      this.emit({ type: "action", timestamp, source: "hand" });
    } else if (signal.type === "fingers") {
      this.emit({ type: "option", option: signal.count, timestamp, source: "hand" });
    } else if (signal.type === "gesture") {
      this.handleFistGesture(signal.gesture, timestamp);
    } else {
      this.emit({ type: "position", x: signal.x, y: signal.y, timestamp, source: "hand" });
    }
  }

  private handleFistGesture(gesture: "open" | "closed", timestamp: number) {
    if (gesture === "closed") {
      this.fistIsClosed = true;
      return;
    }
    if (!this.fistIsClosed) return;
    this.fistIsClosed = false;
    this.clearSequenceTimer();
    this.fistCount += 1;
    if (this.fistCount === 3) {
      this.emit({ type: "repeat", timestamp, source: "hand" });
      this.fistCount = 0;
      return;
    }
    this.sequenceTimer = setTimeout(() => {
      const count = this.fistCount;
      this.fistCount = 0;
      if (count === 1) this.emit({ type: "action", timestamp: Date.now(), source: "hand" });
      if (count === 2) this.emit({ type: "secondary", timestamp: Date.now(), source: "hand" });
    }, 700);
  }

  private clearSequenceTimer() {
    if (this.sequenceTimer) clearTimeout(this.sequenceTimer);
    this.sequenceTimer = null;
  }
}

export class InputController {
  private readonly onInput: InputListener;
  private readonly onRejected?: RejectedInputListener;
  private readonly onHandError?: (error: Error) => void;
  private readonly cooldownMs: number;
  private readonly keyboardAdapter: KeyboardAdapter | null;
  private readonly touchAdapter: TouchAdapter;
  private readonly handAdapter: HandAdapter;
  private lastActionTimestamp = 0;
  private mode: InputMode;
  private running = false;

  constructor(options: InputControllerOptions) {
    this.mode = options.mode;
    this.onInput = options.onInput;
    this.onRejected = options.onRejected;
    this.onHandError = options.onHandError;
    this.cooldownMs = options.cooldownMs ?? 350;
    this.touchAdapter = new TouchAdapter((input) => this.dispatch(input));
    this.handAdapter = new HandAdapter((input) => this.dispatch(input), options.handLoader);
    this.keyboardAdapter = typeof window === "undefined" ? null : new KeyboardAdapter(
      window, (input) => this.dispatch(input), this.onInput, options.isActionEnabled ?? (() => true),
    );
  }

  start() {
    if (this.running) return;
    this.running = true;
    if (this.mode === "keyboard") this.keyboardAdapter?.start();
    if (this.mode === "hand") {
      void this.handAdapter.start().catch((error: unknown) => {
        this.onHandError?.(error instanceof Error ? error : new Error("No se pudo iniciar la cámara."));
      });
    }
  }

  stop() {
    this.running = false;
    this.keyboardAdapter?.stop();
    this.handAdapter.stop();
  }

  setMode(mode: InputMode) {
    const wasRunning = this.running;
    this.stop();
    this.mode = mode;
    if (wasRunning) this.start();
  }

  emitTouchAction() { return this.touchAdapter.action(); }
  emitTouchPause() { return this.touchAdapter.pause(); }
  emitHandAction() { return this.handAdapter.action(); }
  emitHandPosition(x: number, y: number) { return this.handAdapter.position(x, y); }
  emitHandGesture(gesture: "open" | "closed") { this.handAdapter.gesture(gesture); }
  emitHandReject() { return this.handAdapter.reject(); }
  async loadHandAdapter() { await this.handAdapter.load(); }
  get currentMode() { return this.mode; }

  private dispatch(input: GameInput) {
    if (input.type === "action") {
      const elapsed = input.timestamp - this.lastActionTimestamp;
      if (elapsed < this.cooldownMs) {
        this.onRejected?.(input);
        return false;
      }
      this.lastActionTimestamp = input.timestamp;
    }
    this.onInput(input);
    return true;
  }
}
