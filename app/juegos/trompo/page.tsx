"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { InputController } from "@/lib/input/controller";
import type { GameInput, InputMode } from "@/lib/input/types";
import {
  finishGameSession,
  getActivePlayer,
  startGameSession,
  type ActiveGameSession,
} from "@/lib/sessions/manager";

type TopState = "idle" | "aiming" | "spinning" | "paused" | "completed";
type AssistanceLevel = "basic" | "guided" | "assisted";
type TopSnapshot = {
  state: TopState;
  round: number;
  totalRounds: number;
  marker: number;
  direction: 1 | -1;
  spinUntil: number;
  remainingSpinMs: number;
  message: string;
};

const inputModes: Array<{ mode: InputMode; label: string }> = [
  { mode: "keyboard", label: "Barra espaciadora" },
  { mode: "touch", label: "Botón Lanzar" },
  { mode: "hand", label: "Movimiento de mano" },
];
const assistanceLabels: Record<AssistanceLevel, string> = {
  basic: "Zona normal",
  guided: "Zona grande",
  assisted: "Zona muy grande",
};
const launchWindows: Record<AssistanceLevel, { start: number; end: number }> = {
  basic: { start: 36, end: 64 },
  guided: { start: 28, end: 72 },
  assisted: { start: 18, end: 82 },
};

function createInitialSnapshot(): TopSnapshot {
  return {
    state: "idle",
    round: 0,
    totalRounds: 5,
    marker: 0,
    direction: 1,
    spinUntil: 0,
    remainingSpinMs: 0,
    message: "Todo listo.",
  };
}

export default function TrompoPage() {
  const [mode, setMode] = useState<InputMode>("keyboard");
  const [assistance, setAssistance] = useState<AssistanceLevel>("guided");
  const [snapshot, setSnapshot] = useState<TopSnapshot>(createInitialSnapshot);
  const controllerRef = useRef<InputController | null>(null);
  const optionsRef = useRef<HTMLDetailsElement | null>(null);
  const sessionRef = useRef<ActiveGameSession | null>(null);

  useEffect(() => {
    return () => {
      const session = sessionRef.current;
      sessionRef.current = null;
      if (session) {
        void finishGameSession(session);
      }
    };
  }, []);

  useEffect(() => {
    if (snapshot.state !== "completed") {
      return;
    }

    const session = sessionRef.current;
    sessionRef.current = null;
    if (session) {
      void finishGameSession(session);
    }
  }, [snapshot.state]);

  const startGame = useCallback(() => {
    optionsRef.current?.removeAttribute("open");
    const previousSession = sessionRef.current;
    if (previousSession) {
      void finishGameSession(previousSession);
    }

    sessionRef.current = startGameSession({
      player: getActivePlayer(),
      gameKey: "trompo",
      inputMode: mode,
      assistanceLevel: assistance,
    });
    setSnapshot({
      ...createInitialSnapshot(),
      state: "aiming",
      round: 1,
      message: "Toca Lanzar cuando la marca esté en la zona verde.",
    });
  }, [assistance, mode]);

  const togglePause = useCallback(() => {
    setSnapshot((current) => {
      if (current.state === "aiming" || current.state === "spinning") {
        return {
          ...current,
          state: "paused",
          remainingSpinMs:
            current.state === "spinning"
              ? Math.max(current.spinUntil - Date.now(), 0)
              : 0,
          message: "El juego está en pausa.",
        };
      }
      if (current.state === "paused") {
        const nextState: TopState =
          current.remainingSpinMs > 0 ? "spinning" : "aiming";
        return {
          ...current,
          state: nextState,
          spinUntil:
            nextState === "spinning" ? Date.now() + current.remainingSpinMs : 0,
          message: "¡Continuamos!",
        };
      }
      return current;
    });
  }, []);

  const launchTop = useCallback(() => {
    setSnapshot((current) => {
      if (current.state !== "aiming") {
        return current;
      }

      const window = launchWindows[assistance];
      const isInsideWindow =
        current.marker >= window.start && current.marker <= window.end;
      return {
        ...current,
        state: "spinning",
        spinUntil: Date.now() + (isInsideWindow ? 2200 : 1400),
        remainingSpinMs: 0,
        message: isInsideWindow ? "¡Muy bien!" : "Buen intento. Sigue jugando.",
      };
    });
  }, [assistance]);

  const handleInput = useCallback(
    (input: GameInput) => {
      if (input.type === "pause") {
        togglePause();
      } else if (input.type === "action") {
        launchTop();
      }
    },
    [launchTop, togglePause],
  );

  useEffect(() => {
    const controller = new InputController({
      mode,
      onInput: handleInput,
      cooldownMs: 350,
      isActionEnabled: () => snapshot.state === "aiming",
    });
    controllerRef.current = controller;
    controller.start();
    return () => {
      controller.stop();
      controllerRef.current = null;
    };
  }, [handleInput, mode, snapshot.state]);

  useEffect(() => {
    if (snapshot.state !== "aiming" && snapshot.state !== "spinning") {
      return;
    }

    const timer = window.setInterval(() => {
      setSnapshot((current) => {
        if (current.state === "aiming") {
          const nextMarker = current.marker + current.direction * 2;
          if (nextMarker >= 100) {
            return { ...current, marker: 100, direction: -1 };
          }
          if (nextMarker <= 0) {
            return { ...current, marker: 0, direction: 1 };
          }
          return { ...current, marker: nextMarker };
        }

        if (current.state === "spinning" && Date.now() >= current.spinUntil) {
          const nextRound = current.round + 1;
          if (nextRound > current.totalRounds) {
            return {
              ...current,
              state: "completed",
              message: "¡Terminaste los lanzamientos!",
            };
          }
          return {
            ...current,
            state: "aiming",
            round: nextRound,
            marker: 0,
            message: "Toca Lanzar cuando quieras.",
          };
        }
        return current;
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [snapshot.state]);

  function emitAction() {
    if (mode === "hand") {
      controllerRef.current?.emitHandAction();
    } else {
      controllerRef.current?.emitTouchAction();
    }
  }

  function emitPause() {
    controllerRef.current?.emitTouchPause();
  }

  const launchWindow = launchWindows[assistance];
  const progress = Math.round((snapshot.round / snapshot.totalRounds) * 100);
  const isSpinning = snapshot.state === "spinning";

  return (
    <main className="h-[100dvh] overflow-hidden p-2 sm:p-3">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-2 overflow-y-auto">
        <header className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
          <Link
            className="flex min-h-12 w-fit shrink-0 items-center rounded-xl border-3 border-[var(--color-primary)] bg-[var(--color-surface)] px-4 py-2 font-bold text-[var(--color-primary)] no-underline hover:bg-[var(--color-surface-muted)]"
            href="/"
          >
            ← Volver al inicio
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Lanzamiento del trompo
            </h1>
            <p className="text-lg text-[var(--color-text-muted)]">
              Toca <strong>Comenzar</strong> y después toca <strong>Lanzar</strong>.
            </p>
          </div>
        </header>

        <section
          aria-labelledby="game-title"
          className="flex min-h-[28rem] flex-1 flex-col rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-[var(--shadow-card)] sm:p-3"
        >
          <h2 id="game-title" className="sr-only">
            Zona de lanzamiento
          </h2>

          <div className="grid min-h-0 flex-1 gap-2 md:grid-cols-[1.35fr_0.65fr]">
            <div
              role="group"
              aria-label="Zona verde para lanzar el trompo"
              className="flex min-h-44 flex-col rounded-2xl border-4 border-[var(--color-border)] bg-[#eff6ff] p-3"
            >
              <p className="text-center text-lg font-bold">
                {isSpinning ? "El trompo está girando" : "Lanza en la zona verde"}
              </p>
              <div className="relative mt-2 min-h-24 flex-1 rounded-xl bg-[var(--color-surface)]">
                <div
                  aria-hidden="true"
                  className="absolute inset-y-3 rounded-xl border-4 border-[var(--color-success)] bg-[var(--color-success-surface)]"
                  style={{
                    left: `${launchWindow.start}%`,
                    width: `${launchWindow.end - launchWindow.start}%`,
                  }}
                />
                <div
                  role="img"
                  aria-label={`Marca en ${Math.round(snapshot.marker)} por ciento`}
                  className="absolute inset-y-0 w-2 rounded-full bg-[var(--color-primary)] transition-[left] duration-100"
                  style={{ left: `${snapshot.marker}%` }}
                />
              </div>
            </div>

            <div className="flex min-h-44 items-center justify-center rounded-2xl border-4 border-[var(--color-border)] bg-[#fef3c7]">
              <div
                role="img"
                aria-label={isSpinning ? "El trompo está girando" : "Trompo listo"}
                className={`text-8xl ${isSpinning ? "animate-spin" : ""}`}
              >
                ◢
              </div>
            </div>
          </div>

          <div
            className="sr-only"
            role="progressbar"
            aria-label="Progreso de los lanzamientos"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          />

          <div className="mt-3">
            {snapshot.state === "idle" ? (
              <button
                type="button"
                onClick={startGame}
                className="min-h-16 w-full rounded-2xl bg-[var(--color-primary)] px-8 py-3 text-2xl font-bold text-[var(--color-primary-contrast)] hover:bg-[var(--color-primary-hover)]"
              >
                Comenzar
              </button>
            ) : null}

            {snapshot.state === "aiming" ? (
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <button
                  type="button"
                  onClick={emitAction}
                  className="min-h-16 rounded-2xl bg-[var(--color-primary)] px-8 py-3 text-3xl font-bold text-[var(--color-primary-contrast)] hover:bg-[var(--color-primary-hover)]"
                >
                  Lanzar
                </button>
                <button
                  type="button"
                  onClick={emitPause}
                  className="min-h-14 rounded-2xl border-3 border-[var(--color-primary)] px-7 py-2 text-xl font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]"
                >
                  Pausar
                </button>
              </div>
            ) : null}

            {snapshot.state === "spinning" ? (
              <button
                type="button"
                onClick={emitPause}
                className="min-h-14 w-full rounded-2xl border-3 border-[var(--color-primary)] px-7 py-2 text-xl font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]"
              >
                Pausar
              </button>
            ) : null}

            {snapshot.state === "paused" ? (
              <button
                type="button"
                onClick={emitPause}
                className="min-h-16 w-full rounded-2xl bg-[var(--color-primary)] px-8 py-3 text-2xl font-bold text-[var(--color-primary-contrast)] hover:bg-[var(--color-primary-hover)]"
              >
                Continuar
              </button>
            ) : null}

            {snapshot.state === "completed" ? (
              <button
                type="button"
                onClick={startGame}
                className="min-h-16 w-full rounded-2xl bg-[var(--color-primary)] px-8 py-3 text-2xl font-bold text-[var(--color-primary-contrast)] hover:bg-[var(--color-primary-hover)]"
              >
                Volver a jugar
              </button>
            ) : null}
          </div>

          <p
            aria-live="polite"
            aria-atomic="true"
            className={`mt-2 text-center text-lg font-bold ${
              snapshot.state === "idle" ? "sr-only" : ""
            }`}
          >
            {snapshot.message}
          </p>
        </section>

        <details
          ref={optionsRef}
          className="shrink-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
        >
          <summary className="min-h-12 cursor-pointer px-5 py-2 text-xl font-bold text-[var(--color-primary)] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-focus)]">
            Opciones
          </summary>
          <div className="grid gap-5 border-t border-[var(--color-border)] p-5 md:grid-cols-2">
            <fieldset>
              <legend className="text-xl font-bold">Cómo jugar</legend>
              <div className="mt-3 grid gap-2">
                {inputModes.map((inputMode) => (
                  <button
                    key={inputMode.mode}
                    type="button"
                    aria-pressed={mode === inputMode.mode}
                    onClick={() => setMode(inputMode.mode)}
                    className={`min-h-12 rounded-xl border-3 px-5 text-left font-bold ${
                      mode === inputMode.mode
                        ? "border-[var(--color-primary)] bg-[#e0f2fe]"
                        : "border-[var(--color-border)]"
                    }`}
                  >
                    {inputMode.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-xl font-bold">Ayuda para lanzar</legend>
              <div className="mt-3 grid gap-2">
                {(Object.keys(assistanceLabels) as AssistanceLevel[]).map(
                  (level) => (
                    <button
                      key={level}
                      type="button"
                      aria-pressed={assistance === level}
                      onClick={() => setAssistance(level)}
                      className={`min-h-12 rounded-xl border-3 px-5 text-left font-bold ${
                        assistance === level
                          ? "border-[var(--color-primary)] bg-[#e0f2fe]"
                          : "border-[var(--color-border)]"
                      }`}
                    >
                      {assistanceLabels[level]}
                    </button>
                  ),
                )}
              </div>
            </fieldset>
          </div>
        </details>
      </div>
    </main>
  );
}
