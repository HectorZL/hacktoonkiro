"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { InputController } from "@/lib/input/controller";
import type { GameInput, InputMode } from "@/lib/input/types";

type CatchGameState = "idle" | "playing" | "paused" | "completed";
type AssistanceLevel = "basic" | "guided" | "assisted";

type CatchSnapshot = {
  state: CatchGameState;
  itemIndex: number;
  totalItems: number;
  itemY: number;
  itemX: number;
  basketX: number;
  caught: number;
  missed: number;
  message: string;
};

const itemOptions = [
  { label: "Foto familiar", symbol: "▣", color: "#fef3c7" },
  { label: "Carta", symbol: "✉", color: "#dbeafe" },
  { label: "Flor", symbol: "✿", color: "#fce7f3" },
  { label: "Libro", symbol: "▤", color: "#dcfce7" },
  { label: "Taza", symbol: "◉", color: "#ede9fe" },
];

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

const assistanceSettings: Record<AssistanceLevel, { fallSpeed: number; tolerance: number }> = {
  basic: { fallSpeed: 2.2, tolerance: 22 },
  guided: { fallSpeed: 1.5, tolerance: 30 },
  assisted: { fallSpeed: 1, tolerance: 40 },
};

function createInitialSnapshot(): CatchSnapshot {
  return {
    state: "idle",
    itemIndex: 0,
    totalItems: 5,
    itemY: 0,
    itemX: 28,
    basketX: 50,
    caught: 0,
    missed: 0,
    message: "La canasta está lista. Comienza cuando quieras.",
  };
}

export default function CatchMemoriesPage() {
  const [mode, setMode] = useState<InputMode>("keyboard");
  const [assistance, setAssistance] = useState<AssistanceLevel>("guided");
  const [snapshot, setSnapshot] = useState<CatchSnapshot>(createInitialSnapshot);
  const [inputFeedback, setInputFeedback] = useState("La ventana de captura es amplia y no hay game over inmediato.");
  const controllerRef = useRef<InputController | null>(null);

  const startRound = useCallback(() => {
    setSnapshot((current) => ({
      ...current,
      state: "playing",
      itemIndex: 0,
      itemY: 0,
      itemX: 28,
      basketX: 50,
      caught: 0,
      missed: 0,
      message: "El recuerdo está bajando. Pulsa cuando esté cerca de la canasta.",
    }));
  }, []);

  const togglePause = useCallback(() => {
    setSnapshot((current) => {
      if (current.state === "playing") {
        return { ...current, state: "paused", message: "Juego pausado. El recuerdo y la canasta esperan." };
      }
      if (current.state === "paused") {
        return { ...current, state: "playing", message: "Juego reanudado. Continúa cuando estés listo." };
      }
      return current;
    });
  }, []);

  const handleAction = useCallback(() => {
    setSnapshot((current) => {
      if (current.state !== "playing") {
        return { ...current, message: "Comienza la ronda para activar la captura." };
      }

      const settings = assistanceSettings[assistance];
      const verticalDistance = Math.abs(current.itemY - 72);
      const horizontalDistance = Math.abs(current.itemX - current.basketX);
      const captured = verticalDistance <= settings.tolerance && horizontalDistance <= settings.tolerance;

      if (captured) {
        return {
          ...current,
          caught: current.caught + 1,
          message: `¡Atrapaste ${itemOptions[current.itemIndex].label}! La confirmación es visual.`,
        };
      }

      return {
        ...current,
        missed: current.missed + 1,
        message: "No pasa nada. El recuerdo continúa y puedes intentar el siguiente.",
      };
    });
  }, [assistance]);

  const handleInput = useCallback((input: GameInput) => {
    if (input.type === "pause") {
      togglePause();
      return;
    }
    if (input.type === "action") {
      handleAction();
    }
  }, [handleAction, togglePause]);

  const handleRejectedInput = useCallback(() => {
    setInputFeedback("Entrada ignorada para evitar una doble captura accidental.");
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

  useEffect(() => {
    if (snapshot.state !== "playing") {
      return;
    }

    const timer = window.setInterval(() => {
      setSnapshot((current) => {
        if (current.state !== "playing") {
          return current;
        }

        const nextY = current.itemY + assistanceSettings[assistance].fallSpeed;
        const nextBasketX = 50 + Math.sin((Date.now() / 1800) + current.itemIndex) * 25;
        if (nextY < 100) {
          return { ...current, itemY: nextY, basketX: nextBasketX };
        }

        const nextIndex = current.itemIndex + 1;
        if (nextIndex >= current.totalItems) {
          return {
            ...current,
            state: "completed",
            itemY: 100,
            basketX: nextBasketX,
            message: "Ronda completada. Los errores no detuvieron el juego.",
          };
        }

        return {
          ...current,
          itemIndex: nextIndex,
          itemY: 0,
          itemX: 25 + ((nextIndex * 19) % 55),
          basketX: nextBasketX,
          message: "Nuevo recuerdo preparado. Tómate tu tiempo.",
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

  const currentItem = itemOptions[snapshot.itemIndex % itemOptions.length];
  const progress = Math.round(((snapshot.itemIndex + (snapshot.state === "completed" ? 1 : 0)) / snapshot.totalItems) * 100);

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <Link className="w-fit font-semibold text-[var(--color-primary)] underline" href="/">
            ← Volver al inicio
          </Link>
          <p className="font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
            Task 5 · Atrapa los Recuerdos
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Atrapa los Recuerdos
          </h1>
          <p className="max-w-3xl text-xl text-[var(--color-text-muted)]">
            La canasta se mueve lentamente por sí sola. Tú solo confirmas el momento de captura con una pulsación o un toque.
          </p>
        </header>

        <section
          aria-labelledby="settings-title"
          className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8"
        >
          <h2 id="settings-title" className="text-3xl font-bold">Configura tu forma de jugar</h2>
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <fieldset>
              <legend className="text-xl font-bold">Entrada</legend>
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
              <legend className="text-xl font-bold">Ritmo y tolerancia</legend>
              <div className="mt-3 grid gap-3">
                {(Object.keys(assistanceLabels) as AssistanceLevel[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    aria-pressed={assistance === level}
                    onClick={() => setAssistance(level)}
                    className={`min-h-14 rounded-xl border-4 px-5 text-left font-bold ${
                      assistance === level
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
          aria-labelledby="game-title"
          className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-10"
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-base font-semibold text-[var(--color-primary)]">Ronda de práctica</p>
                <h2 id="game-title" className="text-3xl font-bold">{currentItem.label}</h2>
              </div>
              <span className="rounded-full bg-[var(--color-surface-muted)] px-5 py-2 text-lg font-bold">
                {snapshot.state === "playing" ? "En juego" : snapshot.state === "paused" ? "Pausado" : snapshot.state === "completed" ? "Completado" : "Listo"}
              </span>
            </div>

            <div>
              <div className="mb-2 flex justify-between text-base font-semibold">
                <span>Recuerdo {Math.min(snapshot.itemIndex + 1, snapshot.totalItems)} de {snapshot.totalItems}</span>
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
                <div className="h-full rounded-full bg-[var(--color-primary)] transition-[width]" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div
              aria-label="Área de juego con movimiento lento"
              className="relative h-[26rem] overflow-hidden rounded-3xl border-4 border-[var(--color-border)] bg-[#eff6ff]"
            >
              <div className="absolute inset-x-0 top-[72%] border-t-4 border-dashed border-[var(--color-success)]" />
              <span className="absolute left-4 top-[68%] rounded-lg bg-[var(--color-success-surface)] px-3 py-1 text-sm font-bold text-[var(--color-success)]">
                Ventana amplia
              </span>
              <div
                aria-label={`Recuerdo: ${currentItem.label}`}
                className="absolute flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border-4 border-[var(--color-primary)] text-4xl shadow-lg transition-[left,top] duration-100"
                style={{ left: `${snapshot.itemX}%`, top: `${snapshot.itemY}%`, backgroundColor: currentItem.color }}
              >
                <span aria-hidden="true">{currentItem.symbol}</span>
              </div>
              <div
                aria-label="Canasta automática"
                className="absolute bottom-5 flex h-16 w-28 -translate-x-1/2 items-center justify-center rounded-b-3xl border-4 border-[#92400e] bg-[#f59e0b] text-3xl shadow-lg transition-[left] duration-100"
                style={{ left: `${snapshot.basketX}%` }}
              >
                <span aria-hidden="true">⌒</span>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={startRound}
                className="min-h-16 rounded-2xl bg-[var(--color-primary)] px-8 text-xl font-bold text-[var(--color-primary-contrast)] hover:bg-[var(--color-primary-hover)]"
              >
                {snapshot.state === "completed" ? "Reiniciar ronda" : "Comenzar ronda"}
              </button>
              <button
                type="button"
                onClick={emitAction}
                disabled={snapshot.state !== "playing"}
                className="min-h-16 rounded-2xl border-4 border-[var(--color-primary)] px-8 text-xl font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mode === "hand" ? "Simular captura de mano" : "Capturar con una acción"}
              </button>
              <button
                type="button"
                onClick={emitPause}
                disabled={snapshot.state === "idle" || snapshot.state === "completed"}
                className="min-h-16 rounded-2xl border-4 border-[var(--color-primary)] px-8 text-xl font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {snapshot.state === "paused" ? "Reanudar" : "Pausar"}
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

            <dl className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--color-border)] p-4">
                <dt className="text-base text-[var(--color-text-muted)]">Atrapados</dt>
                <dd className="text-3xl font-bold">{snapshot.caught}</dd>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] p-4">
                <dt className="text-base text-[var(--color-text-muted)]">Intentos fuera de ventana</dt>
                <dd className="text-3xl font-bold">{snapshot.missed}</dd>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] p-4">
                <dt className="text-base text-[var(--color-text-muted)]">Regla</dt>
                <dd className="text-lg font-bold">Sin derrota</dd>
              </div>
            </dl>
            <p className="text-lg text-[var(--color-text-muted)]">{inputFeedback}</p>
          </div>
        </section>

        <footer className="border-t border-[var(--color-border)] pt-5 text-base text-[var(--color-text-muted)]">
          <p>
            La canasta y los recuerdos se mueven automáticamente. La cámara no es necesaria y no se almacena video.
          </p>
        </footer>
      </div>
    </main>
  );
}
