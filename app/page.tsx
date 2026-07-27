"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function Home() {
  const router = useRouter();
  const supabaseConfigured = isSupabaseConfigured();

  useEffect(() => {
    let active = true;

    async function redirectToDefault() {
      try {
        if (!supabaseConfigured) {
          router.replace("/juegos");
          return;
        }

        const { data } = await createClient().auth.getSession();
        router.replace(data.session ? "/juegos" : "/login?next=/juegos");
      } catch {
        router.replace("/login?next=/juegos");
      } finally {
        if (active) {
          // La navegación continúa aunque el componente se desmonte durante el redirect.
          active = false;
        }
      }
    }

    void redirectToDefault();
    return () => {
      active = false;
    };
  }, [router, supabaseConfigured]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <p role="status" className="rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-6 text-2xl font-bold shadow-[var(--shadow-card)]">
        Abriendo la sala de juegos…
      </p>
    </main>
  );
}
