"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { queueInSpanish, speakInSpanish, stopSpeaking } from "@/lib/accessibility/speech";
import { createMediaPipeHandLoader } from "@/lib/input/mediapipe-hand-loader";
import { InputController } from "@/lib/input/controller";
import type { GameInput } from "@/lib/input/types";

const onboardingStorageKey = "mente-activa:onboarding-completed";
const speechPreferenceStorageKey = "mente-activa:speech-enabled";
const cameraAutostartStorageKey = "mente-activa:camera-autostart";
const initialSpeechQuestion = "¿QUIERES ACTIVAR EL LECTOR DE VOZ? EL LECTOR TE ACOMPAÑARÁ DURANTE LOS EJERCICIOS, LAS OPCIONES, LAS PISTAS Y LOS RESULTADOS.";
const onboardingNarration = "BIENVENIDA A MENTE ACTIVA. PRIMERO: ELIGE CÓMO RESPONDER. PUEDES USAR BOTONES GRANDES, EL TECLADO O GESTOS CON LA MANO. SEGUNDO: EL LECTOR DE VOZ TE ACOMPAÑARÁ. TERCERO: RESPONDE SIN PRISA. NO HAY PENALIZACIONES. CUANDO ESTÉS LISTO, ACTIVA EL BOTÓN ENTENDIDO, QUIERO COMENZAR.";
const homeNarration = "MENTE ACTIVA. EJERCICIOS CORTOS PARA PRACTICAR CON CALMA. ACTIVA EL BOTÓN COMENZAR A JUGAR PARA ENTRAR A LA ACTIVIDAD.";
const gameEntryNarration = "VAMOS A ENTRAR A LA SALA DE JUEGOS. EL CUIDADOR PREPARARÁ LA PARTIDA Y LOS PARTICIPANTES COMPARTIRÁN EL DISPOSITIVO.";

type InitialScreen = "speech" | "onboarding" | "home";

const onboardingSteps = [
  {
    number: "1",
    title: "ELIGE CÓMO RESPONDER",
    description: "PUEDES USAR BOTONES GRANDES, EL TECLADO O GESTOS CON LA MANO.",
  },
  {
    number: "2",
    title: "LEE O ESCUCHA",
    description: "EL LECTOR DE VOZ TE ACOMPAÑARÁ SI LO ACTIVAS.",
  },
  {
    number: "3",
    title: "RESPONDE SIN PRISA",
    description: "NO HAY PENALIZACIONES. JUEGA A TU PROPIO RITMO.",
  },
];

export default function Home() {
  const [initialScreen, setInitialScreen] = useState<InitialScreen>("speech");
  const [gestureCameraActive, setGestureCameraActive] = useState(false);
  const [gestureCycles, setGestureCycles] = useState(0);
  const [gestureStatus, setGestureStatus] = useState("INICIANDO CÁMARA PARA DETECTAR TUS GESTOS…");
  const [homeCameraStatus, setHomeCameraStatus] = useState("ACTIVA LA CÁMARA PARA USAR GESTOS EN ESTA PANTALLA.");
  const gesturePreviewRef = useRef<HTMLDivElement | null>(null);
  const homeGesturePreviewRef = useRef<HTMLDivElement | null>(null);
  const gameLinkRef = useRef<HTMLAnchorElement | null>(null);
  const gestureRuntimeRef = useRef<{ stop: () => void } | null>(null);
  const gestureSessionRef = useRef(0);
  const gestureCyclesRef = useRef(0);
  const fistClosedRef = useRef(false);
  const decisionTimerRef = useRef<number | null>(null);

  const stopGestureDetection = useCallback(() => {
    gestureSessionRef.current += 1;
    if (decisionTimerRef.current) {
      window.clearTimeout(decisionTimerRef.current);
      decisionTimerRef.current = null;
    }
    gestureRuntimeRef.current?.stop();
    gestureRuntimeRef.current = null;
    fistClosedRef.current = false;
    setGestureCameraActive(false);
  }, []);

  const continueAfterSpeechChoice = useCallback((enabled: boolean) => {
    stopGestureDetection();
    let nextScreen: Exclude<InitialScreen, "speech"> = "onboarding";
    try {
      window.localStorage.setItem(speechPreferenceStorageKey, String(enabled));
      nextScreen = window.localStorage.getItem(onboardingStorageKey) === "true" ? "home" : "onboarding";
    } catch {
      // SI NO SE PUEDE GUARDAR, SE MUESTRA LA BIENVENIDA EN ESTA SESIÓN.
    }
    setInitialScreen(nextScreen);

    if (enabled) {
      speakInSpanish("LECTOR ACTIVADO.");
      queueInSpanish(nextScreen === "onboarding" ? onboardingNarration : homeNarration);
    } else {
      stopSpeaking();
    }
  }, [stopGestureDetection]);

  const startGestureDetection = useCallback(() => {
    stopGestureDetection();
    const session = gestureSessionRef.current + 1;
    gestureSessionRef.current = session;
    fistClosedRef.current = false;
    gestureCyclesRef.current = 0;
    setGestureCycles(0);
    setGestureCameraActive(true);
    setGestureStatus("PERMITE EL USO DE LA CÁMARA. 1 PUÑO ES SÍ, 2 PUÑOS SON NO Y 3 PUÑOS REPITEN LA PREGUNTA.");

    const loader = createMediaPipeHandLoader({
      previewContainer: gesturePreviewRef.current,
      onReady: () => {
        if (gestureSessionRef.current !== session) {
          return;
        }
        try {
          window.localStorage.setItem(cameraAutostartStorageKey, "true");
        } catch {
          // LA CÁMARA PUEDE FUNCIONAR AUNQUE EL NAVEGADOR NO PERMITA GUARDAR LA PREFERENCIA.
        }
        const readyMessage = "CÁMARA ACTIVA. CIERRA Y ABRE EL PUÑO 1 VEZ PARA SÍ, 2 VECES PARA NO O 3 VECES PARA REPETIR LA PREGUNTA.";
        setGestureStatus(readyMessage);
        queueInSpanish(readyMessage);
      },
      onError: (error) => {
        if (gestureSessionRef.current !== session) {
          return;
        }
        const errorMessage = `NO SE PUDO USAR LA CÁMARA: ${error.message}. USA LOS BOTONES SÍ O NO.`;
        setGestureCameraActive(false);
        setGestureStatus(errorMessage);
        queueInSpanish(errorMessage);
      },
    });

    void loader().then(async (runtime) => {
      if (gestureSessionRef.current !== session) {
        runtime.stop();
        return;
      }
      gestureRuntimeRef.current = runtime;
      await runtime.start((signal) => {
        if (gestureSessionRef.current !== session || signal.type !== "gesture") {
          return;
        }
        if (signal.gesture === "closed") {
          fistClosedRef.current = true;
          return;
        }
        if (!fistClosedRef.current) {
          return;
        }

        fistClosedRef.current = false;
        const cycles = gestureCyclesRef.current + 1;
        gestureCyclesRef.current = cycles;
        setGestureCycles(cycles);
        if (decisionTimerRef.current) {
          window.clearTimeout(decisionTimerRef.current);
          decisionTimerRef.current = null;
        }
        if (cycles >= 3) {
          gestureCyclesRef.current = 0;
          setGestureCycles(0);
          speakInSpanish(initialSpeechQuestion);
          setGestureStatus("REPETIMOS LA PREGUNTA. 1 PUÑO ES SÍ Y 2 PUÑOS SON NO.");
          return;
        }
        const cycleMessage = `${cycles} PUÑO${cycles === 1 ? "" : "S"} DETECTADO${cycles === 1 ? "" : "S"}. PUEDES COMPLETAR LA SECUENCIA O ESPERAR.`;
        setGestureStatus(cycleMessage);
        queueInSpanish(cycleMessage);
        decisionTimerRef.current = window.setTimeout(() => continueAfterSpeechChoice(cycles === 1), 700);
      });
    }).catch((error: unknown) => {
      if (gestureSessionRef.current !== session) {
        return;
      }
      const message = error instanceof Error ? error.message : "NO SE PUDO INICIAR LA CÁMARA.";
      const errorMessage = `NO SE PUDO USAR LA CÁMARA: ${message}. USA LOS BOTONES SÍ O NO.`;
      setGestureCameraActive(false);
      setGestureStatus(errorMessage);
      queueInSpanish(errorMessage);
    });
  }, [continueAfterSpeechChoice, stopGestureDetection]);

  useEffect(() => {
    if (initialScreen !== "speech") {
      return;
    }
    const assistanceTimer = window.setTimeout(() => {
      speakInSpanish(initialSpeechQuestion);
      startGestureDetection();
    }, 0);
    return () => {
      window.clearTimeout(assistanceTimer);
      stopGestureDetection();
    };
  }, [initialScreen, startGestureDetection, stopGestureDetection]);

  function completeOnboarding() {
    let readerEnabled = false;
    try {
      window.localStorage.setItem(onboardingStorageKey, "true");
      readerEnabled = window.localStorage.getItem(speechPreferenceStorageKey) === "true";
    } catch {
      // LA BIENVENIDA SIGUE FUNCIONANDO SI EL NAVEGADOR NO PERMITE GUARDAR LA PREFERENCIA.
    }
    setInitialScreen("home");
    if (readerEnabled) {
      speakInSpanish(homeNarration);
    }
  }

  function announceGameEntry() {
    try {
      if (window.localStorage.getItem(speechPreferenceStorageKey) === "true") {
        speakInSpanish(gameEntryNarration);
      }
    } catch {
      // EL JUEGO SIGUE SIENDO ACCESIBLE CUANDO EL ALMACENAMIENTO LOCAL NO ESTÁ DISPONIBLE.
    }
  }

  useEffect(() => {
    if (initialScreen !== "home") {
      return;
    }
    const controller = new InputController({
      mode: "hand",
      handLoader: createMediaPipeHandLoader({
        previewContainer: homeGesturePreviewRef.current,
        onReady: () => setHomeCameraStatus("CÁMARA ACTIVA. 1 PUÑO: COMENZAR. 2 PUÑOS: BIENVENIDA. 3 PUÑOS: REPETIR."),
        onError: (error) => setHomeCameraStatus(`NO SE PUDO USAR LA CÁMARA: ${error.message}`),
      }),
      onHandError: (error) => setHomeCameraStatus(`NO SE PUDO USAR LA CÁMARA: ${error.message}`),
      onInput: (input: GameInput) => {
        if (input.type === "action") {
          gameLinkRef.current?.click();
        } else if (input.type === "secondary") {
          setInitialScreen("onboarding");
        } else if (input.type === "repeat") {
          speakInSpanish(homeNarration);
        }
      },
    });
    controller.start();
    return () => controller.stop();
  }, [initialScreen]);

  if (initialScreen === "speech") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-6 sm:px-8 sm:py-10">
        <section className="w-full max-w-3xl rounded-[var(--radius-card)] border-4 border-[var(--color-primary)] bg-[var(--color-surface)] p-6 text-center shadow-[var(--shadow-card)] sm:p-10" aria-labelledby="reader-question-title">
          <span aria-hidden="true" className="text-7xl sm:text-8xl">🔊</span>
          <p className="mt-5 text-xl font-bold text-[var(--color-primary)]">ANTES DE COMENZAR</p>
          <h1 id="reader-question-title" className="mt-2 text-4xl font-bold tracking-tight sm:text-6xl">¿QUIERES ACTIVAR EL LECTOR DE VOZ?</h1>
          <p className="mx-auto mt-5 max-w-2xl text-2xl font-semibold text-[var(--color-text-muted)] sm:text-3xl">
            EL LECTOR TE ACOMPAÑARÁ DURANTE LOS EJERCICIOS, LAS OPCIONES, LAS PISTAS Y LOS RESULTADOS.
          </p>
          <button type="button" onClick={() => speakInSpanish(initialSpeechQuestion)} className="mt-8 min-h-16 w-full rounded-2xl border-3 border-[var(--color-primary)] bg-white px-5 text-xl font-bold text-[var(--color-primary)]">
            REPETIR LA PREGUNTA
          </button>
          <section className="mt-4 rounded-2xl bg-[#fef3c7] p-4 text-[#78350f]" aria-label="ELECCIÓN POR GESTOS">
            <h2 className="text-xl font-bold">RESPONDER CON GESTOS</h2>
            <p className="mt-2 text-lg font-semibold">CIERRA Y ABRE EL PUÑO 1 VEZ PARA SÍ, 2 VECES PARA NO O 3 VECES PARA REPETIR LA PREGUNTA.</p>
            <p aria-live="polite" className="mt-3 font-bold">{gestureStatus}</p>
            {gestureCameraActive ? <p className="mt-2 font-bold">CICLOS DETECTADOS: {gestureCycles} DE 2</p> : null}
            <div ref={gesturePreviewRef} className="mt-4 aspect-[4/3] overflow-hidden rounded-xl bg-[#2b2118] text-center text-white">
              {!gestureCameraActive ? <p className="p-8">LA CÁMARA NO ESTÁ DISPONIBLE. USA LOS BOTONES.</p> : <p className="p-8">PREPARANDO LA CÁMARA…</p>}
            </div>
          </section>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => continueAfterSpeechChoice(true)} className="min-h-20 rounded-2xl bg-[var(--color-primary)] px-5 text-2xl font-bold text-white hover:bg-[var(--color-primary-hover)]">
              SÍ, ACTIVAR LECTOR
            </button>
            <button type="button" onClick={() => continueAfterSpeechChoice(false)} className="min-h-20 rounded-2xl border-3 border-[var(--color-primary)] bg-white px-5 text-2xl font-bold text-[var(--color-primary)]">
              NO, CONTINUAR SIN LECTOR
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (initialScreen === "onboarding") {
    return (
      <main className="min-h-screen px-4 py-6 sm:px-8 sm:py-10">
        <section className="mx-auto flex w-full max-w-4xl flex-col items-center rounded-[var(--radius-card)] border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center shadow-[var(--shadow-card)] sm:p-10">
          <span aria-hidden="true" className="text-7xl sm:text-8xl">🧠</span>
          <p className="mt-5 text-xl font-bold text-[var(--color-primary)]">BIENVENIDA</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-6xl">MENTE ACTIVA</h1>
          <p className="mt-5 max-w-2xl text-2xl font-semibold text-[var(--color-text-muted)] sm:text-3xl">VAMOS A PRACTICAR ATENCIÓN, MEMORIA Y ORIENTACIÓN CON CALMA.</p>
          <ol className="mt-8 grid w-full gap-4 text-left sm:grid-cols-3">
            {onboardingSteps.map((step) => (
              <li key={step.number} className="rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-2xl font-bold text-white">{step.number}</span>
                <h2 className="mt-4 text-xl font-bold">{step.title}</h2>
                <p className="mt-2 text-lg font-semibold text-[var(--color-text-muted)]">{step.description}</p>
              </li>
            ))}
          </ol>
          <button type="button" onClick={completeOnboarding} className="mt-8 min-h-20 w-full max-w-xl rounded-2xl bg-[var(--color-primary)] px-6 py-4 text-3xl font-bold text-white hover:bg-[var(--color-primary-hover)]">ENTENDIDO, QUIERO COMENZAR</button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="rounded-[var(--radius-card)] bg-[var(--color-surface)] px-5 py-8 text-center shadow-[var(--shadow-card)] sm:px-10 sm:py-12">
          <span aria-hidden="true" className="text-7xl sm:text-8xl">🧠</span>
          <p className="mt-5 text-xl font-bold text-[var(--color-primary)]">JUEGO DE ATENCIÓN Y MEMORIA</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-6xl">MENTE ACTIVA</h1>
          <p className="mx-auto mt-5 max-w-2xl text-2xl font-semibold text-[var(--color-text-muted)] sm:text-3xl">EJERCICIOS CORTOS PARA PRACTICAR CON CALMA.</p>
          <Link ref={gameLinkRef} href="/login" onClick={announceGameEntry} className="mt-8 flex min-h-20 w-full items-center justify-center rounded-2xl bg-[var(--color-primary)] px-6 py-4 text-center text-3xl font-bold text-white no-underline hover:bg-[var(--color-primary-hover)]">ENTRAR A LA SALA DE JUEGOS</Link>
          <section className="mt-5 rounded-2xl bg-[#fef3c7] p-4 text-[#78350f]" aria-label="CONTROLES POR GESTOS">
            <h2 className="text-xl font-bold">CONTROLES POR GESTOS</h2>
            <p className="mt-2 text-lg font-semibold">CIERRA Y ABRE EL PUÑO 1 VEZ PARA COMENZAR, 2 VECES PARA VER LA BIENVENIDA Y 3 VECES PARA REPETIR LAS INSTRUCCIONES.</p>
            <p aria-live="polite" className="mt-3 font-bold">{homeCameraStatus}</p>
            <div ref={homeGesturePreviewRef} className="mt-4 aspect-[4/3] overflow-hidden rounded-xl bg-[#2b2118] text-center text-white">
              <p className="p-8">PERMITE EL USO DE LA CÁMARA PARA ACTIVAR LOS GESTOS.</p>
            </div>
          </section>
        </header>
        <button type="button" onClick={() => setInitialScreen("onboarding")} className="min-h-16 rounded-2xl border-3 border-[var(--color-primary)] bg-[var(--color-surface)] px-5 text-xl font-bold text-[var(--color-primary)]">VER LA BIENVENIDA OTRA VEZ</button>
        <footer className="pb-3 text-center text-lg font-semibold text-[var(--color-text-muted)]">ACTIVIDAD RECREATIVA. ESTA PLATAFORMA NO REALIZA DIAGNÓSTICOS MÉDICOS.</footer>
      </div>
    </main>
  );
}
