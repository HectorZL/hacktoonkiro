"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AppNavigation } from "@/app/components/app-navigation";
import { setActivePlayer } from "@/lib/sessions/manager";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type AvatarKey = "sun" | "flower" | "leaf" | "star";

type Player = {
  id: string;
  name: string;
  avatarKey: AvatarKey;
  inputMode: "keyboard" | "touch" | "hand";
  assistanceLevel: "basic" | "guided" | "assisted";
};

const avatarOptions: Array<{ key: AvatarKey; label: string; symbol: string }> = [
  { key: "sun", label: "Sol", symbol: "☀" },
  { key: "flower", label: "Flor", symbol: "✿" },
  { key: "leaf", label: "Hoja", symbol: "❧" },
  { key: "star", label: "Estrella", symbol: "★" },
];

const defaultPlayers: Player[] = [
  {
    id: "demo-maria",
    name: "María",
    avatarKey: "flower",
    inputMode: "keyboard",
    assistanceLevel: "guided",
  },
  {
    id: "demo-jose",
    name: "José",
    avatarKey: "sun",
    inputMode: "touch",
    assistanceLevel: "assisted",
  },
];

const demoStorageKey = "hacktoonkiro:players";

function getAvatar(avatarKey: AvatarKey) {
  return avatarOptions.find((avatar) => avatar.key === avatarKey) ?? avatarOptions[0];
}

export default function ProfilesPage() {
  const supabaseConfigured = isSupabaseConfigured();
  const [players, setPlayers] = useState<Player[]>(defaultPlayers);
  const [selectedPlayerId, setSelectedPlayerId] = useState(defaultPlayers[0].id);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newAvatarKey, setNewAvatarKey] = useState<AvatarKey>("sun");
  const [userId, setUserId] = useState<string | null>(null);
  const [createPlayerOpen, setCreatePlayerOpen] = useState(false);
  const [demoReady, setDemoReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const selectedPlayer = useMemo(
    () => players.find((player) => player.id === selectedPlayerId) ?? null,
    [players, selectedPlayerId],
  );

  useEffect(() => {
    setActivePlayer(selectedPlayer ? { id: selectedPlayer.id, name: selectedPlayer.name } : null);
  }, [selectedPlayer]);

  const loadSupabasePlayers = useCallback(async (caregiverId: string) => {
    const supabase = createClient();
    const { data, error: loadError } = await supabase
      .from("caregiver_players")
      .select("id, player_name, avatar_key, player_settings(input_mode, assistance_level)")
      .eq("caregiver_id", caregiverId)
      .order("created_at", { ascending: true });

    if (loadError) {
      throw loadError;
    }

    const loadedPlayers: Player[] = (data ?? []).map((player) => {
      const settings = Array.isArray(player.player_settings)
        ? player.player_settings[0]
        : player.player_settings;

      return {
        id: player.id,
        name: player.player_name,
        avatarKey: (player.avatar_key as AvatarKey) ?? "sun",
        inputMode: settings?.input_mode ?? "keyboard",
        assistanceLevel: settings?.assistance_level ?? "guided",
      };
    });

    setPlayers(loadedPlayers);
    setSelectedPlayerId(loadedPlayers[0]?.id ?? "");
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) {
      let active = true;
      const timeoutId = window.setTimeout(() => {
        try {
          const storedPlayers = window.localStorage.getItem(demoStorageKey);
          if (storedPlayers) {
            const parsedPlayers = JSON.parse(storedPlayers) as Player[];
            if (active && Array.isArray(parsedPlayers) && parsedPlayers.length > 0) {
              setPlayers(parsedPlayers);
              setSelectedPlayerId(parsedPlayers[0].id);
            }
          }
        } catch {
          if (active) {
            setNotice("No se pudo recuperar la demo local; se usarán perfiles de ejemplo.");
          }
        } finally {
          if (active) {
            setDemoReady(true);
            setLoading(false);
          }
        }
      }, 0);

      return () => {
        active = false;
        window.clearTimeout(timeoutId);
      };
    }

    let active = true;
    const supabase = createClient();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setUserId(session?.user.id ?? null);
      }
    });

    void supabase.auth.getUser().then(async ({ data, error: userError }) => {
      if (!active) {
        return;
      }
      if (userError) {
        setError(userError.message);
        setLoading(false);
        return;
      }
      if (!data.user) {
        setLoading(false);
        return;
      }

      setUserId(data.user.id);
      try {
        await loadSupabasePlayers(data.user.id);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los perfiles.");
      } finally {
        setLoading(false);
      }
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadSupabasePlayers, supabaseConfigured]);

  useEffect(() => {
    if (!supabaseConfigured && demoReady) {
      window.localStorage.setItem(demoStorageKey, JSON.stringify(players));
    }
  }, [demoReady, players, supabaseConfigured]);

  async function handleSignOut() {
    if (!supabaseConfigured) {
      return;
    }
    await createClient().auth.signOut();
    setUserId(null);
    setPlayers([]);
    setSelectedPlayerId("");
    setNotice("Sesión cerrada.");
  }

  async function handleCreatePlayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newPlayerName.trim();
    if (!name) {
      setError("Escribe un nombre para crear el perfil.");
      return;
    }
    if (supabaseConfigured && !userId) {
      setError("Inicia sesión como cuidador antes de crear un perfil.");
      return;
    }

    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      if (!supabaseConfigured) {
        const newPlayer: Player = {
          id: `demo-${Date.now()}`,
          name,
          avatarKey: newAvatarKey,
          inputMode: "keyboard",
          assistanceLevel: "guided",
        };
        setPlayers((currentPlayers) => [...currentPlayers, newPlayer]);
        setSelectedPlayerId(newPlayer.id);
      } else {
        const supabase = createClient();
        const { data: player, error: playerError } = await supabase
          .from("caregiver_players")
          .insert({ caregiver_id: userId, player_name: name, avatar_key: newAvatarKey })
          .select("id")
          .single();

        if (playerError) {
          throw playerError;
        }

        const { error: settingsError } = await supabase.from("player_settings").insert({
          player_id: player.id,
          input_mode: "keyboard",
          assistance_level: "guided",
        });

        if (settingsError) {
          throw settingsError;
        }

        await loadSupabasePlayers(userId as string);
        setSelectedPlayerId(player.id);
      }

      setNewPlayerName("");
      setCreatePlayerOpen(false);
      setNotice(`Perfil de ${name} creado correctamente.`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear el perfil.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeletePlayer(playerId: string, playerName: string) {
    if (!window.confirm(`¿Estás seguro de eliminar el perfil de ${playerName}? Esta acción no se puede deshacer.`)) {
      return;
    }

    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      if (!supabaseConfigured) {
        setPlayers((currentPlayers) => {
          const filtered = currentPlayers.filter((player) => player.id !== playerId);
          if (filtered.length > 0 && selectedPlayerId === playerId) {
            setSelectedPlayerId(filtered[0].id);
          } else if (filtered.length === 0) {
            setSelectedPlayerId("");
          }
          return filtered;
        });
      } else {
        if (!userId) {
          throw new Error("Inicia sesión como cuidador antes de eliminar un perfil.");
        }

        const supabase = createClient();

        // Eliminar configuraciones del jugador
        const { error: settingsError } = await supabase
          .from("player_settings")
          .delete()
          .eq("player_id", playerId);

        if (settingsError) {
          throw settingsError;
        }

        // Eliminar el jugador
        const { error: playerError } = await supabase
          .from("caregiver_players")
          .delete()
          .eq("id", playerId)
          .eq("caregiver_id", userId);

        if (playerError) {
          throw playerError;
        }

        await loadSupabasePlayers(userId);

        // Actualizar selección si el jugador eliminado estaba seleccionado
        setPlayers((currentPlayers) => {
          if (currentPlayers.length > 0 && selectedPlayerId === playerId) {
            setSelectedPlayerId(currentPlayers[0].id);
          } else if (currentPlayers.length === 0) {
            setSelectedPlayerId("");
          }
          return currentPlayers;
        });
      }

      setNotice(`Perfil de ${playerName} eliminado correctamente.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el perfil.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen px-[clamp(1rem,3vw,3rem)] py-[clamp(1.25rem,3vw,3rem)]">
      <AppNavigation />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="flex flex-col gap-3">
          <p className="font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
            Task 2 · Perfiles compartidos
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            ¿Quién va a jugar hoy?
          </h1>
          <p className="max-w-3xl text-xl text-[var(--color-text-muted)]">
            El cuidador administra los perfiles. Cada jugador puede elegir su nombre y avatar antes de comenzar.
          </p>
        </header>

        <div className={createPlayerOpen ? "grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(24rem,0.85fr)]" : "grid gap-8"}>
          <section
            aria-labelledby="players-title"
            className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-7 shadow-[var(--shadow-card)] sm:p-10 lg:p-12"
          >
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 id="players-title" className="text-3xl font-bold">
                  Perfiles de jugadores
                </h2>
                <p className="mt-2 text-[var(--color-text-muted)]">
                  Toca una tarjeta para seleccionar un perfil.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  aria-expanded={createPlayerOpen}
                  aria-controls="create-player-panel"
                  onClick={() => setCreatePlayerOpen((currentOpen) => !currentOpen)}
                  className="min-h-12 rounded-xl bg-[var(--color-primary)] px-5 font-bold text-[var(--color-primary-contrast)] hover:bg-[var(--color-primary-hover)]"
                >
                  {createPlayerOpen ? "Cerrar" : "+ Nuevo jugador"}
                </button>
                {userId ? (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="min-h-12 rounded-xl border-2 border-[var(--color-primary)] px-5 font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]"
                  >
                    Cerrar sesión
                  </button>
                ) : null}
              </div>
            </div>

            {loading ? (
              <p role="status" className="rounded-xl bg-[var(--color-surface-muted)] p-5">
                Cargando perfiles…
              </p>
            ) : players.length === 0 ? (
              <p className="rounded-xl bg-[var(--color-surface-muted)] p-5">
                Todavía no hay jugadores. El cuidador puede crear el primer perfil.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2" role="list" aria-label="Perfiles disponibles">
                {players.map((player) => {
                  const avatar = getAvatar(player.avatarKey);
                  const selected = player.id === selectedPlayerId;
                  return (
                    <div key={player.id} role="listitem" className="relative">
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setSelectedPlayerId(player.id)}
                        className={`min-h-44 w-full rounded-2xl border-4 p-6 text-left transition-colors ${
                          selected
                            ? "border-[var(--color-primary)] bg-[#e0f2fe]"
                            : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)]"
                        }`}
                      >
                        <span className="flex items-center gap-4">
                          <span role="img" aria-label={`Avatar ${avatar.label}`} className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#fef3c7] text-5xl">
                            {avatar.symbol}
                          </span>
                          <span>
                            <span className="block text-3xl font-bold">{player.name}</span>
                            <span className="mt-1 block text-base text-[var(--color-text-muted)]">
                              {selected ? "Perfil seleccionado" : "Seleccionar perfil"}
                            </span>
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePlayer(player.id, player.name)}
                        disabled={submitting}
                        aria-label={`Eliminar perfil de ${player.name}`}
                        className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#991b1b] bg-[#fee2e2] text-xl font-bold text-[#7f1d1d] hover:bg-[#fecaca] disabled:cursor-not-allowed disabled:opacity-50"
                        title="Eliminar perfil"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedPlayer ? (
              <div
                aria-live="polite"
                className="mt-6 rounded-xl border border-[var(--color-success)] bg-[var(--color-success-surface)] p-5 text-lg font-semibold text-[var(--color-success)]"
              >
                <span aria-hidden="true" className="mr-2">✓</span>
                Jugador seleccionado: {selectedPlayer.name}. Listo para continuar.
              </div>
            ) : null}
          </section>

          {createPlayerOpen ? (
            <aside className="flex flex-col gap-6">
              <section
                id="create-player-panel"
                aria-labelledby="create-title"
                className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 id="create-title" className="text-2xl font-bold">Nuevo jugador</h2>
                    <p className="mt-2 text-[var(--color-text-muted)]">
                      Solo pedimos un nombre y un avatar opcional.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreatePlayerOpen(false)}
                    aria-label="Cerrar formulario de nuevo jugador"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-border)] text-xl font-bold hover:bg-[var(--color-surface-muted)]"
                  >
                    ×
                  </button>
                </div>
                <form className="mt-5 flex flex-col gap-4" onSubmit={handleCreatePlayer}>
                  <label className="flex flex-col gap-2 font-semibold" htmlFor="player-name">
                    Nombre del jugador
                    <input
                      id="player-name"
                      value={newPlayerName}
                      onChange={(event) => setNewPlayerName(event.target.value)}
                      className="min-h-12 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4"
                      maxLength={120}
                      placeholder="Ejemplo: Ana"
                    />
                  </label>
                  <fieldset>
                    <legend className="font-semibold">Avatar opcional</legend>
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      {avatarOptions.map((avatar) => (
                        <label key={avatar.key} className="cursor-pointer text-center">
                          <input
                            type="radio"
                            name="avatar"
                            value={avatar.key}
                            checked={newAvatarKey === avatar.key}
                            onChange={() => setNewAvatarKey(avatar.key)}
                            className="sr-only"
                          />
                          <span
                            className={`flex min-h-14 items-center justify-center rounded-xl border-2 text-2xl ${
                              newAvatarKey === avatar.key
                                ? "border-[var(--color-primary)] bg-[#e0f2fe]"
                                : "border-[var(--color-border)]"
                            }`}
                          >
                            {avatar.symbol}
                          </span>
                          <span className="mt-1 block text-sm">{avatar.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="min-h-14 rounded-xl bg-[var(--color-primary)] px-5 text-lg font-bold text-[var(--color-primary-contrast)] hover:bg-[var(--color-primary-hover)] disabled:cursor-wait disabled:opacity-60"
                  >
                    {submitting ? "Guardando…" : "Crear perfil"}
                  </button>
                </form>
              </section>
            </aside>
          ) : null}
        </div>

        {notice ? (
          <p role="status" className="rounded-xl border border-[var(--color-success)] bg-[var(--color-success-surface)] p-4 font-semibold text-[var(--color-success)]">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="rounded-xl border border-[#991b1b] bg-[#fee2e2] p-4 font-semibold text-[#7f1d1d]">
            {error}
          </p>
        ) : null}

        <footer className="border-t border-[var(--color-border)] pt-5 text-base text-[var(--color-text-muted)]">
          <p>
            Los perfiles solo contienen datos de identificación para compartir el dispositivo. No se guardan datos clínicos.
          </p>
        </footer>
      </div>
    </main>
  );
}
