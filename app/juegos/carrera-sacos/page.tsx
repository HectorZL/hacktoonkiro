"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AudioManager } from "@/lib/audio/manager";
import { InputController } from "@/lib/input/controller";
import type { GameInput, InputMode } from "@/lib/input/types";
import {
  finishGameSession,
  getActivePlayer,
  startGameSession,
  type ActiveGameSession,
} from "@/lib/sessions/manager";
import { RaceScene } from "./race-scene";

type RaceState = "idle" | "playing" | "paused" | "completed";
type AssistanceLevel = "basic" | "guided" | "assisted";

type RaceSnapshot = {
  state: RaceState;
  position: number;
  obstacleIndex: number;
  jumpUntil: number;
  jumping: boolean;
  message: string;
};

const obstacles = [25, 50, 75];
const inputModes: Array<{ mode: InputMode; label: string }> = [
  { mode: "keyboard", label: "Barra espaciadora" },
  { mode: "touch", label: "Botón Saltar" },
  { mode: "hand", label: "Movimiento de mano" },
];
const paceLabels: Record<AssistanceLevel, string> = {
  basic: "Animado",
  guided: "Tranquilo",
  assisted: "Muy tranquilo",
};
const assistanceSettings: Record<AssistanceLevel, { speed: number; window: number }> = {
  basic: { speed: 1.2, window: 8 },
  guided: { speed: 0.85, window: 14 },
  assisted: { speed: 0.55, window: 20 },
};

function createInitialSnapshot(): RaceSnapshot {
  return {
    state: "idle",
    position: 0,
    obstacleIndex: 0,
    jumpUntil: 0,
    jumping: false,
    message: "Todo listo.",
  };
}

export default function CarreraSacosPage() {
  const [mode, setMode] = useState<InputMode>("keyboard");
  const [assistance, setAssistance] = useState<AssistanceLevel>("guided");
  const [snapshot, setSnapshot] = useState<RaceSnapshot>(createInitialSnapshot);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const controllerRef = useRef<InputController | null>(null);
  const audioRef = useRef<AudioManager | null>(null);
  const optionsRef = useRef<HTMLDetailsElement | null>(null);
  const previousRaceStateRef = useRef<RaceState>("idle");
  const sessionRef = useRef<ActiveGameSession | null>(null);

  if (audioRef.current === null) {
    audioRef.current = new AudioManager();
  }

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

  const startRace = useCallback(() => {
    optionsRef.current?.removeAttribute("open");
    const previousSession = sessionRef.current;
    if (previousSession) {
      void finishGameSession(previousSession);
    }

    sessionRef.current = startGameSession({
      player: getActivePlayer(),
      gameKey: "carrera-sacos",
      inputMode: mode,
      assistanceLevel: assistance,
    });
    audioRef.current?.play("start");
    setSnapshot({
      ...createInitialSnapshot(),
      state: "playing",
      message: "¡Vamos! Toca Saltar cuando se acerque la paca.",
    });
  }, [assistance, mode]);

  const togglePause = useCallback(() => {
    if (snapshot.state === "playing") {
      audioRef.current?.play("pause");
    } else if (snapshot.state === "paused") {
      audioRef.current?.play("resume");
    }

    setSnapshot((current) => {
      if (current.state === "playing") {
        return { ...current, state: "paused", message: "La carrera está en pausa." };
      }
      if (current.state === "paused") {
        return { ...current, state: "playing", message: "¡Continuamos!" };
      }
      return current;
    });
  }, [snapshot.state]);

  const jump = useCallback(() => {
    setSnapshot((current) => {
      if (current.state !== "playing") {
        return current;
      }

      const settings = assistanceSettings[assistance];
      const obstacle = obstacles[current.obstacleIndex];
      const nearObstacle =
        obstacle !== undefined && Math.abs(current.position - obstacle) <= settings.window;

      return {
        ...current,
        obstacleIndex: nearObstacle ? current.obstacleIndex + 1 : current.obstacleIndex,
        jumpUntil: Date.now() + 850,
        jumping: true,
        message: nearObstacle ? "¡Muy bien!" : "Buen intento. Sigue jugando.",
      };
    });
  }, [assistance]);

  const handleInput = useCallback(
    (input: GameInput) => {
      if (input.type === "pause") {
        togglePause();
      } else if (input.type === "action") {
        audioRef.current?.play("jump");
        jump();
      }
    },
    [jump, togglePause],
  );

  useEffect(() => {
    const controller = new InputController({
      mode,
      onInput: handleInput,
      cooldownMs: 350,
      isActionEnabled: () => snapshot.state === "playing",
    });
    controllerRef.current = controller;
    controller.start();
    return () => {
      controller.stop();
      controllerRef.current = null;
    };
  }, [handleInput, mode, snapshot.state]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (!soundEnabled) {
      audio.stopMusic();
      previousRaceStateRef.current = snapshot.state;
      return;
    }

    if (snapshot.state === "playing") {
      audio.startMusic();
    } else {
      audio.stopMusic();
    }

    if (snapshot.state === "completed" && previousRaceStateRef.current !== "completed") {
      audio.play("finish");
    }
    previousRaceStateRef.current = snapshot.state;
  }, [snapshot.state, soundEnabled]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => audio?.dispose();
  }, []);

  useEffect(() => {
    if (snapshot.state !== "playing") {
      return;
    }

    const timer = window.setInterval(() => {
      setSnapshot((current) => {
        if (current.state !== "playing") {
          return current;
        }

        const settings = assistanceSettings[assistance];
        const nextPosition = current.position + settings.speed;
        if (nextPosition >= 100) {
          return {
            ...current,
            state: "completed",
            position: 100,
            jumping: false,
            message: "¡Llegaste a la meta!",
          };
        }

        const obstacle = obstacles[current.obstacleIndex];
        const passedObstacle =
          obstacle !== undefined && nextPosition > obstacle + settings.window;
        return {
          ...current,
          position: nextPosition,
          jumping: current.jumpUntil > Date.now(),
          obstacleIndex: passedObstacle
            ? current.obstacleIndex + 1
            : current.obstacleIndex,
        };
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [assistance, snapshot.state]);

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

  function toggleSound() {
    const nextEnabled = !soundEnabled;
    audioRef.current?.setEnabled(nextEnabled);
    setSoundEnabled(nextEnabled);
  }

  const nextObstacle = obstacles[snapshot.obstacleIndex];
  const progress = Math.round(snapshot.position);

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
              Carrera de sacos
            </h1>
            <p className="text-lg text-[var(--color-text-muted)]">
              Toca <strong>Comenzar</strong> y después toca <strong>Saltar</strong>.
            </p>
          </div>
        </header>

        <section
          aria-labelledby="race-title"
          className="flex min-h-[28rem] flex-1 flex-col rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-[var(--shadow-card)] sm:p-3"
        >
          <h2 id="race-title" className="sr-only">
            Zona de carrera
          </h2>

          <RaceScene
            progress={snapshot.position}
            state={snapshot.state}
            isJumping={snapshot.jumping}
            nextObstacle={nextObstacle}
            assistanceWindow={assistanceSettings[assistance].window}
          />

          <div
            className="sr-only"
            role="progressbar"
            aria-label="Progreso de la carrera"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          />

          <div className="mt-5">
            {snapshot.state === "idle" ? (
              <button
                type="button"
                onClick={startRace}
                className="min-h-20 w-full rounded-2xl bg-[var(--color-primary)] px-8 py-4 text-2xl font-bold text-[var(--color-primary-contrast)] hover:bg-[var(--color-primary-hover)]"
              >
                Comenzar
              </button>
            ) : null}

            {snapshot.state === "playing" ? (
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <button
                  type="button"
                  onClick={emitAction}
                  className="min-h-24 rounded-2xl bg-[var(--color-primary)] px-8 py-4 text-3xl font-bold text-[var(--color-primary-contrast)] hover:bg-[var(--color-primary-hover)]"
                >
                  Saltar
                </button>
                <button
                  type="button"
                  onClick={emitPause}
                  className="min-h-16 rounded-2xl border-3 border-[var(--color-primary)] px-7 py-3 text-xl font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]"
                >
                  Pausar
                </button>
              </div>
            ) : null}

            {snapshot.state === "paused" ? (
              <button
                type="button"
                onClick={emitPause}
                className="min-h-20 w-full rounded-2xl bg-[var(--color-primary)] px-8 py-4 text-2xl font-bold text-[var(--color-primary-contrast)] hover:bg-[var(--color-primary-hover)]"
              >
                Continuar
              </button>
            ) : null}

            {snapshot.state === "completed" ? (
              <button
                type="button"
                onClick={startRace}
                className="min-h-20 w-full rounded-2xl bg-[var(--color-primary)] px-8 py-4 text-2xl font-bold text-[var(--color-primary-contrast)] hover:bg-[var(--color-primary-hover)]"
              >
                Volver a jugar
              </button>
            ) : null}
          </div>

          <p
            aria-live="polite"
            aria-atomic="true"
            className={`mt-4 text-center text-xl font-bold ${
              snapshot.state === "idle" ? "sr-only" : ""
            }`}
          >
            {snapshot.message}
          </p>
        </section>

        <details
          ref={optionsRef}
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
        >
          <summary className="min-h-14 cursor-pointer px-5 py-3 text-xl font-bold text-[var(--color-primary)] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-focus)]">
            Opciones
          </summary>
          <div className="grid gap-6 border-t border-[var(--color-border)] p-5 md:grid-cols-2">
            <fieldset>
              <legend className="text-xl font-bold">Cómo jugar</legend>
              <div className="mt-3 grid gap-3">
                {inputModes.map((inputMode) => (
                  <button
                    key={inputMode.mode}
                    type="button"
                    aria-pressed={mode === inputMode.mode}
                    onClick={() => setMode(inputMode.mode)}
                    className={`min-h-14 rounded-xl border-3 px-5 text-left font-bold ${
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
              <legend className="text-xl font-bold">Ritmo</legend>
              <div className="mt-3 grid gap-3">
                {(Object.keys(paceLabels) as AssistanceLevel[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    aria-pressed={assistance === level}
                    onClick={() => setAssistance(level)}
                    className={`min-h-14 rounded-xl border-3 px-5 text-left font-bold ${
                      assistance === level
                        ? "border-[var(--color-primary)] bg-[#e0f2fe]"
                        : "border-[var(--color-border)]"
                    }`}
                  >
                    {paceLabels[level]}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="md:col-span-2">
              <button
                type="button"
                aria-pressed={soundEnabled}
                onClick={toggleSound}
                className="min-h-14 w-full rounded-xl border-3 border-[var(--color-primary)] px-5 font-bold text-[var(--color-primary)]"
              >
                {soundEnabled ? "Silenciar música" : "Activar música"}
              </button>
            </div>
          </div>
        </details>
      </div>
    </main>
  );
}
