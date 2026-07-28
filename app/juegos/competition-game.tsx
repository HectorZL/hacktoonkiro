"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioManager, type AudioAlert } from "@/lib/audio/manager";
import { isSpeechSupported, queueInSpanish, speakInSpanish, stopSpeaking } from "@/lib/accessibility/speech";
import {
  clearCompetitionSetup,
  readCompetitionSetup,
  saveCompetitionResult,
} from "@/lib/competition/manager";
import {
  competitionGameMeta,
  fallbackTriviaQuestions,
  type CompetitionGameKey,
  type CompetitionPlayer,
  type CompetitionSetup,
  type TriviaQuestion,
} from "@/lib/competition/types";

const animalPrompts = [
  "Un elefante que camina con pasos muy pesados",
  "Un gato que se estira y se limpia las patas",
  "Un perro que acaba de encontrar su juguete",
  "Un mono que come una banana",
  "Un gallo que despierta a todo el vecindario",
  "Una tortuga que avanza muy despacio",
  "Un caballo que corre por el campo",
  "Un loro que repite una palabra",
  "Un pez que nada bajo el agua",
  "Una mariposa que vuela entre las flores",
];

const charadePrompts = [
  "Preparar una sopa para la familia",
  "Barrer la casa con mucho cuidado",
  "Buscar los lentes que se perdieron",
  "Regar las plantas del jardín",
  "Bailar una canción alegre",
  "Pescar junto a un río",
  "Abrir un regalo inesperado",
  "Tomar una fotografía familiar",
  "Caminar bajo la lluvia",
  "Inflar un globo para una fiesta",
];

const impostorWords = [
  "mercado",
  "playa",
  "cocina",
  "montaña",
  "fiesta",
  "familia",
  "jardín",
  "escuela",
  "música",
  "viaje",
];

const speechPreferenceStorageKey = "mente-activa:speech-enabled";

type GamePhase = "loading" | "missing" | "handoff" | "secret" | "playing" | "vote" | "result" | "finished";
type ImpostorOutcome = "team" | "impostor" | null;

type CompetitionGameProps = {
  gameKey: CompetitionGameKey;
};

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function getFallbackQuestion(index: number) {
  return fallbackTriviaQuestions[index % fallbackTriviaQuestions.length];
}

function addPoint(scores: Record<string, number>, playerId: string, points: number) {
  return {
    ...scores,
    [playerId]: (scores[playerId] ?? 0) + points,
  };
}

function getWinner(players: CompetitionPlayer[], scores: Record<string, number>) {
  return [...players].sort((first, second) => (scores[second.id] ?? 0) - (scores[first.id] ?? 0))[0];
}

export default function CompetitionGame({ gameKey }: CompetitionGameProps) {
  const [setup, setSetup] = useState<CompetitionSetup | null>(null);
  const [phase, setPhase] = useState<GamePhase>("loading");
  const [round, setRound] = useState(0);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(60);
  const [selectedTriviaOption, setSelectedTriviaOption] = useState<number | null>(null);
  const [triviaCorrect, setTriviaCorrect] = useState<boolean | null>(null);
  const [impostorOutcome, setImpostorOutcome] = useState<ImpostorOutcome>(null);
  const [triviaQuestions, setTriviaQuestions] = useState<TriviaQuestion[]>([]);
  const [triviaLoading, setTriviaLoading] = useState(false);
  const [outcome, setOutcome] = useState("");
  const [saveStatus, setSaveStatus] = useState("Preparando el resultado final…");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [speechReady, setSpeechReady] = useState(false);
  const audioRef = useRef<AudioManager | null>(null);
  const saveStartedRef = useRef(false);
  const outcomeAnnouncementRef = useRef("");
  const winnerAnnouncementRef = useRef("");

  const game = competitionGameMeta[gameKey];
  const currentPlayer = setup?.players[playerIndex] ?? null;
  const currentChallengeIndex = setup ? round * setup.players.length + playerIndex : 0;
  const currentQuestion = useMemo(
    () => triviaQuestions[currentChallengeIndex] ?? getFallbackQuestion(currentChallengeIndex),
    [currentChallengeIndex, triviaQuestions],
  );
  const impostorIndex = setup ? (round * 7 + 1) % setup.players.length : 0;
  const impostorPlayer = setup?.players[impostorIndex] ?? null;
  const impostorWord = impostorWords[round % impostorWords.length];
  const currentAnimal = animalPrompts[currentChallengeIndex % animalPrompts.length];
  const currentCharade = charadePrompts[currentChallengeIndex % charadePrompts.length];
  const winner = setup ? getWinner(setup.players, scores) : null;
  const resultCelebration = impostorOutcome === "team"
    ? {
        icon: "🎉🔎🏆",
        title: "¡El equipo encontró al impostor!",
        message: "La partida termina con una victoria del equipo.",
      }
    : impostorOutcome === "impostor"
      ? {
          icon: "🕵️🏆✨",
          title: "¡El impostor sobrevivió!",
          message: "El impostor gana al mantenerse oculto hasta la última ronda.",
        }
      : triviaCorrect === true
        ? {
            icon: "🌟😊✨",
            title: "¡Respuesta genial!",
            message: "Tu respuesta fue correcta. ¡Sigue así!",
          }
        : triviaCorrect === false
          ? {
              icon: "💛🙂🌈",
              title: "¡Buen intento!",
              message: "Cada respuesta nos ayuda a aprender. ¡Vamos con la siguiente!",
            }
          : {
              icon: "👏😊🎉",
              title: "¡Buen trabajo, equipo!",
              message: "La diversión continúa en el próximo turno.",
            };

  const playSound = useCallback((alert: AudioAlert) => {
    if (!soundEnabled) {
      return;
    }
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.setEnabled(true);
    audio.play(alert);
  }, [soundEnabled]);

  const announce = useCallback((text: string, queue = false) => {
    if (!speechEnabled || !isSpeechSupported()) {
      return;
    }
    if (queue) {
      queueInSpanish(text);
    } else {
      speakInSpanish(text);
    }
  }, [speechEnabled]);

  useEffect(() => {
    const audio = new AudioManager();
    audioRef.current = audio;
    return () => {
      audio.dispose();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    const activeGamePhases: GamePhase[] = ["handoff", "secret", "playing", "vote", "result"];

    if (audio && setup && soundEnabled && musicEnabled && activeGamePhases.includes(phase)) {
      audio.setEnabled(true);
      audio.startMusic();
    } else {
      audio?.stopMusic();
    }
  }, [musicEnabled, phase, setup, soundEnabled]);

  useEffect(() => {
    const preferenceTimer = window.setTimeout(() => {
      let enabled = true;
      try {
        const storedPreference = window.localStorage.getItem(speechPreferenceStorageKey);
        enabled = storedPreference === null || storedPreference === "true";
      } catch {
        // La voz queda activada por defecto si el navegador bloquea el almacenamiento.
      }
      setSpeechEnabled(enabled);
      setSpeechReady(true);
    }, 0);
    return () => window.clearTimeout(preferenceTimer);
  }, []);

  useEffect(() => {
    if (!speechReady || !speechEnabled || phase !== "handoff" || !currentPlayer) {
      return;
    }
    const announcementTimer = window.setTimeout(() => {
      announce(`Turno de ${currentPlayer.name}. Pasa el dispositivo.`, true);
    }, 0);
    return () => window.clearTimeout(announcementTimer);
  }, [announce, currentPlayer, phase, speechEnabled, speechReady]);

  useEffect(() => {
    if (!speechReady || !speechEnabled || phase !== "result" || !outcome) {
      return;
    }
    const outcomeKey = `${setup?.id ?? "partida"}-${round}-${playerIndex}-${outcome}`;
    if (outcomeAnnouncementRef.current === outcomeKey) {
      return;
    }
    outcomeAnnouncementRef.current = outcomeKey;
    const announcementTimer = window.setTimeout(() => {
      announce(outcome);
    }, 0);
    return () => window.clearTimeout(announcementTimer);
  }, [announce, outcome, phase, playerIndex, round, setup?.id, speechEnabled, speechReady]);

  useEffect(() => {
    if (!setup || !winner || phase !== "finished") {
      return;
    }
    const winnerKey = `${setup.id}-${winner.id}-${gameKey}-${impostorOutcome ?? "standard"}`;
    if (winnerAnnouncementRef.current === winnerKey) {
      return;
    }
    winnerAnnouncementRef.current = winnerKey;
    playSound("winner");
    const announcementTimer = window.setTimeout(() => {
      const announcement = gameKey === "impostor"
        ? impostorOutcome === "team"
          ? "¡El equipo ganó! Encontraron al impostor."
          : "¡El impostor ganó! Se mantuvo oculto hasta el final."
        : `Ganó ${winner.name} en el juego de ${game.title}.`;
      announce(announcement);
    }, 0);
    return () => window.clearTimeout(announcementTimer);
  }, [announce, game.title, gameKey, impostorOutcome, phase, playSound, setup, winner]);

  useEffect(() => {
    let active = true;
    const setupTimer = window.setTimeout(() => {
      const storedSetup = readCompetitionSetup();
      if (!storedSetup || storedSetup.gameKey !== gameKey || storedSetup.players.length < 2) {
        setPhase("missing");
        return;
      }

      setSetup(storedSetup);
      setScores(Object.fromEntries(storedSetup.players.map((player) => [player.id, 0])));
      setImpostorOutcome(null);
      setTimeLeft(storedSetup.secondsPerTurn);
      setPhase("handoff");

      if (gameKey !== "trivia-ecuador") {
        return;
      }

      setTriviaLoading(true);
      void fetch("/api/trivia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rounds: storedSetup.rounds,
          players: storedSetup.players.length,
          difficulty: "intermedia",
          category: "variada de Ecuador",
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error("No se pudo cargar la trivia.");
          }
          return (await response.json()) as { questions?: TriviaQuestion[] };
        })
        .then((data) => {
          if (active && Array.isArray(data.questions) && data.questions.length > 0) {
            setTriviaQuestions(data.questions);
          }
        })
        .catch(() => {
          // La actividad conserva las preguntas locales si la API no está disponible.
        })
        .finally(() => {
          if (active) {
            setTriviaLoading(false);
          }
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(setupTimer);
    };
  }, [gameKey]);

  useEffect(() => {
    const usesRoundTimer = gameKey === "animales" || gameKey === "charadas" || gameKey === "impostor";
    if (phase !== "playing" || !setup || !usesRoundTimer) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (timeLeft <= 1) {
        setTimeLeft(0);
        if (gameKey === "impostor") {
          playSound("turn");
          setOutcome("El minuto de pistas terminó. Ahora el grupo debe votar por una persona.");
          setPhase("vote");
        } else {
          playSound("incorrect");
          setOutcome("Se terminó el tiempo. Puedes continuar con la siguiente ronda.");
          setPhase("result");
        }
      } else {
        playSound("tick");
        setTimeLeft(timeLeft - 1);
      }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [gameKey, phase, playSound, setup, timeLeft]);

  useEffect(() => {
    if (phase !== "finished" || !setup || saveStartedRef.current) {
      return;
    }

    saveStartedRef.current = true;
    void saveCompetitionResult(setup, scores).then(({ destination }) => {
      setSaveStatus(
        destination === "supabase"
          ? "Resultado guardado en la cuenta del cuidador."
          : "Resultado guardado en este dispositivo.",
      );
      clearCompetitionSetup();
    });
  }, [phase, scores, setup]);

  function beginPrivateTurn() {
    playSound("turn");
    setSelectedTriviaOption(null);
    setTriviaCorrect(null);
    setOutcome("");
    if (setup) {
      setTimeLeft(setup.secondsPerTurn);
    }
    setPhase("secret");
  }

  function hideSecretAndContinue() {
    if (!setup) {
      return;
    }

    if (gameKey === "impostor") {
      if (playerIndex + 1 < setup.players.length) {
        setPlayerIndex((current) => current + 1);
        setPhase("handoff");
      } else {
        setTimeLeft(60);
        setPhase("playing");
      }
      return;
    }

    setTimeLeft(setup.secondsPerTurn);
    setPhase("playing");
  }

  function answerTrivia(optionIndex: number) {
    if (!setup || phase !== "playing" || selectedTriviaOption !== null || !currentPlayer) {
      return;
    }

    const correct = optionIndex === currentQuestion.correctOption;
    playSound(correct ? "correct" : "incorrect");
    setSelectedTriviaOption(optionIndex);
    setTriviaCorrect(correct);
    if (correct) {
      setScores((current) => addPoint(current, currentPlayer.id, 1));
      setOutcome(`¡Muy bien, ${currentPlayer.name}! Sumaste un punto.`);
    } else {
      setOutcome(`Gracias por responder, ${currentPlayer.name}. La respuesta correcta era: ${currentQuestion.options[currentQuestion.correctOption]}.`);
    }
    setPhase("result");
  }

  function resolveActing(success: boolean) {
    if (!currentPlayer || phase !== "playing") {
      return;
    }

    playSound(success ? "correct" : "incorrect");
    if (success) {
      setScores((current) => addPoint(current, currentPlayer.id, 1));
      setOutcome(`¡El grupo adivinó! ${currentPlayer.name} suma un punto.`);
    } else {
      setOutcome("No pasa nada. La diversión continúa en la siguiente ronda.");
    }
    setPhase("result");
  }

  function castImpostorVote(votedPlayerId: string) {
    if (!setup || !impostorPlayer || phase !== "vote") {
      return;
    }

    const votedPlayer = setup.players.find((player) => player.id === votedPlayerId);
    if (!votedPlayer) {
      return;
    }

    const foundImpostor = votedPlayer.id === impostorPlayer.id;
    if (foundImpostor) {
      playSound("correct");
      setScores((current) =>
        setup.players.reduce(
          (nextScores, player) => (player.id === impostorPlayer.id ? nextScores : addPoint(nextScores, player.id, 1)),
          current,
        ),
      );
      setImpostorOutcome("team");
      setOutcome(`¡El equipo eligió a ${votedPlayer.name} y encontró al impostor! La partida termina con victoria del equipo.`);
    } else {
      const lastRound = round + 1 >= setup.rounds;
      playSound("incorrect");
      setScores((current) => addPoint(current, impostorPlayer.id, 2));
      if (lastRound) {
        setImpostorOutcome("impostor");
        setOutcome(`El grupo votó por ${votedPlayer.name}, pero el impostor era ${impostorPlayer.name}. El impostor sobrevivió hasta el final.`);
      } else {
        setOutcome(`El grupo votó por ${votedPlayer.name}, pero el impostor era ${impostorPlayer.name}. El impostor gana esta ronda y habrá otra oportunidad.`);
      }
    }
    setPhase("result");
  }

  function nextTurn() {
    if (!setup) {
      return;
    }

    const lastRound = round + 1 >= setup.rounds;
    if (gameKey === "impostor") {
      if (impostorOutcome === "team" || lastRound) {
        setPhase("finished");
      } else {
        setRound((current) => current + 1);
        setPlayerIndex(0);
        setTimeLeft(setup.secondsPerTurn);
        setPhase("handoff");
      }
      return;
    }

    const lastPlayer = playerIndex + 1 >= setup.players.length;
    if (lastRound && lastPlayer) {
      setPhase("finished");
    } else if (lastPlayer) {
      setRound((current) => current + 1);
      setPlayerIndex(0);
      setPhase("handoff");
    } else {
      setPlayerIndex((current) => current + 1);
      setPhase("handoff");
    }
  }

  function resetToLobby() {
    clearCompetitionSetup();
    window.location.href = "/juegos";
  }

  if (phase === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 py-8">
        <p role="status" className="rounded-2xl bg-[var(--color-surface)] p-8 text-2xl font-bold shadow-[var(--shadow-card)]">Preparando el juego…</p>
      </main>
    );
  }

  if (phase === "missing" || !setup) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 py-8">
        <section className="w-full max-w-2xl rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center shadow-[var(--shadow-card)] sm:p-12">
          <span aria-hidden="true" className="text-7xl">🎲</span>
          <h1 className="mt-5 text-4xl font-bold">Prepara una partida primero</h1>
          <p className="mt-4 text-xl text-[var(--color-text-muted)]">La sala de juegos necesita una lista de participantes y un número de rondas.</p>
          <Link href="/juegos" className="mt-8 inline-flex min-h-16 items-center rounded-2xl bg-[var(--color-primary)] px-7 text-2xl font-bold text-white no-underline">Ir a la sala de juegos</Link>
        </section>
      </main>
    );
  }

  const isImpostorGame = gameKey === "impostor";
  const isActingGame = gameKey === "animales" || gameKey === "charadas";
  const isLastRound = round + 1 >= setup.rounds;
  const isLastPlayer = playerIndex + 1 >= setup.players.length;

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-6">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Link href="/juegos" className="font-semibold text-[var(--color-primary)] underline">← Volver a preparar partida</Link>
              <p className="mt-4 font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">Partida compartida</p>
              <h1 className="mt-1 flex items-center gap-3 text-4xl font-bold tracking-tight sm:text-5xl"><span aria-hidden="true">{game.icon}</span>{game.title}</h1>
            </div>
            <div className="rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3 text-right">
              <p className="text-base font-bold text-[var(--color-text-muted)]">Ronda</p>
              <p className="text-3xl font-bold">{Math.min(round + 1, setup.rounds)} <span className="text-xl text-[var(--color-text-muted)]">de {setup.rounds}</span></p>
            </div>
          </header>

          <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-10" aria-live="polite">
            {phase === "handoff" && currentPlayer ? (
              <div className="text-center">
                <span aria-hidden="true" className="text-7xl">🔄</span>
                <p className="mt-5 text-xl font-bold text-[var(--color-primary)]">Pasa el dispositivo</p>
                <h2 className="mt-2 text-4xl font-bold sm:text-5xl">Turno de {currentPlayer.name}</h2>
                <p className="mx-auto mt-5 max-w-2xl text-xl text-[var(--color-text-muted)]">Cuando solo {currentPlayer.name} esté mirando la pantalla, puede tocar el botón para ver su turno privado.</p>
                <button type="button" onClick={beginPrivateTurn} className="mt-8 min-h-20 w-full rounded-2xl bg-[var(--color-primary)] px-6 text-3xl font-bold text-white hover:bg-[var(--color-primary-hover)]">Ver mi turno</button>
              </div>
            ) : null}

            {phase === "secret" && currentPlayer ? (
              <div className="text-center">
                <p className="text-xl font-bold text-[var(--color-primary)]">Solo {currentPlayer.name} debe mirar</p>
                <h2 className="mt-3 text-4xl font-bold">Tu información secreta</h2>
                {gameKey === "impostor" ? (
                  <div className="mt-8 rounded-2xl border-4 border-[#b45309] bg-[#fef3c7] p-7">
                    {currentPlayer.id === impostorPlayer?.id ? (
                      <>
                        <p className="text-2xl font-bold text-[#78350f]">Tu papel es</p>
                        <p className="mt-3 text-5xl font-black text-[#78350f]">IMPOSTOR</p>
                        <p className="mt-4 text-lg text-[#78350f]">No conoces la palabra. Escucha las pistas e intenta descubrirla.</p>
                      </>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-[#78350f]">La palabra secreta es</p>
                        <p className="mt-3 text-5xl font-black text-[#78350f]">{impostorWord}</p>
                        <p className="mt-4 text-lg text-[#78350f]">Da una pista sin decir la palabra directamente.</p>
                      </>
                    )}
                  </div>
                ) : gameKey === "animales" ? (
                  <div className="mt-8 rounded-2xl border-4 border-[var(--color-primary)] bg-[#e0f2fe] p-7">
                    <p className="text-2xl font-bold">Representa esto sin hablar</p>
                    <p className="mt-4 text-4xl font-black text-[var(--color-primary)]">{currentAnimal}</p>
                  </div>
                ) : gameKey === "charadas" ? (
                  <div className="mt-8 rounded-2xl border-4 border-[var(--color-primary)] bg-[#e0f2fe] p-7">
                    <p className="text-2xl font-bold">Representa esto sin hablar</p>
                    <p className="mt-4 text-4xl font-black text-[var(--color-primary)]">{currentCharade}</p>
                  </div>
                ) : (
                  <div className="mt-8 rounded-2xl border-4 border-[var(--color-primary)] bg-[#e0f2fe] p-7">
                    <p className="text-2xl font-bold">Lee la pregunta y piensa tu respuesta</p>
                    <p className="mt-4 text-3xl font-black text-[var(--color-primary)]">{currentQuestion.question}</p>
                  </div>
                )}
                <button type="button" onClick={hideSecretAndContinue} className="mt-8 min-h-20 w-full rounded-2xl bg-[var(--color-primary)] px-6 text-2xl font-bold text-white hover:bg-[var(--color-primary-hover)]">
                  {isImpostorGame && !isLastPlayer ? "Ocultar y pasar al siguiente" : isImpostorGame ? "Ocultar y comenzar las pistas" : "Ocultar y continuar"}
                </button>
              </div>
            ) : null}

            {phase === "playing" && currentPlayer && gameKey === "trivia-ecuador" ? (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xl font-bold text-[var(--color-primary)]">Responde, {currentPlayer.name}</p>
                  {triviaLoading ? <p className="text-base font-semibold text-[var(--color-text-muted)]">Preparando preguntas…</p> : null}
                </div>
                <h2 className="mt-5 text-3xl font-bold sm:text-4xl">{currentQuestion.question}</h2>
                <div className="mt-7 grid gap-4">
                  {currentQuestion.options.map((option, optionIndex) => (
                    <button
                      key={`${currentQuestion.id}-${option}`}
                      type="button"
                      aria-pressed={selectedTriviaOption === optionIndex}
                      onClick={() => answerTrivia(optionIndex)}
                      className="min-h-20 rounded-2xl border-4 border-[var(--color-border)] bg-[var(--color-surface)] px-5 text-left text-2xl font-bold hover:border-[var(--color-primary)] hover:bg-[#e0f2fe]"
                    >
                      <span className="mr-3 text-[var(--color-primary)]">{String.fromCharCode(65 + optionIndex)}.</span>{option}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {phase === "playing" && currentPlayer && isActingGame ? (
              <div className="text-center">
                <p className="text-xl font-bold text-[var(--color-primary)]">{currentPlayer.name}, es tu momento</p>
                <h2 className="mt-3 text-4xl font-bold">Actúa sin hablar</h2>
                <p className="mt-4 text-xl text-[var(--color-text-muted)]">El grupo puede adivinar. El cuidador decide si la respuesta fue correcta.</p>
                <div className={`mx-auto mt-8 flex h-36 w-36 items-center justify-center rounded-full border-8 ${timeLeft <= 10 ? "border-[#b91c1c] text-[#b91c1c]" : "border-[var(--color-primary)] text-[var(--color-primary)]"}`}>
                  <span className="text-4xl font-black">{formatTime(timeLeft)}</span>
                </div>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <button type="button" onClick={() => resolveActing(true)} className="min-h-20 rounded-2xl bg-[var(--color-success)] px-5 text-2xl font-bold text-white">¡Adivinaron!</button>
                  <button type="button" onClick={() => resolveActing(false)} className="min-h-20 rounded-2xl border-4 border-[var(--color-border)] px-5 text-2xl font-bold">No acertaron</button>
                </div>
              </div>
            ) : null}

            {phase === "playing" && isImpostorGame ? (
              <div className="text-center">
                <span aria-hidden="true" className="text-7xl">🕵️</span>
                <p className="mt-4 text-xl font-bold text-[var(--color-primary)]">Ronda de pistas: 1 minuto</p>
                <h2 className="mt-2 text-4xl font-bold">Descubran al impostor</h2>
                <p className="mx-auto mt-5 max-w-2xl text-xl text-[var(--color-text-muted)]">Cada persona da una pista breve sin decir la palabra secreta. Cuando termine el tiempo, el grupo votará por una persona.</p>
                <div className={`mx-auto mt-8 flex h-40 w-40 items-center justify-center rounded-full border-8 ${timeLeft <= 10 ? "border-[var(--color-danger)] text-[var(--color-danger-contrast)]" : "border-[var(--color-primary)] text-[var(--color-primary)]"}`}>
                  <span className="text-5xl font-black">{formatTime(timeLeft)}</span>
                </div>
                <p className="mt-5 text-lg font-semibold" aria-live="polite">Cuando llegue a 0:00 aparecerá la votación.</p>
              </div>
            ) : null}

            {phase === "vote" && isImpostorGame ? (
              <div className="text-center">
                <span aria-hidden="true" className="text-7xl">🗳️</span>
                <p className="mt-4 text-xl font-bold text-[var(--color-primary)]">Hora de votar</p>
                <h2 className="mt-2 text-4xl font-bold">¿A quién vota el grupo?</h2>
                <p className="mx-auto mt-5 max-w-2xl text-xl text-[var(--color-text-muted)]">El cuidador registra una decisión del grupo. Si eligen al impostor, el equipo gana inmediatamente.</p>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {setup.players.map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => castImpostorVote(player.id)}
                      className="min-h-20 rounded-2xl border-4 border-[var(--color-primary)] bg-[var(--color-surface)] px-5 text-2xl font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary-surface)]"
                    >
                      Votar por {player.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {phase === "result" ? (
              <div className="text-center">
                <div className="celebration-pop" aria-hidden="true">
                  <span className="celebration-icons">{resultCelebration.icon}</span>
                </div>
                <p className="mt-3 text-3xl font-black text-[var(--color-primary)]">{resultCelebration.title}</p>
                <p className="mt-2 text-xl font-semibold text-[var(--color-text-muted)]">{resultCelebration.message}</p>
                <h2 className="mt-4 text-4xl font-bold">Resultado de la ronda</h2>
                <p className="mx-auto mt-5 max-w-3xl text-2xl font-semibold" aria-live="polite">{outcome}</p>
                {gameKey === "trivia-ecuador" ? (
                  <div className="mt-6 rounded-2xl bg-[var(--color-surface-muted)] p-5 text-left">
                    <p className="font-bold">Respuesta correcta</p>
                    <p className="mt-1 text-xl font-bold">{currentQuestion.options[currentQuestion.correctOption]}</p>
                    {currentQuestion.explanation ? <p className="mt-2 text-base text-[var(--color-text-muted)]">{currentQuestion.explanation}</p> : null}
                  </div>
                ) : null}
                <button type="button" onClick={nextTurn} className="mt-8 min-h-20 w-full rounded-2xl bg-[var(--color-primary)] px-6 text-2xl font-bold text-white hover:bg-[var(--color-primary-hover)]">
                  {impostorOutcome === "team" || (isLastRound && (isImpostorGame || isLastPlayer)) ? "Ver resultados finales" : "Continuar con la partida"}
                </button>
              </div>
            ) : null}

            {phase === "finished" ? (
              <div className="text-center">
                <span aria-hidden="true" className="text-7xl">{isImpostorGame && impostorOutcome === "impostor" ? "🕵️" : "🏆"}</span>
                <p className="mt-4 text-xl font-bold text-[var(--color-primary)]">Partida terminada</p>
                {isImpostorGame ? (
                  <>
                    <h2 className="mt-2 text-4xl font-bold">{impostorOutcome === "team" ? "¡El equipo ganó!" : "¡El impostor ganó!"}</h2>
                    <p className="mt-5 text-2xl font-bold">
                      {impostorOutcome === "team"
                        ? `El grupo descubrió a ${impostorPlayer?.name ?? "el impostor"} antes de que terminara la partida.`
                        : `${impostorPlayer?.name ?? "El impostor"} sobrevivió hasta el final sin ser descubierto.`}
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="mt-2 text-4xl font-bold">¡Muy bien, equipo!</h2>
                    {winner ? <p className="mt-5 text-3xl font-bold">Ganador: {winner.name} con {scores[winner.id] ?? 0} puntos</p> : null}
                  </>
                )}
                <p className="mt-5 text-lg text-[var(--color-text-muted)]">{saveStatus}</p>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <button type="button" onClick={resetToLobby} className="min-h-16 rounded-2xl bg-[var(--color-primary)] px-5 text-xl font-bold text-white">Preparar otra partida</button>
                  <Link href="/cuidador" className="flex min-h-16 items-center justify-center rounded-2xl border-4 border-[var(--color-primary)] px-5 text-xl font-bold text-[var(--color-primary)] no-underline">Ver actividad</Link>
                </div>
              </div>
            ) : null}
          </section>
        </div>

        <aside className="h-fit rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] lg:sticky lg:top-6" aria-labelledby="score-title">
          <h2 id="score-title" className="text-2xl font-bold">Marcador</h2>
          <p className="mt-2 text-base text-[var(--color-text-muted)]">Los puntos se actualizan después de cada turno.</p>
          <ol className="mt-5 flex flex-col gap-3">
            {[...setup.players]
              .sort((first, second) => (scores[second.id] ?? 0) - (scores[first.id] ?? 0))
              .map((player, index) => (
                <li key={player.id} className="flex items-center justify-between rounded-xl bg-[var(--color-surface-muted)] px-4 py-3">
                  <span className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)] text-lg font-bold text-white">{index + 1}</span><span className="text-lg font-bold">{player.name}</span></span>
                  <span className="text-2xl font-black">{scores[player.id] ?? 0}</span>
                </li>
              ))}
          </ol>
          <p className="mt-5 border-t border-[var(--color-border)] pt-4 text-sm text-[var(--color-text-muted)]">El cuidador confirma las respuestas de mímica, animales y charadas.</p>
          <div className="mt-5 grid gap-3 border-t border-[var(--color-border)] pt-5">
            <button
              type="button"
              aria-pressed={soundEnabled}
              onClick={() => {
                const nextEnabled = !soundEnabled;
                setSoundEnabled(nextEnabled);
                audioRef.current?.setEnabled(nextEnabled);
                if (nextEnabled) {
                  audioRef.current?.play("turn");
                }
              }}
              className="min-h-14 rounded-xl border-3 border-[var(--color-primary)] px-4 font-bold text-[var(--color-primary)]"
            >
              {soundEnabled ? "Silenciar sonidos" : "Activar sonidos"}
            </button>
            <button
              type="button"
              aria-pressed={musicEnabled}
              onClick={() => {
                const nextEnabled = !musicEnabled;
                setMusicEnabled(nextEnabled);
                if (nextEnabled) {
                  audioRef.current?.setEnabled(true);
                  audioRef.current?.startMusic();
                } else {
                  audioRef.current?.stopMusic();
                }
              }}
              className="min-h-14 rounded-xl border-3 border-[var(--color-primary)] px-4 font-bold text-[var(--color-primary)]"
            >
              {musicEnabled ? "Silenciar música" : "Activar música suave"}
            </button>
            <button
              type="button"
              aria-pressed={speechEnabled}
              onClick={() => {
                const nextEnabled = !speechEnabled;
                setSpeechEnabled(nextEnabled);
                try {
                  window.localStorage.setItem(speechPreferenceStorageKey, String(nextEnabled));
                } catch {
                  // La partida sigue funcionando si no se puede guardar la preferencia.
                }
                if (nextEnabled) {
                  speakInSpanish("Lector de voz activado.");
                } else {
                  stopSpeaking();
                }
              }}
              className="min-h-14 rounded-xl border-3 border-[var(--color-primary)] px-4 font-bold text-[var(--color-primary)]"
            >
              {speechEnabled ? "Desactivar lector de voz" : "Activar lector de voz"}
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}
