"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppNavigation } from "@/app/components/app-navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type CaregiverProfile = {
  firstName: string;
  lastName: string;
  institution: string;
};

const demoProfileStorageKey = "mente-activa:caregiver-profile";
const emptyProfile: CaregiverProfile = {
  firstName: "",
  lastName: "",
  institution: "",
};

function getDisplayName(profile: CaregiverProfile, email: string) {
  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  return fullName || email.split("@")[0] || "Cuidador";
}

export default function CaregiverProfilePage() {
  const router = useRouter();
  const supabaseConfigured = isSupabaseConfigured();
  const [profile, setProfile] = useState<CaregiverProfile>(emptyProfile);
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setLoading(true);
      setError("");

      if (!supabaseConfigured) {
        try {
          const storedProfile = window.localStorage.getItem(demoProfileStorageKey);
          if (active && storedProfile) {
            const parsedProfile = JSON.parse(storedProfile) as Partial<CaregiverProfile>;
            setProfile({
              firstName: parsedProfile.firstName ?? "",
              lastName: parsedProfile.lastName ?? "",
              institution: parsedProfile.institution ?? "",
            });
          }
        } catch {
          if (active) {
            setError("No se pudo recuperar el perfil local.");
          }
        } finally {
          if (active) {
            setEmail("Modo demo");
            setLoading(false);
          }
        }
        return;
      }

      try {
        const supabase = createClient();
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) {
          if (userError.name === "AuthSessionMissingError" || userError.message === "Auth session missing!") {
            router.replace("/login?next=/perfil");
            return;
          }
          throw userError;
        }

        if (!userData.user) {
          router.replace("/login?next=/perfil");
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("first_name, last_name, institution")
          .eq("id", userData.user.id)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (active) {
          setUserId(userData.user.id);
          setEmail(userData.user.email ?? "");
          setProfile({
            firstName: profileData?.first_name ?? "",
            lastName: profileData?.last_name ?? "",
            institution: profileData?.institution ?? "",
          });
          setLoading(false);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el perfil.");
          setLoading(false);
        }
      }
    }

    void loadProfile();
    return () => {
      active = false;
    };
  }, [router, supabaseConfigured]);

  function updateProfile(field: keyof CaregiverProfile, value: string) {
    setProfile((currentProfile) => ({ ...currentProfile, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const firstName = profile.firstName.trim();
    const lastName = profile.lastName.trim();
    const institution = profile.institution.trim();

    if (!firstName || !lastName || !institution) {
      setError("Completa nombre, apellido e institución para guardar tu perfil.");
      setNotice("");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const cleanProfile = { firstName, lastName, institution };
      if (!supabaseConfigured) {
        window.localStorage.setItem(demoProfileStorageKey, JSON.stringify(cleanProfile));
      } else {
        if (!userId) {
          throw new Error("Tu sesión no está disponible. Vuelve a iniciar sesión.");
        }

        const { error: profileError } = await createClient().from("profiles").upsert(
          {
            id: userId,
            auth_user_id: userId,
            display_name: getDisplayName(cleanProfile, email),
            first_name: firstName,
            last_name: lastName,
            institution,
            role: "caregiver",
          },
          { onConflict: "id" },
        );

        if (profileError) {
          throw profileError;
        }
      }

      setProfile(cleanProfile);
      setNotice("Perfil guardado correctamente.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el perfil.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    setError("");

    try {
      if (supabaseConfigured) {
        const { error: signOutError } = await createClient().auth.signOut();
        if (signOutError) {
          throw signOutError;
        }
      }
      router.replace("/login");
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "No se pudo cerrar la sesión.");
      setSigningOut(false);
    }
  }

  return (
    <main className="min-h-screen px-[clamp(1rem,3vw,3rem)] py-[clamp(1.25rem,3vw,3rem)]">
      <AppNavigation />
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-8">
          <p className="font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">Cuenta del cuidador</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-6xl">Mi perfil</h1>
          <p className="mt-4 max-w-3xl text-xl text-[var(--color-text-muted)] sm:text-2xl">
            Mantén tus datos actualizados para identificar el centro o institución desde donde acompañas las actividades.
          </p>
        </header>

        {loading ? (
          <p role="status" className="rounded-[var(--radius-card)] bg-[var(--color-surface-muted)] p-6 text-xl font-semibold">
            Cargando tu perfil…
          </p>
        ) : (
          <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]" aria-label="Perfil del cuidador">
            <form
              className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8"
              onSubmit={handleSubmit}
            >
              <h2 className="text-3xl font-bold">Datos personales</h2>
              <p className="mt-2 text-[var(--color-text-muted)]">Estos datos ayudan a reconocer al cuidador responsable de la cuenta.</p>

              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <label className="flex flex-col gap-2 font-bold" htmlFor="caregiver-first-name">
                  Nombre
                  <input
                    id="caregiver-first-name"
                    type="text"
                    autoComplete="given-name"
                    required
                    value={profile.firstName}
                    onChange={(event) => updateProfile("firstName", event.target.value)}
                    className="min-h-14 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4"
                  />
                </label>
                <label className="flex flex-col gap-2 font-bold" htmlFor="caregiver-last-name">
                  Apellido
                  <input
                    id="caregiver-last-name"
                    type="text"
                    autoComplete="family-name"
                    required
                    value={profile.lastName}
                    onChange={(event) => updateProfile("lastName", event.target.value)}
                    className="min-h-14 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4"
                  />
                </label>
              </div>

              <label className="mt-5 flex flex-col gap-2 font-bold" htmlFor="caregiver-institution">
                Institución a la que pertenece
                <input
                  id="caregiver-institution"
                  type="text"
                  autoComplete="organization"
                  required
                  value={profile.institution}
                  onChange={(event) => updateProfile("institution", event.target.value)}
                  placeholder="Ejemplo: Centro de día Los Andes"
                  className="min-h-14 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4"
                />
              </label>

              <button
                type="submit"
                disabled={saving}
                className="mt-7 min-h-16 w-full rounded-2xl bg-[var(--color-primary)] px-5 text-xl font-bold text-[var(--color-primary-contrast)] hover:bg-[var(--color-primary-hover)] disabled:cursor-wait disabled:opacity-60"
              >
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </form>

            <aside className="flex flex-col rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-6 sm:p-8" aria-labelledby="account-title">
              <h2 id="account-title" className="text-3xl font-bold">Cuenta</h2>
              <p className="mt-2 text-[var(--color-text-muted)]">Correo de acceso</p>
              <p className="mt-1 break-words text-lg font-bold">{email || "No disponible"}</p>
              <p className="mt-6 text-[var(--color-text-muted)]">
                Puedes actualizar tus datos cuando cambies de institución o necesites corregir tu información.
              </p>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={signingOut}
                className="mt-auto min-h-14 rounded-2xl border-2 border-[var(--color-danger)] px-5 font-bold text-[var(--color-danger-contrast)] hover:bg-[var(--color-danger-surface)] disabled:cursor-wait disabled:opacity-60"
              >
                {signingOut ? "Cerrando sesión…" : "Cerrar sesión"}
              </button>
            </aside>
          </section>
        )}

        {notice ? (
          <p role="status" className="mt-6 rounded-xl border border-[var(--color-success)] bg-[var(--color-success-surface)] p-4 font-semibold text-[var(--color-success)]">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-6 rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-surface)] p-4 font-semibold text-[var(--color-danger-contrast)]">
            {error}
          </p>
        ) : null}
      </div>
    </main>
  );
}
