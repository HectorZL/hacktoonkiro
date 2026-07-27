"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { href: "/perfil", label: "Mi perfil" },
  { href: "/perfiles", label: "Perfiles" },
  { href: "/juegos", label: "Juegos" },
  { href: "/cuidador", label: "Actividad" },
];

function isCurrentPath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="sticky top-0 z-40 -mx-[clamp(1rem,3vw,3rem)] mb-8 border-b border-[var(--color-border)] bg-[var(--color-background)]/95 px-[clamp(1rem,3vw,3rem)] py-3 shadow-[0_0.5rem_1.5rem_rgb(31_41_51_/_0.08)] backdrop-blur sm:py-4"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <Link
          href="/"
          className="flex w-fit items-center gap-3 rounded-xl no-underline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-focus)]"
        >
          <span
            aria-hidden="true"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-xl font-bold text-[var(--color-primary-contrast)] shadow-[var(--shadow-card)]"
          >
            MA
          </span>
          <span className="leading-tight">
            <span className="block text-xl font-bold text-[var(--color-text)]">Mente Activa</span>
            <span className="block text-sm font-semibold text-[var(--color-text-muted)]">Espacio del cuidador</span>
          </span>
        </Link>

        <div className="flex flex-wrap gap-2">
          {navigationItems.map((item) => {
            const current = isCurrentPath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={`inline-flex min-h-12 items-center rounded-xl border-2 px-4 py-2 text-base font-bold no-underline transition-colors focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] ${
                  current
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-contrast)]"
                    : "border-transparent text-[var(--color-primary)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
