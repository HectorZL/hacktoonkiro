"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up";

function getSafeDestination() {
  if (typeof window === "undefined") {
    return "/juegos";
  }

  const requestedDestination = new URLSearchParams(window.location.search).get("next");
  const allowedPrefixes = ["/juegos", "/perfil", "/perfiles", "/cuidador"];
  const isAllowedDestination = allowedPrefixes.some(
    (prefix) => requestedDestination === prefix || requestedDestination?.startsWith(`${prefix}/`),
  );

  return isAllowedDestination && requestedDestination ? requestedDestination : "/juegos";
}

export default function CaregiverLoginPage() {
  const router = useRouter();
  const supabaseConfigured = isSupabaseConfigured();
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checkingSession, setCheckingSession] = useState(supabaseConfigured);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabaseConfigured) {
      return;
    }

    let active = true;
    void createClient().auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) {
        return;
      }
      if (sessionError) {
        setError(sessionError.message);
        setCheckingSession(false);
        return;
      }
      if (data.session?.user) {
        router.replace(getSafeDestination());
        return;
      }
      setCheckingSession(false);
    });

    return () => {
      active = false;
    };
  }, [router, supabaseConfigured]);

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
    setNotice("");
    setError("");

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
        setNotice("Cuenta creada. Revisa tu correo para confirmar la cuenta y después inicia sesión.");
        return;
      }

      await ensureCaregiverProfile(result.data.user.id, email);
      router.push(getSafeDestination());
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "No se pudo completar el acceso.");
    } finally {
      setSubmitting(false);
    }
  }

  function enterDemo() {
    router.push("/juegos");
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 py-8">
        <p role="status" className="rounded-2xl bg-[var(--color-surface)] p-8 text-2xl font-bold shadow-[var(--shadow-card)]">Comprobando la sesión…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-[clamp(1rem,3vw,3rem)] py-[clamp(1.5rem,5vw,4rem)]">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-8 text-center">
          <p className="mt-6 font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">Acceso de gestión</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-6xl">Entrar como cuidador</h1>
          <p className="mx-auto mt-4 max-w-3xl text-xl text-[var(--color-text-muted)] sm:text-2xl">
            Desde aquí puedes preparar partidas, administrar perfiles y dirigir los juegos del centro.
          </p>
        </header>

        <section className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[1.1fr_0.9fr]" aria-label="Acceso del cuidador">
          <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-9">
            <h2 className="text-3xl font-bold">{authMode === "sign-in" ? "Iniciar sesión" : "Crear cuenta"}</h2>
            <p className="mt-2 text-[var(--color-text-muted)]">
              {authMode === "sign-in" ? "Usa el correo del cuidador del centro." : "Crea una cuenta para guardar perfiles y resultados."}
            </p>

            {supabaseConfigured ? (
              <form className="mt-7 flex flex-col gap-5" onSubmit={handleAuth}>
                <label className="flex flex-col gap-2 font-bold" htmlFor="login-email">
                  Correo electrónico
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="min-h-14 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4"
                  />
                </label>
                <label className="flex flex-col gap-2 font-bold" htmlFor="login-password">
                  Contraseña
                  <input
                    id="login-password"
                    type="password"
                    autoComplete={authMode === "sign-in" ? "current-password" : "new-password"}
                    minLength={6}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="min-h-14 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4"
                  />
                </label>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-16 rounded-2xl bg-[var(--color-primary)] px-5 text-xl font-bold text-[var(--color-primary-contrast)] hover:bg-[var(--color-primary-hover)] disabled:cursor-wait disabled:opacity-60"
                >
                  {submitting ? "Procesando…" : authMode === "sign-in" ? "Iniciar sesión" : "Crear cuenta"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"));
                    setNotice("");
                    setError("");
                  }}
                  className="min-h-12 text-left font-semibold text-[var(--color-primary)] underline"
                >
                  {authMode === "sign-in" ? "Soy un cuidador nuevo: crear cuenta" : "Ya tengo cuenta: iniciar sesión"}
                </button>
              </form>
            ) : (
              <div className="mt-7 rounded-2xl border-2 border-[var(--color-warning)] bg-[var(--color-warning-surface)] p-5 text-[var(--color-warning-contrast)]">
                <h3 className="text-2xl font-bold">Supabase no está configurado</h3>
                <p className="mt-3 text-lg">Puedes probar la sala en modo demo. Para usar cuentas reales, completa las variables de Supabase en `.env.local`.</p>
                <button type="button" onClick={enterDemo} className="mt-5 min-h-16 w-full rounded-2xl bg-[var(--color-primary)] px-5 text-xl font-bold text-white">Entrar al modo demo</button>
              </div>
            )}

            {notice ? <p role="status" className="mt-5 rounded-xl border border-[var(--color-success)] bg-[var(--color-success-surface)] p-4 font-semibold text-[var(--color-success)]">{notice}</p> : null}
            {error ? <p role="alert" className="mt-5 rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-surface)] p-4 font-semibold text-[var(--color-danger-contrast)]">{error}</p> : null}
          </div>

          <aside className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-6 sm:p-9" aria-labelledby="login-benefits-title">
            <h2 id="login-benefits-title" className="text-3xl font-bold">Después del acceso</h2>
            <ul className="mt-6 flex list-disc flex-col gap-5 pl-6 text-lg">
              <li>Selecciona a las personas que participarán.</li>
              <li>Elige Trivia, Animales, Impostor o Charadas.</li>
              <li>Configura el número de rondas.</li>
              <li>Dirige los turnos desde un solo dispositivo.</li>
            </ul>
            <Link href="/perfiles" className="mt-8 inline-flex min-h-14 items-center rounded-xl border-2 border-[var(--color-primary)] px-5 font-bold text-[var(--color-primary)] no-underline">Administrar perfiles</Link>
          </aside>
        </section>

        <footer className="mt-8 text-center text-base text-[var(--color-text-muted)]">
          <p>Los participantes no necesitan crear cuentas. Esta plataforma no guarda datos clínicos.</p>
        </footer>
      </div>
    </main>
  );
}
