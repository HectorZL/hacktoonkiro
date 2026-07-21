"use client";

import { useCallback, useEffect, useState } from "react";

export default function Home() {
  const [feedback, setFeedback] = useState("Aún no se ha realizado ninguna acción.");
  const [actionCount, setActionCount] = useState(0);

  const registerAction = useCallback(() => {
    setActionCount((currentCount) => currentCount + 1);
    setFeedback("Acción recibida. Puedes continuar cuando quieras.");
  }, []);

  useEffect(() => {
    function handleSpacebar(event: KeyboardEvent) {
      if (event.code !== "Space" || event.repeat) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target?.closest("button, a, input, textarea, select")) {
        return;
      }

      event.preventDefault();
      registerAction();
    }

    window.addEventListener("keydown", handleSpacebar);
    return () => window.removeEventListener("keydown", handleSpacebar);
  }, [registerAction]);

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <p className="font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
            Plataforma de juegos accesibles
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="/perfiles"
              className="w-fit rounded-xl border-2 border-[var(--color-primary)] px-5 py-3 font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]"
            >
              Gestionar perfiles de jugadores
            </a>
            <a
              href="/entrada"
              className="w-fit rounded-xl border-2 border-[var(--color-primary)] px-5 py-3 font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]"
            >
              Probar entradas
            </a>
            <a
              href="/motor"
              className="w-fit rounded-xl border-2 border-[var(--color-primary)] px-5 py-3 font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]"
            >
              Probar motor de juego
            </a>
            <a
              href="/juegos/carrera-sacos"
              className="w-fit rounded-xl border-2 border-[var(--color-primary)] px-5 py-3 font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]"
            >
              Jugar Carrera de sacos
            </a>
            <a
              href="/juegos/trompo"
              className="w-fit rounded-xl border-2 border-[var(--color-primary)] px-5 py-3 font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]"
            >
              Jugar Lanzamiento del trompo
            </a>
            <a
              href="/juegos/jardin-virtual"
              className="w-fit rounded-xl border-2 border-[var(--color-primary)] px-5 py-3 font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]"
            >
              Visitar El Jardín Virtual
            </a>
          </div>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Una acción sencilla para comenzar
          </h1>
          <p className="max-w-2xl text-xl text-[var(--color-text-muted)]">
            Esta es la pantalla inicial del proyecto. En los juegos podrás usar
            una pulsación de la barra espaciadora o un toque grande en la pantalla.
          </p>
        </header>

        <section
          aria-labelledby="demo-title"
          className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-10"
        >
          <div className="flex flex-col gap-6">
            <div>
              <p className="mb-2 text-base font-semibold text-[var(--color-primary)]">
                Demostración del Task 1
              </p>
              <h2 id="demo-title" className="text-3xl font-bold">
                Prueba la acción principal
              </h2>
              <p className="mt-3 max-w-2xl text-[var(--color-text-muted)]">
                Pulsa la barra espaciadora en tu computadora o toca el botón una
                sola vez. No necesitas mantenerlo presionado.
              </p>
            </div>

            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={registerAction}
                className="min-h-16 w-full rounded-2xl bg-[var(--color-primary)] px-8 py-4 text-xl font-bold text-[var(--color-primary-contrast)] transition-colors hover:bg-[var(--color-primary-hover)] sm:w-auto"
              >
                Realizar acción
              </button>
              <p className="text-base text-[var(--color-text-muted)]">
                Acciones realizadas: <strong>{actionCount}</strong>
              </p>
            </div>

            <div
              aria-live="polite"
              aria-atomic="true"
              className="rounded-xl border border-[var(--color-success)] bg-[var(--color-success-surface)] p-5 text-lg font-semibold text-[var(--color-success)]"
            >
              <span aria-hidden="true" className="mr-2">
                ✓
              </span>
              {feedback}
            </div>
          </div>
        </section>

        <nav
          aria-label="Características de accesibilidad"
          className="grid gap-4 sm:grid-cols-3"
        >
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h2 className="text-xl font-bold">Entrada simple</h2>
            <p className="mt-2 text-[var(--color-text-muted)]">
              Una tecla o un toque, sin combinaciones.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h2 className="text-xl font-bold">Feedback visible</h2>
            <p className="mt-2 text-[var(--color-text-muted)]">
              Cada acción tiene una confirmación escrita y visual.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h2 className="text-xl font-bold">Ritmo tranquilo</h2>
            <p className="mt-2 text-[var(--color-text-muted)]">
              Sin movimientos rápidos ni precisión fina.
            </p>
          </div>
        </nav>

        <footer className="border-t border-[var(--color-border)] pt-5 text-base text-[var(--color-text-muted)]">
          <p>
            Prototipo no clínico. La plataforma mostrará actividad de juego, no
            diagnósticos médicos.
          </p>
        </footer>
      </div>
    </main>
  );
}
