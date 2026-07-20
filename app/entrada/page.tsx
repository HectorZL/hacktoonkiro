"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { InputController } from "@/lib/input/controller";
import type { GameInput, InputMode } from "@/lib/input/types";

const inputModes: Array<{ mode: InputMode; label: string; description: string }> = [
  {
    mode: "keyboard",
    label: "Barra espaciadora",
    description: "Pulsa espacio una vez. No necesitas mantenerlo presionado.",
  },
  {
    mode: "touch",
    label: "Un toque",
    description: "Toca el botón grande una vez para realizar la acción.",
  },
  {
    mode: "hand",
    label: "Una mano",
    description: "Entrada opcional preparada para una futura cámara local.",
  },
];

function inputDescription(input: GameInput) {
  if (input.type === "action") {
    return `Acción aceptada desde ${input.source}.`;
  }
  if (input.type === "pause") {
    return `Pausa recibida desde ${input.source}.`;
  }
  return `Posición de mano recibida: ${Math.round(input.x * 100)}%, ${Math.round(input.y * 100)}%.`;
}

export default function InputDemoPage() {
  const [mode, setMode] = useState<InputMode>("keyboard");
  const [actionCount, setActionCount] = useState(0);
  const [lastInput, setLastInput] = useState<GameInput | null>(null);
  const [feedback, setFeedback] = useState("Esperando una entrada.");
  const [handStatus, setHandStatus] = useState("La cámara todavía no se ha cargado.");
  const controllerRef = useRef<InputController | null>(null);

  const handleInput = useCallback((input: GameInput) => {
    setLastInput(input);
    setFeedback(inputDescription(input));
    if (input.type === "action") {
      setActionCount((currentCount) => currentCount + 1);
    }
  }, []);

  const handleRejectedInput = useCallback(() => {
    setFeedback("Entrada ignorada para evitar una doble activación accidental.");
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

  async function loadOptionalHandAdapter() {
    const controller = controllerRef.current;
    if (!controller) {
      return;
    }

    await controller.loadHandAdapter();
    setHandStatus("Adaptador de mano listo. MediaPipe se conectará bajo demanda en una siguiente integración.");
  }

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <Link className="w-fit font-semibold text-[var(--color-primary)] underline" href="/">
            ← Volver al inicio
          </Link>
          <p className="font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
            Task 3 · Entrada unificada
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Una entrada, una acción clara
          </h1>
          <p className="max-w-3xl text-xl text-[var(--color-text-muted)]">
            El juego recibirá el mismo evento lógico, sin importar si llega desde el teclado, un toque o una mano.
          </p>
        </header>

        <section
          aria-labelledby="mode-title"
          className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8"
        >
          <h2 id="mode-title" className="text-3xl font-bold">Elige la entrada para probar</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {inputModes.map((inputMode) => (
              <button
                key={inputMode.mode}
                type="button"
                aria-pressed={mode === inputMode.mode}
                onClick={() => setMode(inputMode.mode)}
                className={`min-h-32 rounded-2xl border-4 p-5 text-left transition-colors ${
                  mode === inputMode.mode
                    ? "border-[var(--color-primary)] bg-[#e0f2fe]"
                    : "border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]"
                }`}
              >
                <span className="block text-xl font-bold">{inputMode.label}</span>
                <span className="mt-2 block text-base text-[var(--color-text-muted)]">
                  {inputMode.description}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-5 rounded-xl bg-[var(--color-surface-muted)] p-4 text-lg" role="status">
            Entrada seleccionada: <strong>{inputModes.find((inputMode) => inputMode.mode === mode)?.label}</strong>
          </p>
        </section>

        <section
          aria-labelledby="action-title"
          className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-10"
        >
          <div className="flex flex-col gap-6">
            <div>
              <p className="mb-2 text-base font-semibold text-[var(--color-primary)]">Prueba segura</p>
              <h2 id="action-title" className="text-3xl font-bold">Realiza una acción</h2>
              <p className="mt-3 max-w-2xl text-[var(--color-text-muted)]">
                Con teclado, pulsa espacio fuera de los controles. Con toque, pulsa el botón. Escape o el botón de pausa envían una pausa.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => controllerRef.current?.emitTouchAction()}
                className="min-h-20 w-full rounded-2xl bg-[var(--color-primary)] px-8 py-5 text-2xl font-bold text-[var(--color-primary-contrast)] hover:bg-[var(--color-primary-hover)] sm:w-auto"
              >
                Un toque = acción
              </button>
              <button
                type="button"
                onClick={() => controllerRef.current?.emitTouchPause()}
                className="min-h-16 w-full rounded-2xl border-4 border-[var(--color-primary)] px-8 py-4 text-xl font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)] sm:w-auto"
              >
                Pausar
              </button>
            </div>

            <div
              aria-live="polite"
              aria-atomic="true"
              className="rounded-xl border border-[var(--color-success)] bg-[var(--color-success-surface)] p-5 text-lg font-semibold text-[var(--color-success)]"
            >
              <span aria-hidden="true" className="mr-2">✓</span>
              {feedback}
            </div>

            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--color-border)] p-4">
                <dt className="text-base text-[var(--color-text-muted)]">Acciones aceptadas</dt>
                <dd className="text-3xl font-bold">{actionCount}</dd>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] p-4">
                <dt className="text-base text-[var(--color-text-muted)]">Último evento</dt>
                <dd className="text-xl font-bold">{lastInput ? lastInput.type : "Ninguno"}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section
          aria-labelledby="hand-title"
          className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8"
        >
          <h2 id="hand-title" className="text-2xl font-bold">Cámara opcional</h2>
          <p className="mt-2 max-w-3xl text-[var(--color-text-muted)]">
            El adaptador de mano se carga únicamente cuando se solicita. Esta demo no enciende la cámara ni procesa video; la integración de MediaPipe se añadirá después.
          </p>
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={loadOptionalHandAdapter}
              className="min-h-14 rounded-xl border-2 border-[var(--color-primary)] px-5 font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]"
            >
              Preparar adaptador de mano
            </button>
            <p role="status" className="text-[var(--color-text-muted)]">{handStatus}</p>
          </div>
        </section>

        <footer className="border-t border-[var(--color-border)] pt-5 text-base text-[var(--color-text-muted)]">
          <p>
            El controlador aplica un cooldown de 350 ms para evitar dobles activaciones. La pausa no se confunde con una acción de juego.
          </p>
        </footer>
      </div>
    </main>
  );
}
