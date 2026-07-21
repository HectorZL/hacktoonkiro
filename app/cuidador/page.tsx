"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getLocalGameSessions,
  type AssistanceLevel,
  type GameSessionKey,
  type StoredGameSession,
} from "@/lib/sessions/manager";
import type { InputMode } from "@/lib/input/types";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type Period = "week" | "month";
type PlayerSummary = {
  id: string;
  name: string;
};
type DashboardSession = {
  id: string;
  playerId: string;
  playerName: string;
  gameKey: GameSessionKey;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  inputMode: InputMode;
  assistanceLevel: AssistanceLevel;
};

type SupabasePlayerRow = {
  id: string;
  player_name: string;
};
type SupabaseSessionRow = {
  id: string;
  player_id: string;
  game_key: GameSessionKey;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  input_mode: InputMode;
  assistance_level: AssistanceLevel;
};

const localPlayersStorageKey = "hacktoonkiro:players";
const gameLabels: Record<GameSessionKey, string> = {
  "carrera-sacos": "Carrera de sacos",
  trompo: "Lanzamiento del trompo",
  "jardin-virtual": "El Jardín Virtual",
};
const weekdayLabels = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function readLocalPlayers(): PlayerSummary[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedPlayers = window.localStorage.getItem(localPlayersStorageKey);
    if (!storedPlayers) {
      return [];
    }

    const parsedPlayers = JSON.parse(storedPlayers) as Array<{ id?: string; name?: string }>;
    return Array.isArray(parsedPlayers)
      ? parsedPlayers.filter(
          (player): player is { id: string; name: string } => Boolean(player.id && player.name),
        )
      : [];
  } catch {
    return [];
  }
}

function mapLocalSession(session: StoredGameSession): DashboardSession {
  return {
    id: session.id,
    playerId: session.player.id,
    playerName: session.player.name,
    gameKey: session.gameKey,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    durationSeconds: session.durationSeconds,
    inputMode: session.inputMode,
    assistanceLevel: session.assistanceLevel,
  };
}

function getPeriodStart(period: Period) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (period === "week" ? 6 : 29));
  return start;
}

function getDateKeyFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateKey(value: string) {
  return getDateKeyFromDate(new Date(value));
}

function formatDate(value: string | null) {
  if (!value) {
    return "Sin sesiones";
  }

  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMinutes(durationSeconds: number) {
  const minutes = Math.round(durationSeconds / 60);
  return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
}

function mergePlayers(players: PlayerSummary[], sessions: DashboardSession[]) {
  const merged = new Map(players.map((player) => [player.id, player]));
  sessions.forEach((session) => {
    if (!merged.has(session.playerId)) {
      merged.set(session.playerId, { id: session.playerId, name: session.playerName });
    }
  });
  return Array.from(merged.values());
}

export default function CaregiverDashboardPage() {
  const supabaseConfigured = isSupabaseConfigured();
  const [period, setPeriod] = useState<Period>("week");
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [sessions, setSessions] = useState<DashboardSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [source, setSource] = useState<"demo" | "supabase" | null>(null);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setError("");

    if (!supabaseConfigured) {
      const localSessions = getLocalGameSessions().map(mapLocalSession);
      setPlayers(mergePlayers(readLocalPlayers(), localSessions));
      setSessions(localSessions);
      setSource("demo");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      setError(userError.message);
      setLoading(false);
      return;
    }

    if (!userData.user) {
      setUserId(null);
      setPlayers([]);
      setSessions([]);
      setSource(null);
      setLoading(false);
      return;
    }

    setUserId(userData.user.id);
    const { data: playerData, error: playerError } = await supabase
      .from("caregiver_players")
      .select("id, player_name")
      .eq("caregiver_id", userData.user.id)
      .order("created_at", { ascending: true });

    if (playerError) {
      setError(playerError.message);
      setLoading(false);
      return;
    }

    const playerRows = (playerData ?? []) as SupabasePlayerRow[];
    const playerMap = new Map(playerRows.map((player) => [player.id, player.player_name]));
    let dashboardSessions: DashboardSession[] = [];

    if (playerRows.length > 0) {
      const { data: sessionData, error: sessionError } = await supabase
        .from("game_sessions")
        .select(
          "id, player_id, game_key, started_at, ended_at, duration_seconds, input_mode, assistance_level",
        )
        .in(
          "player_id",
          playerRows.map((player) => player.id),
        )
        .order("started_at", { ascending: false })
        .limit(500);

      if (sessionError) {
        setError(sessionError.message);
        setLoading(false);
        return;
      }

      dashboardSessions = ((sessionData ?? []) as SupabaseSessionRow[]).map((session) => ({
        id: session.id,
        playerId: session.player_id,
        playerName: playerMap.get(session.player_id) ?? "Jugador",
        gameKey: session.game_key,
        startedAt: session.started_at,
        endedAt: session.ended_at,
        durationSeconds: session.duration_seconds,
        inputMode: session.input_mode,
        assistanceLevel: session.assistance_level,
      }));
    }

    setPlayers(playerRows.map((player) => ({ id: player.id, name: player.player_name })));
    setSessions(dashboardSessions);
    setSource("supabase");
    setLoading(false);
  }, [supabaseConfigured]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboard();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadDashboard]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }

  const periodSessions = useMemo(() => {
    const start = getPeriodStart(period).getTime();
    return sessions
      .filter((session) => new Date(session.startedAt).getTime() >= start)
      .sort((first, second) => Date.parse(second.startedAt) - Date.parse(first.startedAt));
  }, [period, sessions]);

  const summary = useMemo(() => {
    const totalSeconds = periodSessions.reduce((total, session) => total + session.durationSeconds, 0);
    const games = new Set(periodSessions.map((session) => session.gameKey));
    return {
      sessionCount: periodSessions.length,
      totalSeconds,
      gameCount: games.size,
    };
  }, [periodSessions]);

  const playerRows = useMemo(
    () =>
      players.map((player) => {
        const playerSessions = periodSessions.filter((session) => session.playerId === player.id);
        const latestSession = sessions
          .filter((session) => session.playerId === player.id)
          .sort((first, second) => Date.parse(second.startedAt) - Date.parse(first.startedAt))[0];
        return {
          ...player,
          sessions: playerSessions.length,
          durationSeconds: playerSessions.reduce(
            (total, session) => total + session.durationSeconds,
            0,
          ),
          gameCount: new Set(playerSessions.map((session) => session.gameKey)).size,
          latestSession: latestSession?.startedAt ?? null,
        };
      }),
    [periodSessions, players, sessions],
  );

  const chartDays = useMemo(() => {
    const totalDays = period === "week" ? 7 : 30;
    const start = getPeriodStart(period);
    const counts = new Map<string, number>();
    periodSessions.forEach((session) => {
      const key = getDateKey(session.startedAt);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return Array.from({ length: totalDays }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = getDateKeyFromDate(date);
      return {
        key,
        label: `${weekdayLabels[date.getDay()]} ${date.getDate()}`,
        count: counts.get(key) ?? 0,
      };
    });
  }, [period, periodSessions]);

  const maxChartCount = Math.max(...chartDays.map((day) => day.count), 1);
  const requiresSignIn = supabaseConfigured && !userId && !loading;

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <Link className="w-fit font-semibold text-[var(--color-primary)] underline" href="/perfiles">
            ← Volver a perfiles
          </Link>
          <p className="font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
            Task 11 · Panel del cuidador
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Actividad de juego
          </h1>
          <p className="max-w-3xl text-xl text-[var(--color-text-muted)]">
            Consulta sesiones, tiempo de juego y actividades realizadas. Esta información describe actividad registrada; no es una evaluación médica.
          </p>
        </header>

        <section
          aria-labelledby="filters-title"
          className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] sm:flex-row sm:items-end sm:justify-between sm:p-6"
        >
          <div>
            <h2 id="filters-title" className="text-2xl font-bold">
              Período de consulta
            </h2>
            <p className="mt-1 text-[var(--color-text-muted)]">
              Cambia el período para actualizar los resúmenes y la tabla.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="flex min-h-12 items-center gap-3 font-semibold" htmlFor="period">
              Mostrar
              <select
                id="period"
                value={period}
                onChange={(event) => setPeriod(event.target.value as Period)}
                className="min-h-12 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4"
              >
                <option value="week">Últimos 7 días</option>
                <option value="month">Últimos 30 días</option>
              </select>
            </label>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="min-h-12 rounded-xl border-2 border-[var(--color-primary)] px-5 font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)] disabled:opacity-60"
            >
              {refreshing ? "Actualizando…" : "Actualizar"}
            </button>
          </div>
        </section>

        {loading ? (
          <p role="status" className="rounded-xl bg-[var(--color-surface-muted)] p-5 text-lg font-semibold">
            Cargando actividad…
          </p>
        ) : requiresSignIn ? (
          <section
            aria-labelledby="sign-in-title"
            className="rounded-[var(--radius-card)] border border-[#92400e] bg-[#fef3c7] p-6"
          >
            <h2 id="sign-in-title" className="text-2xl font-bold text-[#78350f]">
              Inicia sesión como cuidador
            </h2>
            <p className="mt-2 text-lg text-[#78350f]">
              Con Supabase configurado, el panel muestra únicamente los perfiles y sesiones de tu cuenta.
            </p>
            <Link
              href="/perfiles"
              className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-[var(--color-primary)] px-5 font-bold text-[var(--color-primary-contrast)]"
            >
              Ir a acceso de cuidador
            </Link>
          </section>
        ) : (
          <>
            {source === "demo" ? (
              <p role="status" className="rounded-xl border border-[#92400e] bg-[#fef3c7] p-4 font-semibold text-[#78350f]">
                Modo demo local: se muestran las sesiones guardadas en este navegador. No se enviaron datos a Supabase.
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="rounded-xl border border-[#991b1b] bg-[#fee2e2] p-4 font-semibold text-[#7f1d1d]">
                {error}
              </p>
            ) : null}

            <section aria-labelledby="summary-title">
              <h2 id="summary-title" className="sr-only">
                Resumen de actividad
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <article className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
                  <p className="text-base font-semibold text-[var(--color-text-muted)]">Actividad reciente</p>
                  <p className="mt-2 text-4xl font-bold">{summary.sessionCount}</p>
                  <p className="mt-1 text-[var(--color-text-muted)]">sesiones en el período</p>
                </article>
                <article className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
                  <p className="text-base font-semibold text-[var(--color-text-muted)]">Tiempo de juego</p>
                  <p className="mt-2 text-4xl font-bold">{formatMinutes(summary.totalSeconds)}</p>
                  <p className="mt-1 text-[var(--color-text-muted)]">tiempo acumulado</p>
                </article>
                <article className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
                  <p className="text-base font-semibold text-[var(--color-text-muted)]">Juegos realizados</p>
                  <p className="mt-2 text-4xl font-bold">{summary.gameCount}</p>
                  <p className="mt-1 text-[var(--color-text-muted)]">actividades distintas</p>
                </article>
              </div>
            </section>

            <section
              aria-labelledby="chart-title"
              className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8"
            >
              <h2 id="chart-title" className="text-2xl font-bold">
                Sesiones por día
              </h2>
              <p className="mt-2 text-[var(--color-text-muted)]">
                La gráfica muestra la cantidad de sesiones registradas, sin interpretar su significado.
              </p>
              {periodSessions.length === 0 ? (
                <p className="mt-6 rounded-xl bg-[var(--color-surface-muted)] p-5 text-lg">
                  No hay sesiones registradas en este período.
                </p>
              ) : (
                <>
                  <div
                    role="img"
                    aria-label={`Gráfica de sesiones por día. ${periodSessions.length} sesiones en total.`}
                    className="mt-8 flex h-56 items-end gap-1 overflow-x-auto border-b-2 border-l-2 border-[var(--color-border)] px-2 pb-2 sm:gap-2"
                  >
                    {chartDays.map((day) => (
                      <div key={day.key} className="flex h-full min-w-7 flex-1 flex-col items-center justify-end gap-2 sm:min-w-9">
                        <span className="text-xs font-bold">{day.count || ""}</span>
                        <div
                          aria-hidden="true"
                          className="w-full rounded-t-lg bg-[var(--color-primary)]"
                          style={{ height: `${day.count ? Math.max((day.count / maxChartCount) * 85, 8) : 0}%` }}
                        />
                        <span className="whitespace-nowrap text-[0.7rem] text-[var(--color-text-muted)]">{day.label}</span>
                      </div>
                    ))}
                  </div>
                  <table className="mt-6 w-full border-collapse text-left text-sm">
                    <caption className="mb-2 text-left font-semibold">Datos de la gráfica por día</caption>
                    <thead>
                      <tr className="border-b-2 border-[var(--color-border)]">
                        <th scope="col" className="p-2">Día</th>
                        <th scope="col" className="p-2">Sesiones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartDays.map((day) => (
                        <tr key={day.key} className="border-b border-[var(--color-border)]">
                          <th scope="row" className="p-2 font-medium">{day.label}</th>
                          <td className="p-2">{day.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </section>

            <section
              aria-labelledby="players-summary-title"
              className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8"
            >
              <h2 id="players-summary-title" className="text-2xl font-bold">
                Resumen por jugador
              </h2>
              <p className="mt-2 text-[var(--color-text-muted)]">
                El resumen usa solo sesiones, duración, juegos y fecha de actividad.
              </p>
              {playerRows.length === 0 ? (
                <p className="mt-6 rounded-xl bg-[var(--color-surface-muted)] p-5 text-lg">
                  Todavía no hay perfiles para mostrar.
                </p>
              ) : (
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full min-w-[700px] border-collapse text-left">
                    <caption className="sr-only">Actividad por jugador en el período seleccionado</caption>
                    <thead>
                      <tr className="border-b-2 border-[var(--color-border)]">
                        <th scope="col" className="p-3">Jugador</th>
                        <th scope="col" className="p-3">Última sesión</th>
                        <th scope="col" className="p-3">Tiempo de juego</th>
                        <th scope="col" className="p-3">Juegos realizados</th>
                        <th scope="col" className="p-3">Sesiones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {playerRows.map((player) => (
                        <tr key={player.id} className="border-b border-[var(--color-border)]">
                          <th scope="row" className="p-3 text-lg">{player.name}</th>
                          <td className="p-3">{formatDate(player.latestSession)}</td>
                          <td className="p-3">{formatMinutes(player.durationSeconds)}</td>
                          <td className="p-3">{player.gameCount}</td>
                          <td className="p-3">{player.sessions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section
              aria-labelledby="recent-title"
              className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8"
            >
              <h2 id="recent-title" className="text-2xl font-bold">
                Actividad reciente
              </h2>
              {periodSessions.length === 0 ? (
                <p className="mt-4 text-[var(--color-text-muted)]">No hay sesiones recientes.</p>
              ) : (
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full min-w-[620px] border-collapse text-left">
                    <caption className="sr-only">Últimas sesiones del período</caption>
                    <thead>
                      <tr className="border-b-2 border-[var(--color-border)]">
                        <th scope="col" className="p-3">Fecha</th>
                        <th scope="col" className="p-3">Jugador</th>
                        <th scope="col" className="p-3">Juego</th>
                        <th scope="col" className="p-3">Duración</th>
                      </tr>
                    </thead>
                    <tbody>
                      {periodSessions.slice(0, 10).map((session) => (
                        <tr key={session.id} className="border-b border-[var(--color-border)]">
                          <td className="p-3">{formatDate(session.startedAt)}</td>
                          <th scope="row" className="p-3">{session.playerName}</th>
                          <td className="p-3">{gameLabels[session.gameKey] ?? session.gameKey}</td>
                          <td className="p-3">{formatMinutes(session.durationSeconds)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        <footer className="border-t border-[var(--color-border)] pt-5 text-base text-[var(--color-text-muted)]">
          <p>
            Este panel muestra actividad registrada y no emite diagnósticos, alertas clínicas ni conclusiones sobre la salud de una persona.
          </p>
        </footer>
      </div>
    </main>
  );
}
