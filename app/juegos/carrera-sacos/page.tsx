"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { InputController } from "@/lib/input/controller";
import type { GameInput, InputMode } from "@/lib/input/types";

type RaceState = "idle" | "playing" | "paused" | "completed";
type AssistanceLevel = "basic" | "guided" | "assisted";

type RaceSnapshot = {
  state: RaceState;
  position: number;
  obstacleIndex: number;
  jumps: number;
  missed: number;
  jumpUntil: number;
  jumping: boolean;
  message: string;
};

const obstacles = [25, 50, 75];
const inputModes: Array<{ mode: InputMode; label: string }> = [
  { mode: "keyboard", label: "Barra espaciadora" },
  { mode: "touch", label: "Un toque" },
  { mode: "hand", label: "Una mano" },
];
const assistanceLabels: Record<AssistanceLevel, string> = {
  basic: "Básico",
  guided: "Guiado",
  assisted: "Asistido",
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
    jumps: 0,
    missed: 0,
    jumpUntil: 0,
    jumping: false,
    message: "La carrera está lista. Comienza cuando quieras.",
  };
}

export default function CarreraSacosPage() {
  const [mode, setMode] = useState<InputMode>("keyboard");
  const [assistance, setAssistance] = useState<AssistanceLevel>("guided");
  const [snapshot, setSnapshot] = useState<RaceSnapshot>(createInitialSnapshot);
  const [inputFeedback, setInputFeedback] = useState("La ventana de salto es amplia y no hay eliminación.");
  const controllerRef = useRef<InputController | null>(null);

  const startRace = useCallback(() => {
    setSnapshot({
      ...createInitialSnapshot(),
      state: "playing",
      message: "La carrera comenzó. El personaje avanza solo; pulsa para saltar.",
    });
  }, []);

  const togglePause = useCallback(() => {
    setSnapshot((current) => {
      if (current.state === "playing") {
        return { ...current, state: "paused", message: "Carrera pausada. La posición se conserva." };
      }
      if (current.state === "paused") {
        return { ...current, state: "playing", message: "Carrera reanudada. Continúa con calma." };
      }
      return current;
    });
  }, []);

  const jump = useCallback(() => {
    setSnapshot((current) => {
      if (current.state !== "playing") {
        return { ...current, message: "Comienza la carrera para activar el salto." };
      }

      const settings = assistanceSettings[assistance];
      const obstacle = obstacles[current.obstacleIndex];
      const nearObstacle = obstacle !== undefined && Math.abs(current.position - obstacle) <= settings.window;
      const nextObstacleIndex = nearObstacle ? current.obstacleIndex + 1 : current.obstacleIndex;

      return {
        ...current,
        obstacleIndex: nextObstacleIndex,
        jumps: current.jumps + 1,
        missed: nearObstacle ? current.missed : current.missed + 1,
        jumpUntil: Date.now() + 850,
        jumping: true,
        message: nearObstacle
          ? "¡Salto correcto! El personaje superó el obstáculo."
          : "Salto practicado. No pasa nada; la carrera continúa sin penalización.",
      };
    });
  }, [assistance]);

  const handleInput = useCallback((input: GameInput) => {
    if (input.type === "pause") {
      togglePause();
    } else if (input.type === "action") {
      jump();
    }
  }, [jump, togglePause]);

  const handleRejectedInput = useCallback(() => {
    setInputFeedback("Entrada ignorada para evitar dos saltos accidentales seguidos.");
  }, []);

  useEffect(() => {
    const controller = new InputController({
      mode,
      onInput: handleInput,
      onRejected: handleRejectedInput,
      cooldownMs: 350,
      isActionEnabled: () => snapshot.state === "playing",
    });
    controllerRef.current = controller;
    controller.start();
    return () => {
      controller.stop();
      controllerRef.current = null;
    };
  }, [handleInput, handleRejectedInput, mode, snapshot.state]);

  useEffect(() => {
    if (snapshot.state !== "playing") {
      return;
    }

    const timer = window.setInterval(() => {
      setSnapshot((current) => {
        if (current.state !== "playing") {
          return current;
        }

        const nextPosition = current.position + assistanceSettings[assistance].speed;
        if (nextPosition >= 100) {
          return { ...current, state: "completed", position: 100, jumping: false, message: "¡Carrera completada! Cada salto fue una oportunidad de práctica." };
        }

        const obstacle = obstacles[current.obstacleIndex];
        const passedObstacle = obstacle !== undefined && nextPosition > obstacle + assistanceSettings[assistance].window;
        return {
          ...current,
          position: nextPosition,
          jumping: current.jumpUntil > Date.now(),
          obstacleIndex: passedObstacle ? current.obstacleIndex + 1 : current.obstacleIndex,
          missed: passedObstacle ? current.missed + 1 : current.missed,
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

  const nextObstacle = obstacles[snapshot.obstacleIndex];
  const progress = Math.round(snapshot.position);
  const isJumping = snapshot.jumping;

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <Link className="w-fit font-semibold text-[var(--color-primary)] underline" href="/">
            ← Volver al inicio
          </Link>
          <p className="font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">Actividad 1 · Carrera de sacos</p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">Carrera de sacos</h1>
          <p className="max-w-3xl text-xl text-[var(--color-text-muted)]">
            El personaje avanza automáticamente. Pulsa espacio o toca una vez para saltar los obstáculos dentro de una ventana amplia.
          </p>
        </header>

        <section aria-labelledby="settings-title" className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8">
          <h2 id="settings-title" className="text-3xl font-bold">Configura la actividad</h2>
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <fieldset>
              <legend className="text-xl font-bold">Entrada</legend>
              <div className="mt-3 grid gap-3">
                {inputModes.map((inputMode) => (
                  <button key={inputMode.mode} type="button" aria-pressed={mode === inputMode.mode} onClick={() => setMode(inputMode.mode)} className={`min-h-14 rounded-xl border-4 px-5 text-left font-bold ${mode === inputMode.mode ? "border-[var(--color-primary)] bg-[#e0f2fe]" : "border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]"}`}>
                    {inputMode.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-xl font-bold">Ventana de salto</legend>
              <div className="mt-3 grid gap-3">
                {(Object.keys(assistanceLabels) as AssistanceLevel[]).map((level) => (
                  <button key={level} type="button" aria-pressed={assistance === level} onClick={() => setAssistance(level)} className={`min-h-14 rounded-xl border-4 px-5 text-left font-bold ${assistance === level ? "border-[var(--color-primary)] bg-[#e0f2fe]" : "border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]"}`}>
                    {assistanceLabels[level]} · ventana {assistanceSettings[level].window}%
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </section>

        <section aria-labelledby="race-title" className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-10">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-base font-semibold text-[var(--color-primary)]">Competencia de juego del saco</p>
                <h2 id="race-title" className="text-3xl font-bold">Avance: {progress}%</h2>
              </div>
              <span className="rounded-full bg-[var(--color-surface-muted)] px-5 py-2 text-lg font-bold">{snapshot.state === "playing" ? "En carrera" : snapshot.state === "paused" ? "Pausado" : snapshot.state === "completed" ? "Llegada" : "Listo"}</span>
            </div>

            <div>
              <div className="mb-2 flex justify-between text-base font-semibold"><span>Progreso de la carrera</span><span>{progress}%</span></div>
              <div role="progressbar" aria-label={`${progress}% de carrera completada`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="h-5 overflow-hidden rounded-full bg-[var(--color-surface-muted)]"><div className="h-full rounded-full bg-[var(--color-primary)] transition-[width]" style={{ width: `${progress}%` }} /></div>
            </div>

            <div aria-label="Pista de carrera" className="relative h-72 overflow-hidden rounded-3xl border-4 border-[var(--color-border)] bg-[#ecfdf5]">
              <div className="absolute inset-x-0 top-1/2 border-t-4 border-dashed border-[var(--color-border)]" />
              {obstacles.map((obstacle, index) => (
                <div key={obstacle} aria-label={`Obstáculo ${index + 1}`} className="absolute top-[42%] flex h-14 w-10 -translate-x-1/2 items-center justify-center rounded-xl border-4 border-[#92400e] bg-[#f59e0b] text-2xl" style={{ left: `${obstacle}%` }}>▲</div>
              ))}
              <div aria-label="Ventana amplia de salto" className="absolute left-[20%] right-[20%] top-[24%] h-10 rounded-full border-4 border-dashed border-[var(--color-success)] bg-[var(--color-success-surface)] text-center text-sm font-bold text-[var(--color-success)]">Ventana de salto amplia</div>
              <div aria-label="Niño corriendo dentro de un saco" className={`absolute top-[37%] flex h-24 w-20 -translate-x-1/2 items-center justify-center rounded-b-3xl border-4 border-[#1e3a8a] bg-[#bfdbfe] text-4xl transition-[left,transform] duration-100 ${isJumping ? "-translate-y-10" : ""}`} style={{ left: `${snapshot.position}%` }}>🧒</div>
              <div className="absolute bottom-4 right-5 rounded-xl bg-[var(--color-surface)] px-4 py-2 text-lg font-bold">Meta →</div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <button type="button" onClick={startRace} className="min-h-16 rounded-2xl bg-[var(--color-primary)] px-8 text-xl font-bold text-[var(--color-primary-contrast)] hover:bg-[var(--color-primary-hover)]">{snapshot.state === "completed" ? "Reiniciar carrera" : "Comenzar carrera"}</button>
              <button type="button" onClick={emitAction} disabled={snapshot.state !== "playing"} className="min-h-16 rounded-2xl border-4 border-[var(--color-primary)] px-8 text-xl font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50">{mode === "hand" ? "Saltar con mano" : "Saltar"}</button>
              <button type="button" onClick={emitPause} disabled={snapshot.state === "idle" || snapshot.state === "completed"} className="min-h-16 rounded-2xl border-4 border-[var(--color-primary)] px-8 text-xl font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50">{snapshot.state === "paused" ? "Reanudar" : "Pausar"}</button>
            </div>

            <div aria-live="polite" aria-atomic="true" className="rounded-xl border border-[var(--color-success)] bg-[var(--color-success-surface)] p-5 text-lg font-semibold text-[var(--color-success)]"><span aria-hidden="true" className="mr-2">✓</span>{snapshot.message}</div>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--color-border)] p-4"><dt className="text-base text-[var(--color-text-muted)]">Saltos</dt><dd className="text-3xl font-bold">{snapshot.jumps}</dd></div>
              <div className="rounded-xl border border-[var(--color-border)] p-4"><dt className="text-base text-[var(--color-text-muted)]">Obstáculo siguiente</dt><dd className="text-3xl font-bold">{nextObstacle ? `${nextObstacle}%` : "Meta"}</dd></div>
              <div className="rounded-xl border border-[var(--color-border)] p-4"><dt className="text-base text-[var(--color-text-muted)]">Regla</dt><dd className="text-lg font-bold">Sin eliminación</dd></div>
            </dl>
            <p className="text-lg text-[var(--color-text-muted)]">{inputFeedback}</p>
          </div>
        </section>

        <footer className="border-t border-[var(--color-border)] pt-5 text-base text-[var(--color-text-muted)]"><p>El personaje es una representación visual. La actividad no realiza evaluación física ni clínica.</p></footer>
      </div>
    </main>
  );
}
