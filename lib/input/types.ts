export type InputMode = "keyboard" | "touch" | "hand";

export type GameInput =
  | { type: "action"; timestamp: number; source: InputMode }
  | { type: "position"; x: number; y: number; timestamp: number; source: "hand" }
  | { type: "pause"; timestamp: number; source: InputMode };

export type InputListener = (input: GameInput) => void;
export type RejectedInputListener = (input: GameInput) => void;

export interface InputAdapter {
  start(): void | Promise<void>;
  stop(): void;
}

export type HandSignal =
  | { type: "action"; timestamp?: number }
  | { type: "position"; x: number; y: number; timestamp?: number };

export type HandLoader = () => Promise<{
  start(listener: (signal: HandSignal) => void): void | Promise<void>;
  stop(): void;
}>;
