"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { InputController } from "@/lib/input/controller";
import {
  AccessibleGameEngine,
  assistanceLabels,
  createInitialSnapshot,
  type AssistanceLevel,
  type GameConfig,
  type GameSnapshot,
} from "@/lib/game/engine";
import type { GameInput, InputMode } from "@/lib/input/types";

const gameConfig: GameConfig = {
  totalSteps: 5,
  optionsCount: 3,
  showDurationMs: 1600,
  feedbackDurationMs: 1000,
  scanIntervalMs: 4200,
};

const inputModes: Array<{ mode: InputMode; label: string }> = [
  { mode: "keyboard", label: "Barra espaciadora" },
  { mode: "touch", label: "Un toque" },
  { mode: "hand", label: "Una mano" },
];

const stateLabels: Record<GameSnapshot["state"], string> = {
  idle: "Listo",
  showing: "Observando",
  "waiting-for-action": "Esperando tu acción",
  accepted: "Acción confirmada",
  feedback: "Confirmación",
  paused: "Pausado",
  completed: "Completado",
};

export default function GameEngineDemoPage() {
  const [mode, setMode] = useState<InputMode>("keyboard");
  const [assistanceLevel, setAssistanceLevel] = useState<AssistanceLevel>("guided");
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => createInitialSnapshot(gameConfig));
  const [inputFeedback, setInputFeedback] = useState("Selecciona comenzar cuando estés listo.");
  const engineRef = useRef<AccessibleGameEngine | null>(null);
  const controllerRef = useRef<InputController | null>(null);

  const handleInput = useCallback((input: GameInput) => {
    engineRef.current?.handleInput(input);
  }, []);

  const handleRejectedInput = useCallback(() => {
    setInputFeedback("Entrada ignorada para proteger contra una doble activación.");
  }, []);

  useEffect(() => {
    const engine = new AccessibleGameEngine(gameConfig, setSnapshot);
    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const controller = new InputController({
      mode,
      onInput: handleInput,
      onRejected: handleRejectedInput,
      cooldownMs: 350,
    });
    controllerRef.current = controller;
    controller.start();

    return () => {
      controller.stop();
      controllerRef.current = null;
    };
  }, [handleInput, handleRejectedInput, mode]);

  function startOrRestart() {
    engineRef.current?.start();
    setInputFeedback("Motor iniciado. Observa la opción destacada y espera la confirmación.");
  }

  function changeAssistanceLevel(level: AssistanceLevel) {
    setAssistanceLevel(level);
    engineRef.current?.setAssistanceLevel(level);
  }

  function emitAction() {
    if (mode === "hand") {
      controllerRef.current?.emitHandAction();
      return;
    }
    controllerRef.current?.emitTouchAction();
  }

  function pauseGame() {
    controllerRef.current?.emitTouchPause();
  }

  const progress = Math.round((snapshot.step / snapshot.totalSteps) * 100);
  const actionButtonLabel = mode === "hand" ? "Simular acción de mano" : "Confirmar acción";

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <Link className="w-fit font-semibold text-[var(--color-primary)] underline" href="/">
            ← Volver al inicio
          </Link>
          <p className="font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
            Task 4 · Motor de acciones
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Práctica a un ritmo tranquilo
          </h1>
          <p className="max-w-3xl text-xl text-[var(--color-text-muted)]">
            El sistema muestra una situación, espera una acción, confirma visualmente y continúa sin penalizar errores.
          </p>
        </header>

        <section
          aria-labelledby="settings-title"
          className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8"
        >
          <h2 id="settings-title" className="text-3xl font-bold">Configura la práctica</h2>
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <fieldset>
              <legend className="text-xl font-bold">Método de entrada</legend>
              <div className="mt-3 grid gap-3">
                {inputModes.map((inputMode) => (
                  <button
                    key={inputMode.mode}
                    type="button"
                    aria-pressed={mode === inputMode.mode}
                    onClick={() => setMode(inputMode.mode)}
                    className={`min-h-14 rounded-xl border-4 px-5 text-left font-bold ${
                      mode === inputMode.mode
                        ? "border-[var(--color-primary)] bg-[#e0f2fe]"
                        : "border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]"
                    }`}
                  >
                    {inputMode.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-xl font-bold">Nivel de asistencia</legend>
              <div className="mt-3 grid gap-3">
                {(Object.keys(assistanceLabels) as AssistanceLevel[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    aria-pressed={assistanceLevel === level}
                    onClick={() => changeAssistanceLevel(level)}
                    className={`min-h-14 rounded-xl border-4 px-5 text-left font-bold ${
                      assistanceLevel === level
                        ? "border-[var(--color-primary)] bg-[#e0f2fe]"
                        : "border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]"
                    }`}
                  >
                    {assistanceLabels[level]}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </section>

        <section
          aria-labelledby="engine-title"
          className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-10"
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-base font-semibold text-[var(--color-primary)]">Demo del motor</p>
                <h2 id="engine-title" className="text-3xl font-bold">Situación actual</h2>
              </div>
              <span className="rounded-full bg-[var(--color-surface-muted)] px-5 py-2 text-lg font-bold">
                {stateLabels[snapshot.state]}
              </span>
            </div>

            <div>
              <div className="mb-2 flex justify-between text-base font-semibold">
                <span>Paso {snapshot.step} de {snapshot.totalSteps}</span>
                <span>{progress}%</span>
              </div>
              <div
                aria-label={`${progress}% de progreso`}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                className="h-5 overflow-hidden rounded-full bg-[var(--color-surface-muted)]"
              >
                <div
                  className="h-full rounded-full bg-[var(--color-primary)] transition-[width]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div
              aria-label="Opciones de la situación"
              className="grid gap-4 sm:grid-cols-3"
              role="list"
            >
              {Array.from({ length: snapshot.optionsCount }, (_, optionIndex) => {
                const highlighted = optionIndex === snapshot.highlightedOption;
                return (
                  <div
                    key={optionIndex}
                    role="listitem"
                    aria-current={highlighted ? "step" : undefined}
                    className={`flex min-h-28 items-center justify-center rounded-2xl border-4 text-xl font-bold ${
                      highlighted
                        ? "border-[var(--color-primary)] bg-[#e0f2fe]"
                        : "border-[var(--color-border)] bg-[var(--color-surface)]"
                    }`}
                  >
                    {highlighted ? "Opción actual" : `Opción ${optionIndex + 1}`}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={startOrRestart}
                className="min-h-16 rounded-2xl bg-[var(--color-primary)] px-8 text-xl font-bold text-[var(--color-primary-contrast)] hover:bg-[var(--color-primary-hover)]"
              >
                {snapshot.state === "completed" ? "Reiniciar práctica" : "Comenzar práctica"}
              </button>
              <button
                type="button"
                onClick={emitAction}
                disabled={snapshot.state !== "waiting-for-action"}
                className="min-h-16 rounded-2xl border-4 border-[var(--color-primary)] px-8 text-xl font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionButtonLabel}
              </button>
              <button
                type="button"
                onClick={pauseGame}
                disabled={snapshot.state === "idle" || snapshot.state === "completed"}
                className="min-h-16 rounded-2xl border-4 border-[var(--color-primary)] px-8 text-xl font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {snapshot.state === "paused" ? "Reanudar" : "Pausar"}
              </button>
              <button
                type="button"
                onClick={() => engineRef.current?.registerRecoverableError()}
                disabled={snapshot.state !== "waiting-for-action"}
                className="min-h-16 rounded-2xl border-4 border-[#92400e] px-8 text-xl font-bold text-[#78350f] hover:bg-[#fef3c7] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Simular error
              </button>
            </div>

            <div
              aria-live="polite"
              aria-atomic="true"
              className="rounded-xl border border-[var(--color-success)] bg-[var(--color-success-surface)] p-5 text-lg font-semibold text-[var(--color-success)]"
            >
              <span aria-hidden="true" className="mr-2">✓</span>
              {snapshot.message}
            </div>
            <p className="text-lg text-[var(--color-text-muted)]">{inputFeedback}</p>
          </div>
        </section>

        <section
          aria-labelledby="rules-title"
          className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8"
        >
          <h2 id="rules-title" className="text-2xl font-bold">Asistencia aplicada</h2>
          <ul className="mt-4 grid gap-3 text-lg text-[var(--color-text-muted)] sm:grid-cols-2">
            <li>• El ritmo de escaneo es lento y configurable.</li>
            <li>• La pausa conserva el paso y la opción actual.</li>
            <li>• Los errores permiten repetir sin quitar progreso.</li>
            <li>• La confirmación siempre aparece de forma visual.</li>
          </ul>
        </section>

        <footer className="border-t border-[var(--color-border)] pt-5 text-base text-[var(--color-text-muted)]">
          <p>
            Esta demo valida el motor general. Las mecánicas de los cuatro juegos se conectarán en los siguientes tasks.
          </p>
        </footer>
      </div>
    </main>
  );
}
