"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { InputController } from "@/lib/input/controller";
import type { GameInput, InputMode } from "@/lib/input/types";

type TopState = "idle" | "aiming" | "spinning" | "paused" | "completed";
type AssistanceLevel = "basic" | "guided" | "assisted";
type TopSnapshot = {
  state: TopState;
  round: number;
  totalRounds: number;
  marker: number;
  direction: 1 | -1;
  successfulLaunches: number;
  attempts: number;
  lastResult: "good" | "practice" | null;
  spinUntil: number;
  remainingSpinMs: number;
  message: string;
};

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
    successfulLaunches: 0,
    attempts: 0,
    lastResult: null,
    spinUntil: 0,
    remainingSpinMs: 0,
    message: "El trompo está listo. Comienza cuando quieras.",
  };
}

export default function TrompoPage() {
  const [mode, setMode] = useState<InputMode>("keyboard");
  const [assistance, setAssistance] = useState<AssistanceLevel>("guided");
  const [snapshot, setSnapshot] = useState<TopSnapshot>(createInitialSnapshot);
  const [inputFeedback, setInputFeedback] = useState("Espera la ventana verde y pulsa una vez para lanzar.");
  const controllerRef = useRef<InputController | null>(null);

  const startGame = useCallback(() => {
    setSnapshot({
      ...createInitialSnapshot(),
      state: "aiming",
      round: 1,
      message: "La marca se mueve lentamente. Pulsa dentro de la ventana verde.",
    });
  }, []);

  const togglePause = useCallback(() => {
    setSnapshot((current) => {
      if (current.state === "aiming" || current.state === "spinning") {
        return {
          ...current,
          state: "paused",
          remainingSpinMs: current.state === "spinning" ? Math.max(current.spinUntil - Date.now(), 0) : 0,
          message: "Lanzamiento pausado. La ventana y el trompo esperan.",
        };
      }
      if (current.state === "paused") {
        const nextState: TopState = current.remainingSpinMs > 0 ? "spinning" : "aiming";
        return {
          ...current,
          state: nextState,
          spinUntil: nextState === "spinning" ? Date.now() + current.remainingSpinMs : 0,
          message: "Lanzamiento reanudado. Continúa cuando estés listo.",
        };
      }
      return current;
    });
  }, []);

  const launchTop = useCallback(() => {
    setSnapshot((current) => {
      if (current.state !== "aiming") {
        return { ...current, message: "Espera a que el trompo esté listo para otro lanzamiento." };
      }

      const window = launchWindows[assistance];
      const isInsideWindow = current.marker >= window.start && current.marker <= window.end;
      return {
        ...current,
        state: "spinning",
        attempts: current.attempts + 1,
        successfulLaunches: isInsideWindow ? current.successfulLaunches + 1 : current.successfulLaunches,
        lastResult: isInsideWindow ? "good" : "practice",
        spinUntil: Date.now() + (isInsideWindow ? 2200 : 1400),
        remainingSpinMs: 0,
        message: isInsideWindow
          ? "¡Buen lanzamiento! El trompo gira con estabilidad."
          : "El trompo gira para practicar. No pasa nada; podrás lanzar otra vez.",
      };
    });
  }, [assistance]);

  const handleInput = useCallback((input: GameInput) => {
    if (input.type === "pause") {
      togglePause();
    } else if (input.type === "action") {
      launchTop();
    }
  }, [launchTop, togglePause]);

  const handleRejectedInput = useCallback(() => {
    setInputFeedback("Entrada ignorada para evitar dos lanzamientos accidentales seguidos.");
  }, []);

  useEffect(() => {
    const controller = new InputController({
      mode,
      onInput: handleInput,
      onRejected: handleRejectedInput,
      cooldownMs: 350,
      isActionEnabled: () => snapshot.state === "aiming",
    });
    controllerRef.current = controller;
    controller.start();
    return () => {
      controller.stop();
      controllerRef.current = null;
    };
  }, [handleInput, handleRejectedInput, mode, snapshot.state]);

  useEffect(() => {
    if (snapshot.state !== "aiming" && snapshot.state !== "spinning") {
      return;
    }

    const timer = window.setInterval(() => {
      setSnapshot((current) => {
        if (current.state === "aiming") {
          const nextMarker = current.marker + current.direction * 2;
          if (nextMarker >= 100) return { ...current, marker: 100, direction: -1 };
          if (nextMarker <= 0) return { ...current, marker: 0, direction: 1 };
          return { ...current, marker: nextMarker };
        }

        if (current.state === "spinning" && Date.now() >= current.spinUntil) {
          const nextRound = current.round + 1;
          if (nextRound > current.totalRounds) {
            return { ...current, state: "completed", message: "¡Práctica de trompo completada! Cada lanzamiento fue una oportunidad." };
          }
          return { ...current, state: "aiming", round: nextRound, marker: 0, lastResult: null, message: "El trompo está listo para el siguiente lanzamiento." };
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
    <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <Link className="w-fit font-semibold text-[var(--color-primary)] underline" href="/">
            ← Volver al inicio
          </Link>
          <p className="font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">Actividad 2 · Lanzamiento del trompo</p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">Lanzamiento del trompo</h1>
          <p className="max-w-3xl text-xl text-[var(--color-text-muted)]">
            La marca se mueve lentamente. Pulsa espacio o toca una vez dentro de la ventana verde para lanzar el trompo.
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
              <legend className="text-xl font-bold">Ventana de lanzamiento</legend>
              <div className="mt-3 grid gap-3">
                {(Object.keys(assistanceLabels) as AssistanceLevel[]).map((level) => (
                  <button key={level} type="button" aria-pressed={assistance === level} onClick={() => setAssistance(level)} className={`min-h-14 rounded-xl border-4 px-5 text-left font-bold ${assistance === level ? "border-[var(--color-primary)] bg-[#e0f2fe]" : "border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]"}`}>
                    {assistanceLabels[level]} · ventana {launchWindows[level].end - launchWindows[level].start}%
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </section>

        <section aria-labelledby="game-title" className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-10">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-base font-semibold text-[var(--color-primary)]">Ronda {Math.min(snapshot.round, snapshot.totalRounds)} de {snapshot.totalRounds}</p>
                <h2 id="game-title" className="text-3xl font-bold">Prepara el lanzamiento</h2>
              </div>
              <span className="rounded-full bg-[var(--color-surface-muted)] px-5 py-2 text-lg font-bold">{snapshot.state === "aiming" ? "Apuntando" : snapshot.state === "spinning" ? "Girando" : snapshot.state === "paused" ? "Pausado" : snapshot.state === "completed" ? "Completado" : "Listo"}</span>
            </div>

            <div>
              <div className="mb-2 flex justify-between text-base font-semibold"><span>Progreso</span><span>{progress}%</span></div>
              <div role="progressbar" aria-label={`${progress}% de progreso`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="h-5 overflow-hidden rounded-full bg-[var(--color-surface-muted)]"><div className="h-full rounded-full bg-[var(--color-primary)] transition-[width]" style={{ width: `${progress}%` }} /></div>
            </div>

            <div role="group" aria-label="Indicador de ventana para lanzar el trompo" className="rounded-3xl border-4 border-[var(--color-border)] bg-[#eff6ff] p-6">
              <div className="relative h-32 rounded-2xl bg-[var(--color-surface)]">
                <div className="absolute top-6 h-20 rounded-2xl border-4 border-[var(--color-success)] bg-[var(--color-success-surface)]" style={{ left: `${launchWindow.start}%`, width: `${launchWindow.end - launchWindow.start}%` }}>
                  <span className="flex h-full items-center justify-center text-sm font-bold text-[var(--color-success)]">Ventana amplia</span>
                </div>
                <div role="img" aria-label={`Marca en ${Math.round(snapshot.marker)}%`} className="absolute top-0 h-full w-1 rounded-full bg-[var(--color-primary)] transition-[left] duration-100" style={{ left: `${snapshot.marker}%` }} />
              </div>
              <div className="mt-4 flex justify-between text-base font-semibold"><span>Espera la marca</span><span>Pulsa una vez</span></div>
            </div>

            <div className="flex min-h-48 items-center justify-center rounded-3xl border-4 border-[var(--color-border)] bg-[#fef3c7]">
              <div role="img" aria-label="Trompo" className={`text-8xl ${isSpinning ? "animate-spin" : ""}`}>◢</div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <button type="button" onClick={startGame} className="min-h-16 rounded-2xl bg-[var(--color-primary)] px-8 text-xl font-bold text-[var(--color-primary-contrast)] hover:bg-[var(--color-primary-hover)]">{snapshot.state === "completed" ? "Reiniciar lanzamientos" : "Comenzar lanzamientos"}</button>
              <button type="button" onClick={emitAction} disabled={snapshot.state !== "aiming"} className="min-h-16 rounded-2xl border-4 border-[var(--color-primary)] px-8 text-xl font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50">{mode === "hand" ? "Lanzar con mano" : "Lanzar trompo"}</button>
              <button type="button" onClick={emitPause} disabled={snapshot.state === "idle" || snapshot.state === "completed"} className="min-h-16 rounded-2xl border-4 border-[var(--color-primary)] px-8 text-xl font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50">{snapshot.state === "paused" ? "Reanudar" : "Pausar"}</button>
            </div>

            <div aria-live="polite" aria-atomic="true" className={`rounded-xl border p-5 text-lg font-semibold ${snapshot.lastResult === "practice" ? "border-[#92400e] bg-[#fef3c7] text-[#78350f]" : "border-[var(--color-success)] bg-[var(--color-success-surface)] text-[var(--color-success)]"}`}><span aria-hidden="true" className="mr-2">{snapshot.lastResult === "practice" ? "!" : "✓"}</span>{snapshot.message}</div>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--color-border)] p-4"><dt className="text-base text-[var(--color-text-muted)]">Lanzamientos buenos</dt><dd className="text-3xl font-bold">{snapshot.successfulLaunches}</dd></div>
              <div className="rounded-xl border border-[var(--color-border)] p-4"><dt className="text-base text-[var(--color-text-muted)]">Intentos</dt><dd className="text-3xl font-bold">{snapshot.attempts}</dd></div>
              <div className="rounded-xl border border-[var(--color-border)] p-4"><dt className="text-base text-[var(--color-text-muted)]">Regla</dt><dd className="text-lg font-bold">Sin derrota</dd></div>
            </dl>
            <p className="text-lg text-[var(--color-text-muted)]">{inputFeedback}</p>
          </div>
        </section>

        <footer className="border-t border-[var(--color-border)] pt-5 text-base text-[var(--color-text-muted)]"><p>El trompo es una actividad de coordinación lúdica. No realiza evaluación médica ni clínica.</p></footer>
      </div>
    </main>
  );
}
