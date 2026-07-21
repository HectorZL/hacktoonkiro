const games = [
  {
    href: "/juegos/carrera-sacos",
    icon: "🏃",
    name: "Carrera de sacos",
    description: "Avanza y salta obstáculos con un toque.",
    color: "bg-[#155e75] hover:bg-[#104c5f]",
  },
  {
    href: "/juegos/trompo",
    icon: "🌀",
    name: "Lanzamiento del trompo",
    description: "Haz girar el trompo en el momento indicado.",
    color: "bg-[#7c3f00] hover:bg-[#633300]",
  },
  {
    href: "/juegos/jardin-virtual",
    icon: "🌻",
    name: "El Jardín Virtual",
    description: "Cuida las plantas a tu propio ritmo.",
    color: "bg-[#166534] hover:bg-[#12522a]",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="rounded-[var(--radius-card)] bg-[var(--color-surface)] px-5 py-7 text-center shadow-[var(--shadow-card)] sm:px-10 sm:py-10">
          <p className="text-lg font-bold text-[var(--color-primary)]">
            Juegos para disfrutar
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
            ¿Qué quieres jugar hoy?
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-xl text-[var(--color-text-muted)] sm:text-2xl">
            Elige un juego y toca el botón grande que dice <strong>Jugar</strong>.
          </p>
        </header>

        <section aria-labelledby="games-title">
          <h2 id="games-title" className="mb-5 text-center text-3xl font-bold">
            Elige un juego
          </h2>

          <div className="grid gap-5 lg:grid-cols-3">
            {games.map((game) => (
              <article
                key={game.href}
                className="flex flex-col rounded-[var(--radius-card)] border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]"
              >
                <span
                  aria-hidden="true"
                  className="mb-3 text-center text-6xl leading-none"
                >
                  {game.icon}
                </span>
                <h3 className="text-center text-2xl font-bold">{game.name}</h3>
                <p className="mt-3 flex-1 text-center text-lg text-[var(--color-text-muted)]">
                  {game.description}
                </p>
                <a
                  href={game.href}
                  className={`mt-6 flex min-h-16 w-full items-center justify-center rounded-2xl px-6 py-4 text-center text-2xl font-bold text-white no-underline ${game.color}`}
                  aria-label={`Jugar ${game.name}`}
                >
                  Jugar
                </a>
              </article>
            ))}
          </div>
        </section>

        <aside
          aria-labelledby="support-title"
          className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5 sm:p-7"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 id="support-title" className="text-2xl font-bold">
                Opciones para familiares y cuidadores
              </h2>
              <p className="mt-1 text-[var(--color-text-muted)]">
                No necesitas entrar aquí para comenzar a jugar.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="/perfiles"
                className="flex min-h-14 items-center justify-center rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-surface)] px-5 py-3 text-center font-bold text-[var(--color-primary)] no-underline hover:bg-white"
              >
                Elegir jugador
              </a>
              <a
                href="/cuidador"
                className="flex min-h-14 items-center justify-center rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-surface)] px-5 py-3 text-center font-bold text-[var(--color-primary)] no-underline hover:bg-white"
              >
                Zona del cuidador
              </a>
            </div>
          </div>
        </aside>

        <footer className="pb-3 text-center text-base text-[var(--color-text-muted)]">
          <p>Actividad recreativa. Esta plataforma no realiza diagnósticos médicos.</p>
        </footer>
      </div>
    </main>
  );
}
