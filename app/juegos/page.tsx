"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  competitionGameMeta,
  type CompetitionGameKey,
  type CompetitionPlayer,
} from "@/lib/competition/types";
import { createCompetitionSetup, saveCompetitionSetup } from "@/lib/competition/manager";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const localPlayersStorageKey = "hacktoonkiro:players";

const demoPlayers: CompetitionPlayer[] = [
  { id: "demo-maria", name: "María", avatarKey: "flower" },
  { id: "demo-jose", name: "José", avatarKey: "sun" },
  { id: "demo-elena", name: "Elena", avatarKey: "star" },
];

const gameOrder: CompetitionGameKey[] = ["trivia-ecuador", "animales", "impostor", "charadas"];

function readLocalPlayers() {
  if (typeof window === "undefined") {
    return demoPlayers;
  }

  try {
    const storedPlayers = window.localStorage.getItem(localPlayersStorageKey);
    if (!storedPlayers) {
      return demoPlayers;
    }

    const parsedPlayers = JSON.parse(storedPlayers) as Array<{
      id?: string;
      name?: string;
      avatarKey?: string;
    }>;
    const players = parsedPlayers
      .filter((player): player is { id: string; name: string; avatarKey?: string } => Boolean(player.id && player.name))
      .map((player) => ({ id: player.id, name: player.name, avatarKey: player.avatarKey }));
    return players.length > 0 ? players : demoPlayers;
  } catch {
    return demoPlayers;
  }
}

export default function CompetitionLobbyPage() {
  const router = useRouter();
  const supabaseConfigured = isSupabaseConfigured();
  const [players, setPlayers] = useState<CompetitionPlayer[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [gameKey, setGameKey] = useState<CompetitionGameKey>("trivia-ecuador");
  const [rounds, setRounds] = useState(5);
  const [secondsPerTurn, setSecondsPerTurn] = useState(60);
  const [userId, setUserId] = useState<string | null>(null);
  const [source, setSource] = useState<"demo" | "supabase" | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPlayers() {
      setLoading(true);
      setError("");

      if (!supabaseConfigured) {
        const localPlayers = readLocalPlayers();
        if (active) {
          setPlayers(localPlayers);
          setSelectedIds(localPlayers.map((player) => player.id));
          setSource("demo");
          setLoading(false);
        }
        return;
      }

      try {
        const supabase = createClient();
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) {
          throw userError;
        }

        if (!userData.user) {
          if (active) {
            setUserId(null);
            setPlayers([]);
            setSelectedIds([]);
            setSource(null);
            setLoading(false);
          }
          return;
        }

        const { data, error: playersError } = await supabase
          .from("caregiver_players")
          .select("id, player_name, avatar_key")
          .eq("caregiver_id", userData.user.id)
          .order("created_at", { ascending: true });

        if (playersError) {
          throw playersError;
        }

        const loadedPlayers: CompetitionPlayer[] = (data ?? []).map((player) => ({
          id: player.id,
          name: player.player_name,
          avatarKey: player.avatar_key ?? undefined,
        }));

        if (active) {
          setUserId(userData.user.id);
          setPlayers(loadedPlayers);
          setSelectedIds(loadedPlayers.map((player) => player.id));
          setSource("supabase");
          setLoading(false);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los perfiles.");
          setLoading(false);
        }
      }
    }

    void loadPlayers();
    return () => {
      active = false;
    };
  }, [supabaseConfigured]);

  const selectedPlayers = useMemo(
    () => players.filter((player) => selectedIds.includes(player.id)),
    [players, selectedIds],
  );
  const selectedGame = competitionGameMeta[gameKey];
  const requiresSignIn = supabaseConfigured && !userId && !loading;

  function togglePlayer(playerId: string) {
    setSelectedIds((currentIds) =>
      currentIds.includes(playerId)
        ? currentIds.filter((id) => id !== playerId)
        : [...currentIds, playerId],
    );
  }

  function selectAllPlayers() {
    setSelectedIds(players.map((player) => player.id));
  }

  function clearPlayers() {
    setSelectedIds([]);
  }

  function startCompetition() {
    if (selectedPlayers.length < 2) {
      setError("Selecciona al menos dos participantes para comenzar una partida.");
      return;
    }

    setStarting(true);
    setError("");
    const setup = createCompetitionSetup({
      gameKey,
      rounds: Math.min(20, Math.max(1, rounds)),
      secondsPerTurn: Math.min(180, Math.max(15, secondsPerTurn)),
      players: selectedPlayers,
    });
    saveCompetitionSetup(setup);
    router.push(`/juegos/${gameKey}`);
  }

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/cuidador"
              className="w-fit rounded-xl border-2 border-[var(--color-primary)] px-5 py-3 font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]"
            >
              Ver actividad del cuidador
            </Link>
            <Link className="w-fit font-semibold text-[var(--color-primary)] underline" href="/perfiles">
              Administrar perfiles
            </Link>
          </div>
          <p className="font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
            Partidas compartidas
          </p>
          <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">Sala de juegos</h1>
          <p className="max-w-4xl text-xl text-[var(--color-text-muted)] sm:text-2xl">
            El cuidador prepara la partida. Después, el dispositivo pasa de una persona a otra durante cada turno.
          </p>
        </header>

        {loading ? (
          <p role="status" className="rounded-[var(--radius-card)] bg-[var(--color-surface-muted)] p-6 text-xl font-semibold">
            Cargando el espacio del cuidador…
          </p>
        ) : requiresSignIn ? (
          <section className="rounded-[var(--radius-card)] border-2 border-[var(--color-warning)] bg-[var(--color-warning-surface)] p-6 sm:p-8" aria-labelledby="login-required-title">
            <h2 id="login-required-title" className="text-3xl font-bold text-[#78350f]">
              Inicia sesión para dirigir una partida
            </h2>
            <p className="mt-3 max-w-3xl text-lg text-[#78350f]">
              Solo el cuidador necesita una cuenta. Los participantes entran usando sus perfiles y comparten este dispositivo.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex min-h-14 items-center rounded-xl bg-[var(--color-primary)] px-6 font-bold text-[var(--color-primary-contrast)] no-underline"
            >
              Ir al acceso del cuidador
            </Link>
          </section>
        ) : (
          <>
            {source === "demo" ? (
              <p role="status" className="rounded-xl border border-[var(--color-warning)] bg-[var(--color-warning-surface)] p-4 font-semibold text-[#78350f]">
                Modo demo local: puedes probar la partida sin conectar Supabase. En producción, el cuidador inicia sesión para guardar la información.
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="rounded-xl border border-[#991b1b] bg-[#fee2e2] p-4 font-semibold text-[#7f1d1d]">
                {error}
              </p>
            ) : null}

            <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]" aria-label="Configuración de partida">
              <div className="flex flex-col gap-6">
                <section
                  aria-labelledby="game-title"
                  className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 id="game-title" className="text-3xl font-bold">Elige un juego</h2>
                      <p className="mt-2 text-[var(--color-text-muted)]">Las cuatro actividades están pensadas para jugar en grupo.</p>
                    </div>
                    <span aria-hidden="true" className="text-5xl">{selectedGame.icon}</span>
                  </div>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {gameOrder.map((key) => {
                      const game = competitionGameMeta[key];
                      const selected = gameKey === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setGameKey(key)}
                          className={`min-h-36 rounded-2xl border-4 p-5 text-left transition-colors ${
                            selected
                              ? "border-[var(--color-primary)] bg-[#e0f2fe]"
                              : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)]"
                          }`}
                        >
                          <span className="flex items-start gap-4">
                            <span aria-hidden="true" className="text-4xl">{game.icon}</span>
                            <span>
                              <span className="block text-2xl font-bold">{game.title}</span>
                              <span className="mt-2 block text-base leading-6 text-[var(--color-text-muted)]">{game.description}</span>
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section
                  aria-labelledby="players-title"
                  className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 id="players-title" className="text-3xl font-bold">Participantes</h2>
                      <p className="mt-2 text-[var(--color-text-muted)]">Selecciona quiénes jugarán esta partida. Se necesitan al menos dos personas.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={selectAllPlayers} className="min-h-11 rounded-xl border-2 border-[var(--color-primary)] px-4 text-base font-bold text-[var(--color-primary)]">Seleccionar todos</button>
                      <button type="button" onClick={clearPlayers} className="min-h-11 rounded-xl border-2 border-[var(--color-border)] px-4 text-base font-bold">Limpiar</button>
                    </div>
                  </div>

                  {players.length === 0 ? (
                    <p className="mt-6 rounded-xl bg-[var(--color-surface-muted)] p-5 text-lg">
                      Todavía no hay perfiles. El cuidador puede crearlos antes de comenzar.
                    </p>
                  ) : (
                    <div className="mt-6 grid gap-3 sm:grid-cols-2" role="list" aria-label="Participantes disponibles">
                      {players.map((player) => {
                        const selected = selectedIds.includes(player.id);
                        return (
                          <div key={player.id} role="listitem">
                            <button
                              type="button"
                              aria-pressed={selected}
                              onClick={() => togglePlayer(player.id)}
                              className={`flex min-h-20 w-full items-center justify-between gap-4 rounded-2xl border-3 px-5 py-4 text-left ${
                                selected
                                  ? "border-[var(--color-primary)] bg-[#e0f2fe]"
                                  : "border-[var(--color-border)] bg-[var(--color-surface)]"
                              }`}
                            >
                              <span className="flex items-center gap-3">
                                <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fef3c7] text-2xl">{selected ? "✓" : "○"}</span>
                                <span className="text-xl font-bold">{player.name}</span>
                              </span>
                              <span className="text-base font-semibold text-[var(--color-text-muted)]">{selected ? "Jugará" : "No jugará"}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p className="mt-5 text-lg font-bold" aria-live="polite">
                    {selectedPlayers.length} {selectedPlayers.length === 1 ? "participante seleccionado" : "participantes seleccionados"}
                  </p>
                </section>
              </div>

              <aside className="flex flex-col gap-6">
                <section
                  aria-labelledby="rules-title"
                  className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8"
                >
                  <h2 id="rules-title" className="text-3xl font-bold">Configura la partida</h2>
                  <p className="mt-2 text-[var(--color-text-muted)]">Puedes cambiar las rondas cada vez que el grupo juegue.</p>
                  <div className="mt-6 flex flex-col gap-5">
                    <label className="flex flex-col gap-2 font-bold" htmlFor="rounds">
                      Número de rondas
                      <input
                        id="rounds"
                        type="number"
                        min={1}
                        max={20}
                        value={rounds}
                        onChange={(event) => setRounds(Number(event.target.value) || 1)}
                        className="min-h-14 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-2xl"
                      />
                      <span className="text-base font-normal text-[var(--color-text-muted)]">Cada ronda da un turno a cada participante.</span>
                    </label>
                    <label className="flex flex-col gap-2 font-bold" htmlFor="turn-seconds">
                      Tiempo para mímica o charadas
                      <select
                        id="turn-seconds"
                        value={secondsPerTurn}
                        onChange={(event) => setSecondsPerTurn(Number(event.target.value))}
                        className="min-h-14 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-xl"
                      >
                        <option value={30}>30 segundos</option>
                        <option value={45}>45 segundos</option>
                        <option value={60}>60 segundos</option>
                        <option value={90}>90 segundos</option>
                        <option value={120}>2 minutos</option>
                      </select>
                    </label>
                  </div>
                  <div className="mt-6 rounded-xl bg-[var(--color-surface-muted)] p-5">
                    <p className="font-bold">Juego elegido</p>
                    <p className="mt-1 text-2xl font-bold">{selectedGame.icon} {selectedGame.title}</p>
                    <p className="mt-2 text-base text-[var(--color-text-muted)]">{selectedGame.privateTurn ? "Los secretos se muestran por turnos." : "Partida compartida."}</p>
                  </div>
                  <button
                    type="button"
                    onClick={startCompetition}
                    disabled={starting || selectedPlayers.length < 2}
                    className="mt-6 min-h-16 w-full rounded-2xl bg-[var(--color-primary)] px-5 text-2xl font-bold text-[var(--color-primary-contrast)] hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {starting ? "Preparando partida…" : "Comenzar partida"}
                  </button>
                </section>

                <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8" aria-labelledby="privacy-title">
                  <h2 id="privacy-title" className="text-2xl font-bold">Cómo cuidamos los turnos</h2>
                  <ul className="mt-4 flex list-disc flex-col gap-3 pl-6 text-lg">
                    <li>El dispositivo indica cuándo debe pasar a otra persona.</li>
                    <li>El secreto aparece solo después de pulsar “Ver mi turno”.</li>
                    <li>Antes de continuar, la pantalla oculta la palabra o consigna.</li>
                  </ul>
                </section>
              </aside>
            </section>
          </>
        )}

        <footer className="border-t border-[var(--color-border)] pt-5 text-base text-[var(--color-text-muted)]">
          <p>Actividad recreativa para compartir. Esta plataforma no realiza diagnósticos médicos.</p>
        </footer>
      </div>
    </main>
  );
}
