"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type AvatarKey = "sun" | "flower" | "leaf" | "star";
type AuthMode = "sign-in" | "sign-up";

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
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [demoReady, setDemoReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const selectedPlayer = useMemo(
    () => players.find((player) => player.id === selectedPlayerId) ?? null,
    [players, selectedPlayerId],
  );

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

  async function ensureCaregiverProfile(caregiverId: string, caregiverEmail: string) {
    const supabase = createClient();
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: caregiverId,
        auth_user_id: caregiverId,
        display_name: caregiverEmail.split("@")[0] || "Cuidador",
        role: "caregiver",
      },
      { onConflict: "id" },
    );

    if (profileError) {
      throw profileError;
    }
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const supabase = createClient();
      const result =
        authMode === "sign-in"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });

      if (result.error) {
        throw result.error;
      }

      if (!result.data.user) {
        throw new Error("Supabase no devolvió un usuario.");
      }

      if (authMode === "sign-up" && !result.data.session) {
        setNotice("Cuenta creada. Revisa tu correo si Supabase solicita confirmación antes de iniciar sesión.");
      } else {
        await ensureCaregiverProfile(result.data.user.id, email);
        setUserId(result.data.user.id);
        await loadSupabasePlayers(result.data.user.id);
        setNotice("Sesión iniciada. Ya puedes administrar los perfiles.");
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "No se pudo completar la autenticación.");
    } finally {
      setSubmitting(false);
    }
  }

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
      setNotice(`Perfil de ${name} creado correctamente.`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear el perfil.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <Link className="w-fit font-semibold text-[var(--color-primary)] underline" href="/">
            ← Volver al inicio
          </Link>
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

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <section
            aria-labelledby="players-title"
            className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8"
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
                    <div key={player.id} role="listitem">
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setSelectedPlayerId(player.id)}
                        className={`min-h-36 w-full rounded-2xl border-4 p-5 text-left transition-colors ${
                          selected
                            ? "border-[var(--color-primary)] bg-[#e0f2fe]"
                            : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)]"
                        }`}
                      >
                        <span className="flex items-center gap-4">
                          <span
                            aria-label={`Avatar ${avatar.label}`}
                            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#fef3c7] text-4xl"
                          >
                            {avatar.symbol}
                          </span>
                          <span>
                            <span className="block text-2xl font-bold">{player.name}</span>
                            <span className="mt-1 block text-base text-[var(--color-text-muted)]">
                              {selected ? "Perfil seleccionado" : "Seleccionar perfil"}
                            </span>
                          </span>
                        </span>
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

          <aside className="flex flex-col gap-6">
            <section
              aria-labelledby="create-title"
              className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]"
            >
              <h2 id="create-title" className="text-2xl font-bold">Crear jugador</h2>
              <p className="mt-2 text-[var(--color-text-muted)]">
                Solo pedimos un nombre y un avatar opcional.
              </p>
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

            <section
              aria-labelledby="auth-title"
              className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]"
            >
              <h2 id="auth-title" className="text-2xl font-bold">Acceso del cuidador</h2>
              {supabaseConfigured ? (
                <form className="mt-4 flex flex-col gap-4" onSubmit={handleAuth}>
                  <label className="flex flex-col gap-2 font-semibold" htmlFor="caregiver-email">
                    Correo electrónico
                    <input
                      id="caregiver-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="min-h-12 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4"
                    />
                  </label>
                  <label className="flex flex-col gap-2 font-semibold" htmlFor="caregiver-password">
                    Contraseña
                    <input
                      id="caregiver-password"
                      type="password"
                      autoComplete={authMode === "sign-in" ? "current-password" : "new-password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="min-h-12 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="min-h-12 rounded-xl border-2 border-[var(--color-primary)] px-5 font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)] disabled:opacity-60"
                  >
                    {authMode === "sign-in" ? "Iniciar sesión" : "Crear cuenta"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode(authMode === "sign-in" ? "sign-up" : "sign-in")}
                    className="min-h-12 text-left font-semibold text-[var(--color-primary)] underline"
                  >
                    {authMode === "sign-in"
                      ? "Soy un cuidador nuevo: crear cuenta"
                      : "Ya tengo cuenta: iniciar sesión"}
                  </button>
                </form>
              ) : (
                <p className="mt-4 rounded-xl border border-[#92400e] bg-[#fef3c7] p-4 text-base text-[#78350f]">
                  Supabase todavía no está configurado. Estás usando el modo demo local; los perfiles se guardan solo en este navegador.
                </p>
              )}
            </section>
          </aside>
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
