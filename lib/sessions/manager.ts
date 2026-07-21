import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { InputMode } from "@/lib/input/types";

export type AssistanceLevel = "basic" | "guided" | "assisted";
export type GameSessionKey = "carrera-sacos" | "trompo" | "jardin-virtual";
export type ActivePlayer = {
  id: string;
  name: string;
};
export type ActiveGameSession = {
  id: string;
  player: ActivePlayer;
  gameKey: GameSessionKey;
  inputMode: InputMode;
  assistanceLevel: AssistanceLevel;
  startedAt: string;
};
export type StoredGameSession = ActiveGameSession & {
  endedAt: string;
  durationSeconds: number;
};

const activePlayerStorageKey = "hacktoonkiro:active-player";
const localSessionsStorageKey = "hacktoonkiro:sessions";

function hasBrowserStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function setActivePlayer(player: ActivePlayer | null) {
  if (!hasBrowserStorage()) {
    return;
  }

  if (player) {
    window.localStorage.setItem(activePlayerStorageKey, JSON.stringify(player));
  } else {
    window.localStorage.removeItem(activePlayerStorageKey);
  }
}

export function getActivePlayer(): ActivePlayer {
  if (hasBrowserStorage()) {
    try {
      const storedPlayer = window.localStorage.getItem(activePlayerStorageKey);
      if (storedPlayer) {
        const parsedPlayer = JSON.parse(storedPlayer) as ActivePlayer;
        if (parsedPlayer.id && parsedPlayer.name) {
          return parsedPlayer;
        }
      }
    } catch {
      // Si el almacenamiento local no está disponible, se usa el perfil demo.
    }
  }

  return { id: "local-demo", name: "Jugador local" };
}

export function startGameSession(input: Omit<ActiveGameSession, "id" | "startedAt">) {
  return {
    ...input,
    id: createSessionId(),
    startedAt: new Date().toISOString(),
  } satisfies ActiveGameSession;
}

export async function finishGameSession(session: ActiveGameSession) {
  const endedAt = new Date();
  const storedSession: StoredGameSession = {
    ...session,
    endedAt: endedAt.toISOString(),
    durationSeconds: Math.max(0, Math.round((endedAt.getTime() - Date.parse(session.startedAt)) / 1000)),
  };

  if (isSupabaseConfigured() && isUuid(session.player.id)) {
    const supabase = createClient();
    const { error } = await supabase.from("game_sessions").insert({
      player_id: session.player.id,
      game_key: session.gameKey,
      started_at: storedSession.startedAt,
      ended_at: storedSession.endedAt,
      duration_seconds: storedSession.durationSeconds,
      input_mode: storedSession.inputMode,
      assistance_level: storedSession.assistanceLevel,
    });

    if (!error) {
      return { storedSession, destination: "supabase" as const };
    }
  }

  saveLocalSession(storedSession);
  return { storedSession, destination: "local" as const };
}

export function getLocalGameSessions(): StoredGameSession[] {
  if (!hasBrowserStorage()) {
    return [];
  }

  try {
    const storedSessions = window.localStorage.getItem(localSessionsStorageKey);
    if (!storedSessions) {
      return [];
    }

    const parsedSessions = JSON.parse(storedSessions) as StoredGameSession[];
    return Array.isArray(parsedSessions) ? parsedSessions : [];
  } catch {
    return [];
  }
}

function saveLocalSession(session: StoredGameSession) {
  if (!hasBrowserStorage()) {
    return;
  }

  try {
    const nextSessions = [...getLocalGameSessions(), session].slice(-100);
    window.localStorage.setItem(localSessionsStorageKey, JSON.stringify(nextSessions));
  } catch {
    // El registro local no debe bloquear ni interrumpir la actividad.
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
