-- Alinea la tabla de sesiones con el contrato usado por la aplicación.
-- Conserva las sesiones existentes creadas con el esquema legado.

alter table public.game_sessions
  add column if not exists started_at timestamptz,
  add column if not exists ended_at timestamptz;

update public.game_sessions
set
  started_at = coalesce(
    started_at,
    created_at,
    timezone('utc', now())
  ),
  ended_at = coalesce(
    ended_at,
    coalesce(created_at, timezone('utc', now()))
      + (greatest(coalesce(duration_seconds, 0), 0) * interval '1 second')
  )
where started_at is null
   or ended_at is null;

alter table public.game_sessions
  alter column started_at set not null,
  alter column ended_at set not null;

create index if not exists game_sessions_player_started_idx
  on public.game_sessions (player_id, started_at desc);
