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
  handLoader?: HandLoader;
};

class KeyboardAdapter implements InputAdapter {
  private readonly onInput: InputListener;
  private readonly emit: (input: GameInput) => boolean;
  private readonly target: Window;
  private readonly handleKeyDown: (event: KeyboardEvent) => void;

  constructor(target: Window, emit: (input: GameInput) => boolean, onInput: InputListener) {
    this.target = target;
    this.emit = emit;
    this.onInput = onInput;
    this.handleKeyDown = (event) => {
      if (event.repeat) {
        return;
      }

      if (event.code === "Escape") {
        event.preventDefault();
        this.emit({ type: "pause", timestamp: Date.now(), source: "keyboard" });
        return;
      }

      if (event.code !== "Space") {
        return;
      }

      const element = event.target as HTMLElement | null;
      if (element?.closest("button, a, input, textarea, select")) {
        return;
      }

      event.preventDefault();
      const input: GameInput = {
        type: "action",
        timestamp: Date.now(),
        source: "keyboard",
      };
      this.emit(input);
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
  private readonly emit: (input: GameInput) => boolean;

  constructor(emit: (input: GameInput) => boolean) {
    this.emit = emit;
  }

  start() {}

  stop() {}

  action() {
    return this.emit({ type: "action", timestamp: Date.now(), source: "touch" });
  }

  pause() {
    return this.emit({ type: "pause", timestamp: Date.now(), source: "touch" });
  }
}

class HandAdapter implements InputAdapter {
  private readonly emit: (input: GameInput) => boolean;
  private readonly loader?: HandLoader;
  private runtime: Awaited<ReturnType<HandLoader>> | null = null;
  private loading: Promise<void> | null = null;

  constructor(emit: (input: GameInput) => boolean, loader?: HandLoader) {
    this.emit = emit;
    this.loader = loader;
  }

  async load() {
    if (this.runtime || !this.loader) {
      return;
    }
    if (!this.loading) {
      this.loading = this.loader().then((runtime) => {
        this.runtime = runtime;
      });
    }
    await this.loading;
  }

  async start() {
    await this.load();
    if (!this.runtime) {
      return;
    }
    await this.runtime.start((signal) => this.handleSignal(signal));
  }

  stop() {
    this.runtime?.stop();
  }

  action() {
    return this.emit({ type: "action", timestamp: Date.now(), source: "hand" });
  }

  position(x: number, y: number) {
    return this.emit({ type: "position", x, y, timestamp: Date.now(), source: "hand" });
  }

  private handleSignal(signal: HandSignal) {
    const timestamp = signal.timestamp ?? Date.now();
    if (signal.type === "action") {
      this.emit({ type: "action", timestamp, source: "hand" });
      return;
    }
    this.emit({ type: "position", x: signal.x, y: signal.y, timestamp, source: "hand" });
  }
}

export class InputController {
  private readonly onInput: InputListener;
  private readonly onRejected?: RejectedInputListener;
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
    this.cooldownMs = options.cooldownMs ?? 350;
    this.touchAdapter = new TouchAdapter((input) => this.dispatch(input));
    this.handAdapter = new HandAdapter((input) => this.dispatch(input), options.handLoader);
    this.keyboardAdapter =
      typeof window === "undefined"
        ? null
        : new KeyboardAdapter(window, (input) => this.dispatch(input), this.onInput);
  }

  start() {
    if (this.running) {
      return;
    }
    this.running = true;
    if (this.mode === "keyboard") {
      this.keyboardAdapter?.start();
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
    if (wasRunning) {
      this.start();
    }
  }

  emitTouchAction() {
    return this.touchAdapter.action();
  }

  emitTouchPause() {
    return this.touchAdapter.pause();
  }

  emitHandAction() {
    return this.handAdapter.action();
  }

  emitHandPosition(x: number, y: number) {
    return this.handAdapter.position(x, y);
  }

  async loadHandAdapter() {
    await this.handAdapter.load();
  }

  get currentMode() {
    return this.mode;
  }

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
