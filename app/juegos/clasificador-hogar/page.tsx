"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { InputController } from "@/lib/input/controller";
import type { GameInput, InputMode } from "@/lib/input/types";

type SortGameState = "idle" | "playing" | "paused" | "completed";
type AssistanceLevel = "basic" | "guided" | "assisted";
type ResultType = "correct" | "wrong" | null;

type Category = {
  id: string;
  name: string;
  symbol: string;
  description: string;
};

type SortItem = {
  name: string;
  symbol: string;
  categoryId: string;
  color: string;
};

type SortSnapshot = {
  state: SortGameState;
  itemIndex: number;
  correct: number;
  errors: number;
  highlightedCategory: number;
  message: string;
  result: ResultType;
};

const categories: Category[] = [
  { id: "ropa", name: "Ropa", symbol: "♧", description: "Prendas y accesorios" },
  { id: "cocina", name: "Cocina", symbol: "◉", description: "Objetos para preparar alimentos" },
  { id: "lectura", name: "Lectura", symbol: "▤", description: "Libros y materiales de lectura" },
];

const items: SortItem[] = [
  { name: "Bufanda", symbol: "∿", categoryId: "ropa", color: "#fce7f3" },
  { name: "Taza", symbol: "◉", categoryId: "cocina", color: "#fef3c7" },
  { name: "Libro", symbol: "▤", categoryId: "lectura", color: "#dbeafe" },
  { name: "Sombrero", symbol: "⌒", categoryId: "ropa", color: "#dcfce7" },
  { name: "Plato", symbol: "◯", categoryId: "cocina", color: "#ede9fe" },
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

const scanIntervals: Record<AssistanceLevel, number> = {
  basic: 2800,
  guided: 4300,
  assisted: 6500,
};

function createInitialSnapshot(): SortSnapshot {
  return {
    state: "idle",
    itemIndex: 0,
    correct: 0,
    errors: 0,
    highlightedCategory: 0,
    message: "El objeto está listo para clasificarse.",
    result: null,
  };
}

export default function HomeSorterPage() {
  const [mode, setMode] = useState<InputMode>("keyboard");
  const [assistance, setAssistance] = useState<AssistanceLevel>("guided");
  const [snapshot, setSnapshot] = useState<SortSnapshot>(createInitialSnapshot);
  const [inputFeedback, setInputFeedback] = useState("Las categorías avanzan automáticamente; no necesitas arrastrar.");
  const controllerRef = useRef<InputController | null>(null);

  const startGame = useCallback(() => {
    setSnapshot({
      ...createInitialSnapshot(),
      state: "playing",
      message: "Observa las categorías. Pulsa cuando aparezca el destino correcto.",
    });
  }, []);

  const togglePause = useCallback(() => {
    setSnapshot((current) => {
      if (current.state === "playing") {
        return { ...current, state: "paused", message: "Clasificación pausada. La categoría actual queda conservada." };
      }
      if (current.state === "paused") {
        return { ...current, state: "playing", message: "Clasificación reanudada. Continúa cuando estés listo." };
      }
      return current;
    });
  }, []);

  const confirmCategory = useCallback(() => {
    setSnapshot((current) => {
      if (current.state !== "playing") {
        return { ...current, message: "Comienza la práctica para confirmar una categoría." };
      }

      const item = items[current.itemIndex];
      const category = categories[current.highlightedCategory];
      if (item.categoryId === category.id) {
        const nextItemIndex = current.itemIndex + 1;
        if (nextItemIndex >= items.length) {
          return {
            ...current,
            state: "completed",
            correct: current.correct + 1,
            result: "correct",
            message: `¡Correcto! ${item.name} pertenece a ${category.name}. Clasificación completada.`,
          };
        }

        return {
          ...current,
          itemIndex: nextItemIndex,
          highlightedCategory: 0,
          correct: current.correct + 1,
          result: "correct",
          message: `¡Correcto! ${item.name} pertenece a ${category.name}. Siguiente objeto preparado.`,
        };
      }

      return {
        ...current,
        errors: current.errors + 1,
        result: "wrong",
        message: `Todavía no. ${item.name} sigue disponible para que puedas corregir la selección.`,
      };
    });
  }, []);

  const handleInput = useCallback((input: GameInput) => {
    if (input.type === "pause") {
      togglePause();
      return;
    }
    if (input.type === "action") {
      confirmCategory();
    }
  }, [confirmCategory, togglePause]);

  const handleRejectedInput = useCallback(() => {
    setInputFeedback("Entrada ignorada para evitar una doble confirmación accidental.");
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
        return {
          ...current,
          highlightedCategory: (current.highlightedCategory + 1) % categories.length,
          result: null,
          message: "Las categorías avanzan lentamente. Pulsa cuando estés listo.",
        };
      });
    }, scanIntervals[assistance]);

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

  const currentItem = items[snapshot.itemIndex];
  const progress = Math.round((snapshot.itemIndex / items.length) * 100);

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <Link className="w-fit font-semibold text-[var(--color-primary)] underline" href="/">
            ← Volver al inicio
          </Link>
          <p className="font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
            Task 6 · Clasificador del Hogar
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Clasificador del Hogar
          </h1>
          <p className="max-w-3xl text-xl text-[var(--color-text-muted)]">
            Mira el objeto, espera la categoría que corresponda y confirma con una sola acción. No hay arrastre ni selección rápida.
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
              <legend className="text-xl font-bold">Velocidad de recorrido</legend>
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
                    {assistanceLabels[level]} · una opción cada {scanIntervals[level] / 1000} segundos
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
                <p className="mb-2 text-base font-semibold text-[var(--color-primary)]">Objeto actual</p>
                <h2 id="game-title" className="text-3xl font-bold">{currentItem.name}</h2>
              </div>
              <span className="rounded-full bg-[var(--color-surface-muted)] px-5 py-2 text-lg font-bold">
                {snapshot.state === "playing" ? "En juego" : snapshot.state === "paused" ? "Pausado" : snapshot.state === "completed" ? "Completado" : "Listo"}
              </span>
            </div>

            <div>
              <div className="mb-2 flex justify-between text-base font-semibold">
                <span>Objeto {Math.min(snapshot.itemIndex + 1, items.length)} de {items.length}</span>
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

            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <div
                aria-label={`Objeto: ${currentItem.name}`}
                className="flex min-h-64 flex-col items-center justify-center rounded-3xl border-4 border-[var(--color-border)] p-8 text-center"
                style={{ backgroundColor: currentItem.color }}
              >
                <span aria-hidden="true" className="text-8xl">{currentItem.symbol}</span>
                <span className="mt-4 text-3xl font-bold">{currentItem.name}</span>
                <span className="mt-2 text-lg text-[var(--color-text-muted)]">Objeto grande y fácil de identificar</span>
              </div>

              <div>
                <h3 className="text-2xl font-bold">Categoría destacada</h3>
                <p className="mt-2 text-lg text-[var(--color-text-muted)]">
                  El sistema recorre las opciones lentamente. Confirma la que corresponde al objeto.
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-3" role="list" aria-label="Categorías">
                  {categories.map((category, index) => {
                    const highlighted = snapshot.highlightedCategory === index;
                    return (
                      <div
                        key={category.id}
                        role="listitem"
                        aria-current={highlighted ? "step" : undefined}
                        className={`min-h-36 rounded-2xl border-4 p-4 text-center ${
                          highlighted
                            ? "border-[var(--color-primary)] bg-[#e0f2fe]"
                            : "border-[var(--color-border)] bg-[var(--color-surface)]"
                        }`}
                      >
                        <span aria-hidden="true" className="block text-4xl">{category.symbol}</span>
                        <span className="mt-2 block text-xl font-bold">{category.name}</span>
                        <span className="mt-1 block text-sm text-[var(--color-text-muted)]">{category.description}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={startGame}
                className="min-h-16 rounded-2xl bg-[var(--color-primary)] px-8 text-xl font-bold text-[var(--color-primary-contrast)] hover:bg-[var(--color-primary-hover)]"
              >
                {snapshot.state === "completed" ? "Reiniciar clasificación" : "Comenzar clasificación"}
              </button>
              <button
                type="button"
                onClick={emitAction}
                disabled={snapshot.state !== "playing"}
                className="min-h-16 rounded-2xl border-4 border-[var(--color-primary)] px-8 text-xl font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mode === "hand" ? "Confirmar con mano" : "Confirmar categoría"}
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
              className={`rounded-xl border p-5 text-lg font-semibold ${
                snapshot.result === "wrong"
                  ? "border-[#92400e] bg-[#fef3c7] text-[#78350f]"
                  : "border-[var(--color-success)] bg-[var(--color-success-surface)] text-[var(--color-success)]"
              }`}
            >
              <span aria-hidden="true" className="mr-2">{snapshot.result === "wrong" ? "!" : "✓"}</span>
              {snapshot.message}
            </div>
            <p className="text-lg text-[var(--color-text-muted)]">{inputFeedback}</p>
          </div>
        </section>

        <section
          aria-labelledby="rules-title"
          className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8"
        >
          <h2 id="rules-title" className="text-2xl font-bold">Reglas accesibles</h2>
          <ul className="mt-4 grid gap-3 text-lg text-[var(--color-text-muted)] sm:grid-cols-2">
            <li>• No se arrastra ningún objeto.</li>
            <li>• Texto, símbolo y forma identifican cada categoría.</li>
            <li>• Un error no elimina el progreso.</li>
            <li>• La categoría correcta puede aparecer otra vez.</li>
          </ul>
        </section>

        <footer className="border-t border-[var(--color-border)] pt-5 text-base text-[var(--color-text-muted)]">
          <p>
            El color no es la única diferencia entre categorías. La cámara es opcional y no se almacena video.
          </p>
        </footer>
      </div>
    </main>
  );
}
