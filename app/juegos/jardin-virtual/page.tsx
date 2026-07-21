"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AudioManager } from "@/lib/audio/manager";
import { finishGameSession, getActivePlayer, startGameSession, type ActiveGameSession } from "@/lib/sessions/manager";
import { InputController } from "@/lib/input/controller";
import type { GameInput, InputMode } from "@/lib/input/types";

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
  careCount: number;
  growth: number;
  message: string;
};

const scenes: GardenScene[] = [
  {
    id: "plant",
    title: "La planta de la ventana",
    icon: "🌱",
    description: "La planta espera un poco de agua para seguir creciendo.",
    action: "Regar la planta",
    activeMessage: "La planta está lista para recibir agua.",
  },
  {
    id: "flower",
    title: "El jardín de flores",
    icon: "🌼",
    description: "Las flores se abren lentamente con tu compañía.",
    action: "Cuidar las flores",
    activeMessage: "Las flores están listas para recibir cuidado.",
  },
  {
    id: "pet",
    title: "La mascota del jardín",
    icon: "🐢",
    description: "La mascota se acerca despacio para acompañarte.",
    action: "Acariciar la mascota",
    activeMessage: "La mascota está aquí y espera tu saludo.",
  },
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
const assistanceSettings: Record<AssistanceLevel, { interval: number; growth: number }> = {
  basic: { interval: 9000, growth: 1 },
  guided: { interval: 12000, growth: 1 },
  assisted: { interval: 16000, growth: 2 },
};

function createInitialSnapshot(): GardenSnapshot {
  return {
    state: "idle",
    sceneIndex: 0,
    careCount: 0,
    growth: 0,
    message: "El jardín está listo. Comienza cuando quieras.",
  };
}

export default function JardinVirtualPage() {
  const [mode, setMode] = useState<InputMode>("keyboard");
  const [assistance, setAssistance] = useState<AssistanceLevel>("guided");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [snapshot, setSnapshot] = useState<GardenSnapshot>(createInitialSnapshot);
  const [inputFeedback, setInputFeedback] = useState("No hay puntuación ni derrota. Puedes repetir la acción con calma.");
  const controllerRef = useRef<InputController | null>(null);
  const audioRef = useRef<AudioManager | null>(null);
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
      if (snapshot.careCount !== previousSnapshot.careCount) {
        audioRef.current?.play("care");
      }
      if (snapshot.state !== previousSnapshot.state) {
        if (snapshot.state === "paused") {
          audioRef.current?.play("pause");
        } else if (snapshot.state === "active") {
          audioRef.current?.play(previousSnapshot.state === "idle" ? "start" : "resume");
        }
      }
    }
    previousSnapshotRef.current = snapshot;
  }, [snapshot]);

  const startGarden = useCallback(() => {
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
    setInputFeedback(`Sesión de ${activePlayer.name} iniciada. Se guardarán juego, tiempo, entrada y asistencia.`);
    setSnapshot({
      ...createInitialSnapshot(),
      state: "active",
      message: scenes[0].activeMessage,
    });
  }, [assistance, mode]);

  const togglePause = useCallback(() => {
    setSnapshot((current) => {
      if (current.state === "active") {
        return { ...current, state: "paused", message: "Jardín pausado. La escena se conserva." };
      }
      if (current.state === "paused") {
        return { ...current, state: "active", message: "Jardín reanudado. Continúa cuando estés listo." };
      }
      return current;
    });
  }, []);

  const repeatInstruction = useCallback(() => {
    setSnapshot((current) => ({
      ...current,
      message: scenes[current.sceneIndex].activeMessage,
    }));
  }, []);

  const careForGarden = useCallback(() => {
    setSnapshot((current) => {
      if (current.state !== "active") {
        return { ...current, message: "Comienza el jardín para realizar una acción." };
      }

      const scene = scenes[current.sceneIndex];
      const nextGrowth = Math.min(current.growth + assistanceSettings[assistance].growth, 3);
      const completedGrowth = nextGrowth >= 3;
      return {
        ...current,
        careCount: current.careCount + 1,
        growth: nextGrowth,
        message: completedGrowth
          ? `${scene.title} está feliz. Puedes continuar cuidándola o esperar la siguiente escena.`
          : `${scene.title} recibió tu cuidado. Todo va creciendo poco a poco.`,
      };
    });
  }, [assistance]);

  const handleInput = useCallback((input: GameInput) => {
    if (input.type === "pause") {
      togglePause();
    } else if (input.type === "action") {
      careForGarden();
    }
  }, [careForGarden, togglePause]);

  const handleRejectedInput = useCallback(() => {
    setInputFeedback("Entrada ignorada para evitar dos acciones accidentales seguidas.");
  }, []);

  useEffect(() => {
    const controller = new InputController({
      mode,
      onInput: handleInput,
      onRejected: handleRejectedInput,
      cooldownMs: 350,
      isActionEnabled: () => snapshot.state === "active",
    });
    controllerRef.current = controller;
    controller.start();
    return () => {
      controller.stop();
      controllerRef.current = null;
    };
  }, [handleInput, handleRejectedInput, mode, snapshot.state]);

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
    setInputFeedback(nextSoundEnabled
      ? "Alertas de sonido activadas. Cada alerta también aparece escrita y visualmente."
      : "Alertas de sonido silenciadas. La actividad continúa con feedback visual.");
    if (nextSoundEnabled) {
      audioRef.current?.play("start");
    }
  }

  const scene = scenes[snapshot.sceneIndex];
  const growthPercent = Math.round((snapshot.growth / 3) * 100);
  const gardenStatus = snapshot.state === "active" ? "En calma" : snapshot.state === "paused" ? "Pausado" : "Listo";

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <Link className="w-fit font-semibold text-[var(--color-primary)] underline" href="/">
            ← Volver al inicio
          </Link>
          <p className="font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">Actividad 3 · El Jardín Virtual</p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">El Jardín Virtual</h1>
          <p className="max-w-3xl text-xl text-[var(--color-text-muted)]">
            Cuida una escena tranquila con una sola acción. El jardín avanza despacio y no tiene puntuación, tiempo límite ni derrota.
          </p>
        </header>

        <section aria-labelledby="settings-title" className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8">
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
                    className={`min-h-14 rounded-xl border-4 px-5 text-left font-bold ${mode === inputMode.mode ? "border-[var(--color-primary)] bg-[#e0f2fe]" : "border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]"}`}
                  >
                    {inputMode.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-xl font-bold">Ritmo del jardín</legend>
              <div className="mt-3 grid gap-3">
                {(Object.keys(assistanceLabels) as AssistanceLevel[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    aria-pressed={assistance === level}
                    onClick={() => setAssistance(level)}
                    className={`min-h-14 rounded-xl border-4 px-5 text-left font-bold ${assistance === level ? "border-[var(--color-primary)] bg-[#e0f2fe]" : "border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]"}`}
                  >
                    {assistanceLabels[level]} · cambio lento de escena
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          <div className="mt-6 flex flex-col gap-4 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-bold">Alertas de sonido</h3>
              <p className="mt-1 text-[var(--color-text-muted)]">Son tonos suaves opcionales. Cada alerta también se muestra con texto e imagen.</p>
            </div>
            <button type="button" aria-pressed={soundEnabled} onClick={toggleSound} className="min-h-14 rounded-xl border-4 border-[var(--color-primary)] px-5 font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface)]">{soundEnabled ? "Silenciar alertas" : "Activar alertas"}</button>
          </div>
        </section>

        <section aria-labelledby="garden-title" className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-10">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-base font-semibold text-[var(--color-primary)]">Un punto de interés a la vez</p>
                <h2 id="garden-title" className="text-3xl font-bold">{scene.title}</h2>
              </div>
              <span className="rounded-full bg-[var(--color-surface-muted)] px-5 py-2 text-lg font-bold">{gardenStatus}</span>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div aria-label={`Escena del jardín: ${scene.title}`} className="relative flex min-h-80 flex-col items-center justify-center overflow-hidden rounded-3xl border-4 border-[#65a30d] bg-gradient-to-b from-[#d9f99d] to-[#bbf7d0] p-8 text-center shadow-inner">
                <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-20 bg-[#86efac]" />
                <div aria-hidden="true" className="absolute left-8 top-8 text-5xl">☀️</div>
                <div aria-hidden="true" className="absolute right-8 top-12 text-4xl">☁️</div>
                <div aria-hidden="true" className={`relative z-10 text-8xl ${snapshot.state === "active" ? "animate-pulse" : ""}`}>{scene.icon}</div>
                <p className="relative z-10 mt-4 max-w-xl text-2xl font-bold text-[#365314]">{scene.description}</p>
                <p className="relative z-10 mt-2 rounded-full bg-[var(--color-surface)] px-5 py-2 text-lg font-bold text-[var(--color-success)]">{scene.action}</p>
              </div>

              <div className="flex flex-col justify-center gap-5 rounded-3xl border-4 border-[var(--color-border)] bg-[#f0fdf4] p-6">
                <div>
                  <p className="text-base font-semibold text-[var(--color-primary)]">Crecimiento de esta escena</p>
                  <div className="mt-3 h-6 overflow-hidden rounded-full bg-[var(--color-surface-muted)]" role="progressbar" aria-label={`${growthPercent}% de cuidado en esta escena`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={growthPercent}>
                    <div className="h-full rounded-full bg-[#65a30d] transition-[width]" style={{ width: `${growthPercent}%` }} />
                  </div>
                  <p className="mt-2 text-lg font-bold">{growthPercent}% de cuidado</p>
                </div>
                <div className="rounded-2xl border-2 border-[#86efac] bg-[var(--color-surface)] p-4">
                  <p className="font-bold">Instrucción</p>
                  <p className="mt-2 text-[var(--color-text-muted)]">{scene.action} cuando estés listo. No necesitas hacerlo rápido.</p>
                </div>
                <button type="button" onClick={repeatInstruction} className="min-h-14 rounded-xl border-4 border-[var(--color-primary)] px-5 text-lg font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]">Repetir instrucción</button>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <button type="button" onClick={startGarden} className="min-h-16 rounded-2xl bg-[var(--color-primary)] px-8 text-xl font-bold text-[var(--color-primary-contrast)] hover:bg-[var(--color-primary-hover)]">{snapshot.state === "idle" ? "Entrar al jardín" : "Reiniciar jardín"}</button>
              <button type="button" onClick={emitAction} disabled={snapshot.state !== "active"} className="min-h-16 rounded-2xl border-4 border-[var(--color-primary)] px-8 text-xl font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50">{mode === "hand" ? "Cuidar con mano" : scene.action}</button>
              <button type="button" onClick={emitPause} disabled={snapshot.state === "idle"} className="min-h-16 rounded-2xl border-4 border-[var(--color-primary)] px-8 text-xl font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50">{snapshot.state === "paused" ? "Reanudar" : "Pausar"}</button>
            </div>

            <div aria-live="polite" aria-atomic="true" className="rounded-xl border border-[var(--color-success)] bg-[var(--color-success-surface)] p-5 text-lg font-semibold text-[var(--color-success)]"><span aria-hidden="true" className="mr-2">{soundEnabled ? "🔔" : "✓"}</span>{snapshot.message}</div>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--color-border)] p-4"><dt className="text-base text-[var(--color-text-muted)]">Cuidados realizados</dt><dd className="text-3xl font-bold">{snapshot.careCount}</dd></div>
              <div className="rounded-xl border border-[var(--color-border)] p-4"><dt className="text-base text-[var(--color-text-muted)]">Escena</dt><dd className="text-3xl font-bold">{snapshot.sceneIndex + 1} de {scenes.length}</dd></div>
              <div className="rounded-xl border border-[var(--color-border)] p-4"><dt className="text-base text-[var(--color-text-muted)]">Regla</dt><dd className="text-lg font-bold">Sin derrota</dd></div>
            </dl>
            <p className="text-lg text-[var(--color-text-muted)]">{inputFeedback}</p>
          </div>
        </section>

        <footer className="border-t border-[var(--color-border)] pt-5 text-base text-[var(--color-text-muted)]"><p>El jardín es una experiencia de entretenimiento accesible. La sesión guarda solo jugador, juego, duración, entrada y asistencia; no registra datos clínicos, audio ni video.</p></footer>
      </div>
    </main>
  );
}
