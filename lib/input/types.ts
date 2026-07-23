export type InputMode = "keyboard" | "touch" | "hand";

export type GameInput =
  | { type: "action"; timestamp: number; source: InputMode }
  | { type: "secondary"; timestamp: number; source: "hand" }
  | { type: "option"; option: 1 | 2 | 3; timestamp: number; source: "hand" }
  | { type: "reject"; timestamp: number; source: "hand" }
  | { type: "repeat"; timestamp: number; source: "hand" }
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
  | { type: "gesture"; gesture: "open" | "closed"; timestamp?: number }
  | { type: "fingers"; count: 1 | 2 | 3; timestamp?: number }
  | { type: "position"; x: number; y: number; timestamp?: number };

export type HandLoader = () => Promise<{
  start(listener: (signal: HandSignal) => void): void | Promise<void>;
  stop(): void;
}>;
