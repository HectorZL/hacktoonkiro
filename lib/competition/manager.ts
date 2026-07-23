import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type {
  CompetitionResult,
  CompetitionResultPlayer,
  CompetitionSetup,
  CompetitionGameKey,
} from "@/lib/competition/types";

const setupStorageKey = "mayorsperson:competition-setup";
const localResultsStorageKey = "mayorsperson:competition-results";

type CompetitionDestination = "local" | "supabase";

function hasBrowserStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `competition-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createCompetitionSetup(
  input: Omit<CompetitionSetup, "id" | "startedAt">,
): CompetitionSetup {
  return {
    ...input,
    id: createId(),
    startedAt: new Date().toISOString(),
  };
}

export function saveCompetitionSetup(setup: CompetitionSetup) {
  if (!hasBrowserStorage()) {
    return;
  }

  try {
    window.sessionStorage.setItem(setupStorageKey, JSON.stringify(setup));
  } catch {
    try {
      window.localStorage.setItem(setupStorageKey, JSON.stringify(setup));
    } catch {
      // La partida todavía puede continuar mientras la pestaña permanezca abierta.
    }
  }
}

export function readCompetitionSetup(): CompetitionSetup | null {
  if (!hasBrowserStorage()) {
    return null;
  }

  try {
    const storedSetup = window.sessionStorage.getItem(setupStorageKey);
    if (storedSetup) {
      return JSON.parse(storedSetup) as CompetitionSetup;
    }
  } catch {
    // Se intenta el almacenamiento local como respaldo.
  }

  try {
    const storedSetup = window.localStorage.getItem(setupStorageKey);
    return storedSetup ? (JSON.parse(storedSetup) as CompetitionSetup) : null;
  } catch {
    return null;
  }
}

export function clearCompetitionSetup() {
  if (!hasBrowserStorage()) {
    return;
  }

  try {
    window.sessionStorage.removeItem(setupStorageKey);
  } catch {
    // El almacenamiento puede estar bloqueado por el navegador.
  }
  try {
    window.localStorage.removeItem(setupStorageKey);
  } catch {
    // El almacenamiento puede estar bloqueado por el navegador.
  }
}

export function getLocalCompetitionResults(): CompetitionResult[] {
  if (!hasBrowserStorage()) {
    return [];
  }

  try {
    const storedResults = window.localStorage.getItem(localResultsStorageKey);
    if (!storedResults) {
      return [];
    }

    const parsedResults = JSON.parse(storedResults) as CompetitionResult[];
    return Array.isArray(parsedResults) ? parsedResults : [];
  } catch {
    return [];
  }
}

function saveLocalCompetitionResult(result: CompetitionResult) {
  if (!hasBrowserStorage()) {
    return;
  }

  try {
    const nextResults = [...getLocalCompetitionResults(), result].slice(-100);
    window.localStorage.setItem(localResultsStorageKey, JSON.stringify(nextResults));
  } catch {
    // Guardar el resultado no debe interrumpir la pantalla final.
  }
}

export async function saveCompetitionResult(
  setup: CompetitionSetup,
  scores: Record<string, number>,
  endedAt = new Date().toISOString(),
): Promise<{ result: CompetitionResult; destination: CompetitionDestination }> {
  const players: CompetitionResultPlayer[] = setup.players.map((player) => ({
    ...player,
    score: scores[player.id] ?? 0,
  }));
  const result: CompetitionResult = {
    id: setup.id,
    gameKey: setup.gameKey,
    rounds: setup.rounds,
    players,
    startedAt: setup.startedAt,
    endedAt,
  };

  saveLocalCompetitionResult(result);

  if (!isSupabaseConfigured() || !setup.players.every((player) => isUuid(player.id))) {
    return { result, destination: "local" };
  }

  try {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user || !isUuid(userData.user.id)) {
      return { result, destination: "local" };
    }

    const { data: session, error: sessionError } = await supabase
      .from("competition_sessions")
      .insert({
        id: isUuid(setup.id) ? setup.id : undefined,
        caregiver_id: userData.user.id,
        game_key: setup.gameKey,
        rounds: setup.rounds,
        turn_seconds: setup.secondsPerTurn,
        started_at: setup.startedAt,
        ended_at: endedAt,
      })
      .select("id")
      .single();

    if (sessionError || !session) {
      return { result, destination: "local" };
    }

    const { error: scoresError } = await supabase.from("competition_scores").insert(
      players.map((player) => ({
        competition_session_id: session.id,
        player_id: player.id,
        player_name: player.name,
        score: player.score,
      })),
    );

    if (scoresError) {
      return { result, destination: "local" };
    }

    return { result, destination: "supabase" };
  } catch {
    return { result, destination: "local" };
  }
}

export function getGameLabel(gameKey: CompetitionGameKey) {
  const labels: Record<CompetitionGameKey, string> = {
    "trivia-ecuador": "Trivia de Ecuador",
    animales: "Animales y mímica",
    impostor: "Impostor",
    charadas: "Charadas",
  };
  return labels[gameKey];
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
