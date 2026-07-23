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

type GardenState = "idle" | "active" | "paused";
type AssistanceLevel = "basic" | "guided" | "assisted";
type GardenScene = {
  id: string;
  title: string;
  icon: string;
  description: string;
  action: string;
  activeMessage: string;
};
type GardenSnapshot = {
  state: GardenState;
  sceneIndex: number;
  growth: number;
  message: string;
};

const scenes: GardenScene[] = [
  {
    id: "plant",
    title: "La planta de la ventana",
    icon: "🌱",
    description: "La planta espera un poco de agua.",
    action: "Regar",
    activeMessage: "La planta está lista para recibir agua.",
  },
  {
    id: "flower",
    title: "El jardín de flores",
    icon: "🌼",
    description: "Las flores se abren con tu compañía.",
    action: "Cuidar",
    activeMessage: "Las flores están listas para recibir cuidado.",
  },
  {
    id: "pet",
    title: "La mascota del jardín",
    icon: "🐢",
    description: "La mascota se acerca para saludarte.",
    action: "Saludar",
    activeMessage: "La mascota está aquí y espera tu saludo.",
  },
];
const inputModes: Array<{ mode: InputMode; label: string }> = [
  { mode: "keyboard", label: "Barra espaciadora" },
  { mode: "touch", label: "Botón grande" },
  { mode: "hand", label: "Movimiento de mano" },
];
const paceLabels: Record<AssistanceLevel, string> = {
  basic: "Tranquilo",
  guided: "Más tranquilo",
  assisted: "Muy tranquilo",
};
const assistanceSettings: Record<
  AssistanceLevel,
  { interval: number; growth: number }
> = {
  basic: { interval: 9000, growth: 1 },
  guided: { interval: 12000, growth: 1 },
  assisted: { interval: 16000, growth: 2 },
};

function createInitialSnapshot(): GardenSnapshot {
  return {
    state: "idle",
    sceneIndex: 0,
    growth: 0,
    message: "Todo listo.",
  };
}

export default function JardinVirtualPage() {
  const [mode, setMode] = useState<InputMode>("keyboard");
  const [assistance, setAssistance] = useState<AssistanceLevel>("guided");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [snapshot, setSnapshot] = useState<GardenSnapshot>(createInitialSnapshot);
  const controllerRef = useRef<InputController | null>(null);
  const audioRef = useRef<AudioManager | null>(null);
  const optionsRef = useRef<HTMLDetailsElement | null>(null);
  const previousSnapshotRef = useRef<GardenSnapshot | null>(null);
  const sessionRef = useRef<ActiveGameSession | null>(null);

  useEffect(() => {
    const manager = new AudioManager();
    audioRef.current = manager;
    return () => {
      manager.dispose();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      const activeSession = sessionRef.current;
      sessionRef.current = null;
      if (activeSession) {
        void finishGameSession(activeSession);
      }
    };
  }, []);

  useEffect(() => {
    const previousSnapshot = previousSnapshotRef.current;
    if (previousSnapshot) {
      if (snapshot.sceneIndex !== previousSnapshot.sceneIndex) {
        audioRef.current?.play("scene");
      }
      if (snapshot.growth !== previousSnapshot.growth) {
        audioRef.current?.play("care");
      }
      if (snapshot.state !== previousSnapshot.state) {
        if (snapshot.state === "paused") {
          audioRef.current?.play("pause");
        } else if (snapshot.state === "active") {
          audioRef.current?.play(
            previousSnapshot.state === "idle" ? "start" : "resume",
          );
        }
      }
    }
    previousSnapshotRef.current = snapshot;
  }, [snapshot]);

  const startGarden = useCallback(() => {
    optionsRef.current?.removeAttribute("open");
    const previousSession = sessionRef.current;
    if (previousSession) {
      void finishGameSession(previousSession);
    }

    const activePlayer = getActivePlayer();
    sessionRef.current = startGameSession({
      player: activePlayer,
      gameKey: "jardin-virtual",
      inputMode: mode,
      assistanceLevel: assistance,
    });
    setSnapshot({
      ...createInitialSnapshot(),
      state: "active",
      message: scenes[0].activeMessage,
    });
  }, [assistance, mode]);

  const togglePause = useCallback(() => {
    setSnapshot((current) => {
      if (current.state === "active") {
        return { ...current, state: "paused", message: "El jardín está en pausa." };
      }
      if (current.state === "paused") {
        return { ...current, state: "active", message: "¡Continuamos!" };
      }
      return current;
    });
  }, []);

  const careForGarden = useCallback(() => {
    setSnapshot((current) => {
      if (current.state !== "active") {
        return current;
      }

      const nextGrowth = Math.min(
        current.growth + assistanceSettings[assistance].growth,
        3,
      );
      return {
        ...current,
        growth: nextGrowth,
        message:
          nextGrowth >= 3 ? "¡Muy bien!" : "El jardín recibió tu cuidado.",
      };
    });
  }, [assistance]);

  const handleInput = useCallback(
    (input: GameInput) => {
      if (input.type === "pause") {
        togglePause();
      } else if (input.type === "action") {
        careForGarden();
      }
    },
    [careForGarden, togglePause],
  );

  useEffect(() => {
    const controller = new InputController({
      mode,
      onInput: handleInput,
      cooldownMs: 350,
      isActionEnabled: () => snapshot.state === "active",
    });
    controllerRef.current = controller;
    controller.start();
    return () => {
      controller.stop();
      controllerRef.current = null;
    };
  }, [handleInput, mode, snapshot.state]);

  useEffect(() => {
    if (snapshot.state !== "active") {
      return;
    }

    const timer = window.setInterval(() => {
      setSnapshot((current) => {
        if (current.state !== "active") {
          return current;
        }

        const nextSceneIndex = (current.sceneIndex + 1) % scenes.length;
        return {
          ...current,
          sceneIndex: nextSceneIndex,
          growth: 0,
          message: scenes[nextSceneIndex].activeMessage,
        };
      });
    }, assistanceSettings[assistance].interval);

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
    const nextSoundEnabled = !soundEnabled;
    setSoundEnabled(nextSoundEnabled);
    audioRef.current?.setEnabled(nextSoundEnabled);
    if (nextSoundEnabled) {
      audioRef.current?.play("start");
    }
  }

  const scene = scenes[snapshot.sceneIndex];
  const growthPercent = Math.round((snapshot.growth / 3) * 100);

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
              El Jardín Virtual
            </h1>
            <p className="text-lg text-[var(--color-text-muted)]">
              Toca <strong>Comenzar</strong> y después el botón grande.
            </p>
          </div>
        </header>

        <section
          aria-labelledby="garden-title"
          className="flex min-h-[28rem] flex-1 flex-col rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-[var(--shadow-card)] sm:p-3"
        >
          <div
            role="group"
            aria-label={`Escena del jardín: ${scene.title}`}
            className="relative flex min-h-64 flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl border-4 border-[#65a30d] bg-gradient-to-b from-[#d9f99d] to-[#bbf7d0] p-4 text-center"
          >
            <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-16 bg-[#86efac]" />
            <div aria-hidden="true" className="absolute left-6 top-5 text-4xl">☀️</div>
            <div aria-hidden="true" className="absolute right-6 top-6 text-4xl">☁️</div>
            <h2
              id="garden-title"
              className="relative z-10 text-2xl font-bold text-[#365314]"
            >
              {scene.title}
            </h2>
            <div
              aria-hidden="true"
              className={`relative z-10 mt-2 text-8xl transition-transform ${
                snapshot.state === "active" ? "animate-pulse" : ""
              }`}
              style={{ transform: `scale(${1 + snapshot.growth * 0.08})` }}
            >
              {scene.icon}
            </div>
            <p className="relative z-10 mt-2 max-w-xl text-xl font-bold text-[#365314]">
              {scene.description}
            </p>
          </div>

          <div
            className="sr-only"
            role="progressbar"
            aria-label="Cuidado de esta escena"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={growthPercent}
          />

          <div className="mt-3">
            {snapshot.state === "idle" ? (
              <button
                type="button"
                onClick={startGarden}
                className="min-h-16 w-full rounded-2xl bg-[var(--color-primary)] px-8 py-3 text-2xl font-bold text-[var(--color-primary-contrast)] hover:bg-[var(--color-primary-hover)]"
              >
                Comenzar
              </button>
            ) : null}

            {snapshot.state === "active" ? (
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <button
                  type="button"
                  onClick={emitAction}
                  className="min-h-16 rounded-2xl bg-[var(--color-primary)] px-8 py-3 text-3xl font-bold text-[var(--color-primary-contrast)] hover:bg-[var(--color-primary-hover)]"
                >
                  {scene.action}
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

            {snapshot.state === "paused" ? (
              <button
                type="button"
                onClick={emitPause}
                className="min-h-16 w-full rounded-2xl bg-[var(--color-primary)] px-8 py-3 text-2xl font-bold text-[var(--color-primary-contrast)] hover:bg-[var(--color-primary-hover)]"
              >
                Continuar
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
              <legend className="text-xl font-bold">Ritmo</legend>
              <div className="mt-3 grid gap-2">
                {(Object.keys(paceLabels) as AssistanceLevel[]).map((level) => (
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
                    {paceLabels[level]}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-2 md:col-span-2 sm:grid-cols-2">
              <button
                type="button"
                aria-pressed={soundEnabled}
                onClick={toggleSound}
                className="min-h-12 rounded-xl border-3 border-[var(--color-primary)] px-5 font-bold text-[var(--color-primary)]"
              >
                {soundEnabled ? "Silenciar sonido" : "Activar sonido"}
              </button>
              {snapshot.state !== "idle" ? (
                <button
                  type="button"
                  onClick={startGarden}
                  className="min-h-12 rounded-xl border-3 border-[var(--color-primary)] px-5 font-bold text-[var(--color-primary)]"
                >
                  Reiniciar jardín
                </button>
              ) : null}
            </div>
          </div>
        </details>
      </div>
    </main>
  );
}
