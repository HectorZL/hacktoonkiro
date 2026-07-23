"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { InputController } from "@/lib/input/controller";
import { createMediaPipeHandLoader } from "@/lib/input/mediapipe-hand-loader";
import { queueInSpanish, speakInSpanish, stopSpeaking } from "@/lib/accessibility/speech";
import type { GameInput, InputMode } from "@/lib/input/types";
import {
  finishGameSession,
  getActivePlayer,
  startGameSession,
  type ActiveGameSession,
} from "@/lib/sessions/manager";

type Exercise = {
  area: string;
  title: string;
  icon: string;
  prompt: string;
  options: string[];
  correctOption: number;
  hint: string;
};

type SpeechSetupState = "loading" | "asking" | "ready";

const exercises: Exercise[] = [
  {
    area: "Atención sostenida",
    title: "¿Qué objeto no pertenece?",
    icon: "🍳",
    prompt: "Estamos en una cocina. Mira los objetos y elige el que no pertenece a este lugar.",
    options: ["Olla", "Cuchara", "Pelota"],
    correctOption: 2,
    hint: "En una cocina encontramos objetos para preparar comida.",
  },
  {
    area: "Memoria de trabajo",
    title: "Números al revés",
    icon: "🔢",
    prompt: "Recuerda 7 - 5 - 2. Ahora elige la misma serie al revés.",
    options: ["2 - 5 - 7", "7 - 5 - 2", "5 - 2 - 7"],
    correctOption: 0,
    hint: "Comienza por el último número que escuchaste.",
  },
  {
    area: "Memoria episódica",
    title: "La visita de Elena",
    icon: "📖",
    prompt: "Elena fue al parque con su nieto Mateo. Llevaron pan para los patos y después se sentaron junto al lago. ¿Qué llevaron al parque?",
    options: ["Pan para los patos", "Una pelota roja", "Un paraguas"],
    correctOption: 0,
    hint: "Piensa en los animales que estaban cerca del lago.",
  },
  {
    area: "Orientación",
    title: "El momento del día",
    icon: "☀️",
    prompt: "El sol acaba de salir y vamos a desayunar. ¿En qué momento del día estamos?",
    options: ["Por la mañana", "Por la noche", "A medianoche"],
    correctOption: 0,
    hint: "El desayuno suele ser al comenzar el día.",
  },
];

const cameraAutostartStorageKey = "mente-activa:camera-autostart";
const speechPreferenceStorageKey = "mente-activa:speech-enabled";
const readerQuestion = "¿QUIERES QUE EL LECTOR DE VOZ TE ACOMPAÑE DURANTE TODA LA ACTIVIDAD?";
const inputModes: Array<{ mode: InputMode; label: string }> = [
  { mode: "touch", label: "Botones grandes" },
  { mode: "keyboard", label: "Barra espaciadora" },
  { mode: "hand", label: "Dedos y puños" },
];

function exerciseSpeech(exercise: Exercise) {
  const options = exercise.options
    .map((option, index) => `Opción ${index + 1}: ${option}. Para elegir esta respuesta, muestra ${index + 1} ${index === 0 ? "dedo" : "dedos"}.`)
    .join(" ");
  return `Ejercicio de ${exercise.area}. ${exercise.title}. ${exercise.prompt} ${options} Para responder, muestra uno, dos o tres dedos según la opción que quieras elegir. La respuesta se enviará directamente. Haz dos puños para volver al inicio. Haz tres puños para repetir este ejercicio completo, sus opciones y estas instrucciones.`;
}

export default function MenteActivaPage() {
  const router = useRouter();
  const [mode, setMode] = useState<InputMode>("touch");
  const [started, setStarted] = useState(false);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [message, setMessage] = useState("ELIGE CÓMO QUIERES JUGAR Y TOCA COMENZAR.");
  const [completed, setCompleted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("CÁMARA APAGADA.");
  const [handGesture, setHandGesture] = useState<"open" | "closed" | null>(null);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [readerStatus, setReaderStatus] = useState("");
  const [speechSetupState, setSpeechSetupState] = useState<SpeechSetupState>("loading");
  const [consentCameraEnabled, setConsentCameraEnabled] = useState(false);
  const [consentGestureCycles, setConsentGestureCycles] = useState(0);
  const [consentStatus, setConsentStatus] = useState("ELIGE SÍ O NO. TAMBIÉN PUEDES USAR GESTOS.");
  const controllerRef = useRef<InputController | null>(null);
  const sessionRef = useRef<ActiveGameSession | null>(null);
  const exerciseIndexRef = useRef(0);
  const optionIndexRef = useRef(0);
  const startedRef = useRef(false);
  const completedRef = useRef(false);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const consentPreviewRef = useRef<HTMLDivElement | null>(null);
  const consentRuntimeRef = useRef<{ stop: () => void } | null>(null);
  const consentClosedRef = useRef(false);
  const consentCyclesRef = useRef(0);
  const consentDecisionTimerRef = useRef<number | null>(null);

  const speakIfEnabled = useCallback((text: string) => {
    if (!speechEnabled) {
      return;
    }
    const didStart = speakInSpanish(text);
    setReaderStatus(didStart ? "EL LECTOR ESTÁ LEYENDO EL EJERCICIO." : "EL NAVEGADOR NO PERMITE USAR EL LECTOR DE VOZ.");
  }, [speechEnabled]);

  const stopConsentGestures = useCallback(() => {
    if (consentDecisionTimerRef.current) {
      window.clearTimeout(consentDecisionTimerRef.current);
      consentDecisionTimerRef.current = null;
    }
    consentRuntimeRef.current?.stop();
    consentRuntimeRef.current = null;
    consentClosedRef.current = false;
    setConsentCameraEnabled(false);
  }, []);

  const saveSpeechPreference = useCallback((enabled: boolean) => {
    stopConsentGestures();
    setSpeechEnabled(enabled);
    setSpeechSetupState("ready");
    try {
      window.localStorage.setItem(speechPreferenceStorageKey, String(enabled));
    } catch {
      // LA ACTIVIDAD SIGUE FUNCIONANDO SI EL NAVEGADOR NO PERMITE GUARDAR LA PREFERENCIA.
    }
    if (enabled) {
      speakInSpanish("LECTOR ACTIVADO. LEERÉ LAS INSTRUCCIONES Y LOS CAMBIOS IMPORTANTES DE LA ACTIVIDAD.");
    } else {
      stopSpeaking();
    }
  }, [stopConsentGestures]);

  const handleHandError = useCallback((error: Error) => {
    try {
      window.localStorage.removeItem(cameraAutostartStorageKey);
    } catch {
      // NO INTERRUMPIR LA ACTIVIDAD SI EL ALMACENAMIENTO LOCAL FALLA.
    }
    const errorMessage = `NO SE PUDO USAR LA CÁMARA: ${error.message}`;
    setCameraEnabled(false);
    setCameraReady(false);
    setHandGesture(null);
    setCameraStatus(errorMessage);
    speakIfEnabled(errorMessage);
  }, [speakIfEnabled]);

  const handleCameraReady = useCallback(() => {
    try {
      window.localStorage.setItem(cameraAutostartStorageKey, "true");
    } catch {
      // LA CÁMARA PUEDE USARSE AUNQUE NO SE PUEDA RECORDAR LA PREFERENCIA.
    }
    const readyMessage = "CÁMARA ACTIVA. MUESTRA 1, 2 O 3 DEDOS PARA RESPONDER; USA 1, 2 O 3 PUÑOS PARA LAS ACCIONES.";
    setCameraReady(true);
    setCameraStatus(readyMessage);
    speakIfEnabled(readyMessage);
  }, [speakIfEnabled]);

  const handleGestureProgress = useCallback((progress: { gesture: "open" | "closed" | null }) => {
    setHandGesture(progress.gesture);
  }, []);

  useEffect(() => {
    const preferenceTimer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(speechPreferenceStorageKey);
        if (stored === "true" || stored === "false") {
          setSpeechEnabled(stored === "true");
          setSpeechSetupState("ready");
          return;
        }
      } catch {
        // SI NO HAY PREFERENCIA DISPONIBLE, SE MUESTRA LA PREGUNTA COMO ALTERNATIVA.
      }
      setSpeechSetupState("asking");
    }, 0);

    return () => window.clearTimeout(preferenceTimer);
  }, []);

  useEffect(() => {
    if (speechSetupState !== "ready") {
      return;
    }
    try {
      if (window.localStorage.getItem(cameraAutostartStorageKey) !== "true") {
        return;
      }
    } catch {
      return;
    }
    const autoStartId = window.setTimeout(() => {
      setMode("hand");
      setCameraEnabled(true);
      setCameraStatus("INICIANDO LA CÁMARA RECORDADA…");
    }, 0);
    return () => window.clearTimeout(autoStartId);
  }, [speechSetupState]);

  useEffect(() => {
    return () => stopConsentGestures();
  }, [stopConsentGestures]);

  const finishCurrentSession = useCallback(() => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (session) {
      void finishGameSession(session);
    }
  }, []);

  useEffect(() => {
    return () => {
      stopSpeaking();
      finishCurrentSession();
    };
  }, [finishCurrentSession]);

  const startActivity = useCallback(() => {
    if (mode === "hand" && !cameraReady) {
      const notice = "ESPERA A QUE LA CÁMARA ESTÉ LISTA ANTES DE COMENZAR.";
      setCameraStatus(notice);
      speakIfEnabled(notice);
      return;
    }
    finishCurrentSession();
    sessionRef.current = startGameSession({
      player: getActivePlayer(),
      gameKey: "mente-activa",
      inputMode: mode,
      assistanceLevel: "guided",
    });
    exerciseIndexRef.current = 0;
    optionIndexRef.current = 0;
    startedRef.current = true;
    completedRef.current = false;
    setExerciseIndex(0);
    setCorrectAnswers(0);
    setStarted(true);
    setCompleted(false);
    setMessage("MIRA LA PRIMERA OPCIÓN. PUEDES RESPONDER SIN PRISA.");
    speakIfEnabled(exerciseSpeech(exercises[0]));
  }, [cameraReady, finishCurrentSession, mode, speakIfEnabled]);

  useEffect(() => {
    if (speechSetupState !== "ready" || !speechEnabled || started || completed) {
      return;
    }
    const startId = window.setTimeout(() => startActivity(), 0);
    return () => window.clearTimeout(startId);
  }, [completed, speechEnabled, speechSetupState, startActivity, started]);

  const confirmAnswer = useCallback((selectedOptionIndex = optionIndexRef.current) => {
    if (!startedRef.current || completedRef.current) {
      return;
    }

    const currentExercise = exercises[exerciseIndexRef.current];
    const wasCorrect = selectedOptionIndex === currentExercise.correctOption;
    if (wasCorrect) {
      setCorrectAnswers((current) => current + 1);
    }

    const nextExercise = exerciseIndexRef.current + 1;
    if (nextExercise >= exercises.length) {
      const completionMessage = wasCorrect
        ? "¡MUY BIEN! TERMINASTE LA ACTIVIDAD."
        : "TERMINASTE LA ACTIVIDAD. GRACIAS POR INTENTARLO.";
      completedRef.current = true;
      setCompleted(true);
      setMessage(completionMessage);
      finishCurrentSession();
      speakIfEnabled(`${completionMessage} RESPUESTAS ACERTADAS: ${correctAnswers + Number(wasCorrect)} DE ${exercises.length}.`);
      return;
    }

    exerciseIndexRef.current = nextExercise;
    optionIndexRef.current = 0;
    setExerciseIndex(nextExercise);
    const transitionMessage = wasCorrect
      ? "¡MUY BIEN! PASAMOS AL SIGUIENTE EJERCICIO."
      : "GRACIAS POR RESPONDER. PASAMOS AL SIGUIENTE EJERCICIO.";
    setMessage(transitionMessage);
    speakIfEnabled(`${transitionMessage} ${exerciseSpeech(exercises[nextExercise])}`);
  }, [correctAnswers, finishCurrentSession, speakIfEnabled]);

  const repeatHint = useCallback(() => {
    if (!startedRef.current || completedRef.current) {
      return;
    }
    const currentExercise = exercises[exerciseIndexRef.current];
    const repeatMessage = "REPETIMOS EL EJERCICIO, LAS OPCIONES Y LAS ACCIONES PARA RESPONDER.";
    setMessage(repeatMessage);
    speakIfEnabled(`${repeatMessage} ${exerciseSpeech(currentExercise)}`);
  }, [speakIfEnabled]);

  useEffect(() => {
    const handLoader =
      mode === "hand" && cameraEnabled
        ? createMediaPipeHandLoader({
            previewContainer: previewContainerRef.current,
            onReady: handleCameraReady,
            onError: handleHandError,
            onGestureProgress: handleGestureProgress,
          })
        : undefined;
    const controller = new InputController({
      mode,
      cooldownMs: 350,
      handGestureMode: "cycles",
      handLoader,
      onHandError: handleHandError,
      onInput: (input: GameInput) => {
        if (input.type === "option") {
          const selectedOption = input.option - 1;
          optionIndexRef.current = selectedOption;
          confirmAnswer(selectedOption);
        } else if (input.type === "action") {
          confirmAnswer();
        } else if (input.type === "secondary") {
          router.back();
        } else if (input.type === "repeat") {
          repeatHint();
        }
      },
      isActionEnabled: () => startedRef.current && !completedRef.current,
    });
    controllerRef.current = controller;
    controller.start();
    return () => {
      controller.stop();
      controllerRef.current = null;
    };
  }, [cameraEnabled, confirmAnswer, handleCameraReady, handleGestureProgress, handleHandError, mode, repeatHint, router]);

  const startConsentGestures = useCallback(() => {
    stopConsentGestures();
    consentCyclesRef.current = 0;
    consentClosedRef.current = false;
    setConsentGestureCycles(0);
    setConsentStatus("PERMITE EL USO DE LA CÁMARA. CIERRA Y ABRE EL PUÑO DOS VECES PARA SÍ O UNA VEZ PARA NO.");
    setConsentCameraEnabled(true);

    const loader = createMediaPipeHandLoader({
      previewContainer: consentPreviewRef.current,
      onReady: () => {
        const readyMessage = "CÁMARA ACTIVA. CIERRA Y ABRE EL PUÑO DOS VECES PARA SÍ. HAZLO UNA VEZ Y ESPERA UN MOMENTO PARA NO.";
        setConsentStatus(readyMessage);
        queueInSpanish(readyMessage);
      },
      onError: (error) => {
        const errorMessage = `NO SE PUDO USAR LA CÁMARA: ${error.message}. USA LOS BOTONES SÍ O NO.`;
        setConsentCameraEnabled(false);
        setConsentStatus(errorMessage);
        queueInSpanish(errorMessage);
      },
    });

    void loader().then(async (runtime) => {
      consentRuntimeRef.current = runtime;
      await runtime.start((signal) => {
        if (signal.type !== "gesture") {
          return;
        }
        if (signal.gesture === "closed") {
          consentClosedRef.current = true;
          return;
        }
        if (!consentClosedRef.current) {
          return;
        }
        consentClosedRef.current = false;
        const cycles = consentCyclesRef.current + 1;
        consentCyclesRef.current = cycles;
        setConsentGestureCycles(cycles);
        if (consentDecisionTimerRef.current) {
          window.clearTimeout(consentDecisionTimerRef.current);
          consentDecisionTimerRef.current = null;
        }
        if (cycles >= 2) {
          saveSpeechPreference(true);
          return;
        }
        const cycleMessage = "UN CICLO DETECTADO. CIERRA Y ABRE UNA VEZ MÁS PARA SÍ; SI ESPERAS UN MOMENTO, SERÁ NO.";
        setConsentStatus(cycleMessage);
        queueInSpanish(cycleMessage);
        consentDecisionTimerRef.current = window.setTimeout(() => saveSpeechPreference(false), 1300);
      });
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "NO SE PUDO INICIAR LA CÁMARA.";
      const errorMessage = `NO SE PUDO USAR LA CÁMARA: ${message}. USA LOS BOTONES SÍ O NO.`;
      setConsentCameraEnabled(false);
      setConsentStatus(errorMessage);
      queueInSpanish(errorMessage);
    });
  }, [saveSpeechPreference, stopConsentGestures]);

  const resetSpeechPreference = useCallback(() => {
    stopSpeaking();
    try {
      window.localStorage.removeItem(speechPreferenceStorageKey);
    } catch {
      // LA PREGUNTA PUEDE VOLVER A MOSTRARSE AUNQUE NO SE PUEDA BORRAR LA PREFERENCIA.
    }
    setSpeechEnabled(false);
    setSpeechSetupState("asking");
    setConsentStatus("ELIGE SÍ O NO. TAMBIÉN PUEDES USAR GESTOS.");
  }, []);

  const exercise = exercises[exerciseIndex];
  const progress = Math.round(((completed ? exercises.length : exerciseIndex) / exercises.length) * 100);
  const gestureLabel =
    handGesture === "closed"
      ? "PUÑO DETECTADO: 1 ACTIVA, 2 REGRESAN Y 3 REPITEN LA PISTA"
      : handGesture === "open"
        ? "MUESTRA 1, 2 O 3 DEDOS PARA RESPONDER"
        : "MUESTRA 1, 2 O 3 DEDOS O HAZ UN GESTO DE PUÑO";

  function readCurrentExercise() {
    speakIfEnabled(exerciseSpeech(exercise));
  }

  function activateGameCamera() {
    setCameraReady(false);
    setHandGesture(null);
    setCameraStatus("SOLICITANDO PERMISO Y CARGANDO EL MODELO LIGERO…");
    setCameraEnabled(true);
  }

  if (speechSetupState === "loading") {
    return <main className="min-h-screen" aria-busy="true" />;
  }

  return (
    <main className="min-h-[100dvh] p-3 sm:p-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link className="w-fit rounded-xl border-3 border-[var(--color-primary)] bg-[var(--color-surface)] px-4 py-2 font-bold text-[var(--color-primary)] no-underline" href="/">
            ← VOLVER AL INICIO
          </Link>
          <p className="rounded-xl bg-[var(--color-surface-muted)] px-4 py-2 font-bold">ACTIVIDAD RECREATIVA, NO ES UNA PRUEBA MÉDICA</p>
        </header>

        <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] sm:p-8">
          <p className="font-bold text-[var(--color-primary)]">MENTE ACTIVA</p>
          <h1 className="mt-1 text-4xl font-bold tracking-tight sm:text-5xl">ATENCIÓN, MEMORIA Y ORIENTACIÓN</h1>
          <p className="mt-3 max-w-3xl text-xl text-[var(--color-text-muted)]">CUATRO EJERCICIOS CORTOS PARA PRACTICAR CON CALMA. NO HAY PENALIZACIONES.</p>

          {speechSetupState === "asking" ? (
            <section className="mt-6 rounded-3xl border-4 border-[var(--color-primary)] bg-[#e0f2fe] p-5 sm:p-8" aria-labelledby="reader-question-title">
              <p className="text-xl font-bold text-[var(--color-primary)]">PREFERENCIA DE ACCESIBILIDAD</p>
              <h2 id="reader-question-title" className="mt-2 text-3xl font-bold">¿QUIERES ACTIVAR EL LECTOR DE VOZ?</h2>
              <p className="mt-3 text-xl font-semibold">SI DICES SÍ, EL LECTOR ACOMPAÑARÁ TODAS LAS INSTRUCCIONES, OPCIONES, PISTAS Y RESULTADOS DEL JUEGO.</p>
              <button type="button" onClick={() => speakInSpanish(readerQuestion)} className="mt-5 min-h-16 w-full rounded-2xl border-3 border-[var(--color-primary)] bg-white px-5 text-xl font-bold text-[var(--color-primary)]">
                ESCUCHAR LA PREGUNTA
              </button>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => saveSpeechPreference(true)} className="min-h-20 rounded-2xl bg-[var(--color-primary)] px-5 text-2xl font-bold text-white hover:bg-[var(--color-primary-hover)]">SÍ, ACTIVAR LECTOR</button>
                <button type="button" onClick={() => saveSpeechPreference(false)} className="min-h-20 rounded-2xl border-3 border-[var(--color-primary)] bg-white px-5 text-2xl font-bold text-[var(--color-primary)]">NO, CONTINUAR SIN LECTOR</button>
              </div>
              <div className="mt-5 rounded-2xl bg-[#fef3c7] p-4 text-[#78350f]">
                <h3 className="text-xl font-bold">ELEGIR CON GESTOS</h3>
                <p className="mt-2 text-lg font-semibold">CIERRA Y ABRE EL PUÑO DOS VECES SEGUIDAS PARA SÍ. HAZLO UNA VEZ Y ESPERA UN MOMENTO PARA NO.</p>
                <button type="button" onClick={startConsentGestures} disabled={consentCameraEnabled} className="mt-4 min-h-16 w-full rounded-2xl bg-[#78350f] px-5 text-xl font-bold text-white disabled:opacity-60">
                  {consentCameraEnabled ? "CÁMARA ACTIVÁNDOSE…" : "ACTIVAR CÁMARA PARA GESTOS"}
                </button>
                <p aria-live="polite" className="mt-3 font-bold">{consentStatus}</p>
                {consentCameraEnabled ? <p className="mt-2 font-bold">CICLOS DETECTADOS: {consentGestureCycles} DE 2</p> : null}
                <div ref={consentPreviewRef} className="mt-4 aspect-[4/3] overflow-hidden rounded-xl bg-[#2b2118] text-center text-white">
                  {!consentCameraEnabled ? <p className="p-8">ACTIVA LA CÁMARA PARA VERTE AQUÍ.</p> : null}
                </div>
              </div>
            </section>
          ) : (
            <div className={mode === "hand" ? "mt-6 sm:grid sm:grid-cols-[minmax(0,1fr)_20rem] sm:items-start sm:gap-6" : "mt-6"}>
              <div>
                <div className="flex flex-wrap gap-3">
                  {!speechEnabled ? <button type="button" onClick={resetSpeechPreference} className="min-h-14 rounded-xl border-3 border-[var(--color-primary)] bg-white px-5 text-lg font-bold text-[var(--color-primary)]">ACTIVAR LECTOR</button> : null}
                  {speechEnabled ? <button type="button" onClick={readCurrentExercise} className="min-h-14 rounded-xl border-3 border-[#6d28d9] bg-white px-5 text-lg font-bold text-[#6d28d9]">REPETIR LECTURA</button> : null}
                </div>
                {speechEnabled && readerStatus ? <p role="status" className="mt-3 font-bold text-[#5b21b6]">{readerStatus}</p> : null}
                {(!started && !speechEnabled) || completed ? (
                  <div className="mt-6">
                    <fieldset>
                      <legend className="text-2xl font-bold">¿CÓMO QUIERES RESPONDER?</legend>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        {inputModes.map((inputMode) => (
                          <button key={inputMode.mode} type="button" aria-pressed={mode === inputMode.mode} onClick={() => { setMode(inputMode.mode); if (inputMode.mode !== "hand") { setCameraEnabled(false); setCameraReady(false); setCameraStatus("CÁMARA APAGADA."); } }} className={`min-h-16 rounded-2xl border-3 px-4 text-left text-lg font-bold ${mode === inputMode.mode ? "border-[var(--color-primary)] bg-[#e0f2fe]" : "border-[var(--color-border)] bg-white"}`}>
                            {inputMode.label}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    {mode === "hand" ? (
                      <div className="mt-4 rounded-xl bg-[#fef3c7] p-4 text-[#78350f]">
                        <p className="font-bold">MUESTRA 1, 2 O 3 DEDOS PARA ELEGIR DIRECTAMENTE LA OPCIÓN 1, 2 O 3. CIERRA Y ABRE EL PUÑO 1 VEZ PARA ACTIVAR LA ACCIÓN PRINCIPAL, 2 VECES PARA VOLVER Y 3 VECES PARA REPETIR.</p>
                        <p className="mt-2 text-base">LA IMAGEN DE CÁMARA NO SE ENVÍA AL SERVIDOR.</p>
                        <button type="button" onClick={activateGameCamera} disabled={cameraEnabled} className="mt-4 min-h-14 w-full rounded-xl bg-[#78350f] px-5 py-2 text-xl font-bold text-white disabled:opacity-60">
                          {cameraEnabled ? "CÁMARA ACTIVÁNDOSE…" : "ACTIVAR CÁMARA PARA GESTOS"}
                        </button>
                        <p aria-live="polite" className="mt-3 font-bold">{cameraStatus}</p>
                      </div>
                    ) : null}
                    <button type="button" onClick={startActivity} className="mt-6 min-h-16 w-full rounded-2xl bg-[var(--color-primary)] px-6 py-3 text-2xl font-bold text-white hover:bg-[var(--color-primary-hover)]">
                      {completed ? "JUGAR OTRA VEZ" : "COMENZAR"}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                      <p className="rounded-full bg-[#ede9fe] px-4 py-2 text-lg font-bold text-[#5b21b6]">{exercise.area}</p>
                      <p className="font-bold">EJERCICIO {exerciseIndex + 1} DE {exercises.length}</p>
                    </div>
                    <div className="mt-3 h-4 overflow-hidden rounded-full bg-[var(--color-surface-muted)]" role="progressbar" aria-label="PROGRESO DE LA ACTIVIDAD" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                      <div className="h-full bg-[#6d28d9] transition-[width]" style={{ width: `${progress}%` }} />
                    </div>
                    <article className="mt-6 rounded-3xl border-4 border-[#c4b5fd] bg-[#faf5ff] p-5 text-center sm:p-8">
                      <span aria-hidden="true" className="text-7xl">{exercise.icon}</span>
                      <h2 className="mt-3 text-3xl font-bold">{exercise.title}</h2>
                      <p className="mx-auto mt-4 max-w-2xl text-2xl leading-relaxed">{exercise.prompt}</p>
                    </article>
                    <section className="mt-5" aria-label="OPCIONES DE RESPUESTA">
                      <p className="text-center text-xl font-bold">ELIGE TU RESPUESTA</p>
                      <div className="mt-3 grid gap-3">
                        {exercise.options.map((option, index) => (
                          <button key={option} type="button" onClick={() => confirmAnswer(index)} className="min-h-20 w-full rounded-3xl border-4 border-[var(--color-primary)] bg-white px-6 py-4 text-2xl font-bold text-[var(--color-primary)]">
                            OPCIÓN {index + 1}: {option}{mode === "hand" ? ` — ${index + 1} DEDO${index === 0 ? "" : "S"}` : ""}
                          </button>
                        ))}
                      </div>
                      <button type="button" onClick={repeatHint} className="mt-3 min-h-14 w-full rounded-2xl border-3 border-[#6d28d9] bg-white px-5 text-xl font-bold text-[#6d28d9]">REPETIR EJERCICIO E INSTRUCCIONES — 3 PUÑOS</button>
                    </section>
                  </>
                )}
                <p aria-live="polite" aria-atomic="true" className="mt-5 rounded-xl bg-[var(--color-surface-muted)] p-4 text-center text-lg font-bold">{message}</p>
                {completed ? <p className="mt-4 text-center text-xl font-bold text-[var(--color-success)]">RESPUESTAS ACERTADAS: {correctAnswers} DE {exercises.length}</p> : null}
              </div>
              {mode === "hand" ? (
                <aside className="mt-5 self-start rounded-2xl border-3 border-[#78350f] bg-[#fff7ed] p-3 shadow-lg sm:mt-0" aria-label="VISTA DE CÁMARA Y GESTO">
                  <h2 className="text-center text-xl font-bold text-[#78350f]">TU CÁMARA</h2>
                  <div className="relative mt-2 aspect-[4/3] overflow-hidden rounded-xl bg-[#2b2118]">
                    <div ref={previewContainerRef} className="h-full w-full text-center text-base text-white">{!cameraEnabled ? <p className="p-8">ACTIVA LA CÁMARA PARA VERTE AQUÍ.</p> : null}</div>
                    <div className="absolute inset-x-2 bottom-2 rounded-lg bg-black/75 p-2 text-center text-sm font-bold text-white">
                      <p>{gestureLabel}</p>
                      <p className="mt-1 text-xs">CIERRA Y ABRE EL PUÑO EN SECUENCIAS RÁPIDAS PARA CONTARLO.</p>
                    </div>
                  </div>
                  <p className="mt-2 text-center text-sm font-bold text-[#78350f]">LA IMAGEN SE PROCESA SOLO EN ESTE DISPOSITIVO.</p>
                </aside>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
