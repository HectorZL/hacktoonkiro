-- Crea el registro de partidas grupales usado por Trivia, Animales,
-- Impostor y Charadas.

create table if not exists public.competition_sessions (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid not null references public.profiles(id) on delete cascade,
  game_key text not null check (game_key in ('trivia-ecuador', 'animales', 'impostor', 'charadas')),
  rounds integer not null check (rounds between 1 and 20),
  turn_seconds integer not null check (turn_seconds between 15 and 180),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  check (ended_at >= started_at)
);

create table if not exists public.competition_scores (
  id uuid primary key default gen_random_uuid(),
  competition_session_id uuid not null references public.competition_sessions(id) on delete cascade,
  player_id uuid not null references public.caregiver_players(id) on delete cascade,
  player_name text not null check (char_length(trim(player_name)) between 1 and 120),
  score integer not null default 0 check (score >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (competition_session_id, player_id)
);

create index if not exists competition_sessions_caregiver_started_idx
  on public.competition_sessions (caregiver_id, started_at desc);

create index if not exists competition_scores_session_idx
  on public.competition_scores (competition_session_id);

alter table public.competition_sessions enable row level security;
alter table public.competition_scores enable row level security;

drop policy if exists "caregivers can read their competition sessions" on public.competition_sessions;
create policy "caregivers can read their competition sessions"
on public.competition_sessions for select
to authenticated
using (auth.uid() = caregiver_id);

drop policy if exists "caregivers can create their competition sessions" on public.competition_sessions;
create policy "caregivers can create their competition sessions"
on public.competition_sessions for insert
to authenticated
with check (auth.uid() = caregiver_id);

drop policy if exists "caregivers can read their competition scores" on public.competition_scores;
create policy "caregivers can read their competition scores"
on public.competition_scores for select
to authenticated
using (
  exists (
    select 1
    from public.competition_sessions
    where competition_sessions.id = competition_scores.competition_session_id
      and competition_sessions.caregiver_id = auth.uid()
  )
);

drop policy if exists "caregivers can create their competition scores" on public.competition_scores;
create policy "caregivers can create their competition scores"
on public.competition_scores for insert
to authenticated
with check (
  exists (
    select 1
    from public.competition_sessions
    join public.caregiver_players
      on caregiver_players.id = competition_scores.player_id
    where competition_sessions.id = competition_scores.competition_session_id
      and competition_sessions.caregiver_id = auth.uid()
      and caregiver_players.caregiver_id = auth.uid()
  )
);
