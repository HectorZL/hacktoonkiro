-- Esquema inicial del Task 2: cuidadores, jugadores y configuración.
-- Ejecutar en el SQL Editor del proyecto Supabase.
-- No se almacenan datos clínicos, video ni imágenes de cámara.
create extension if not exists pgcrypto;
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  auth_user_id uuid unique not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 120),
  first_name text check (first_name is null or char_length(trim(first_name)) between 1 and 120),
  last_name text check (last_name is null or char_length(trim(last_name)) between 1 and 120),
  institution text check (institution is null or char_length(trim(institution)) between 1 and 180),
  role text not null default 'caregiver' check (role = 'caregiver'),
  created_at timestamptz not null default timezone('utc', now())
);
alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists institution text;
create table if not exists public.caregiver_players (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid not null references public.profiles(id) on delete cascade,
  player_name text not null check (char_length(trim(player_name)) between 1 and 120),
  avatar_key text,
  created_at timestamptz not null default timezone('utc', now())
);
create table if not exists public.player_settings (
  player_id uuid primary key references public.caregiver_players(id) on delete cascade,
  input_mode text not null default 'keyboard' check (input_mode in ('keyboard', 'touch', 'hand')),
  assistance_level text not null default 'guided' check (assistance_level in ('basic', 'guided', 'assisted')),
  updated_at timestamptz not null default timezone('utc', now())
);
alter table public.profiles enable row level security;
alter table public.caregiver_players enable row level security;
alter table public.player_settings enable row level security;
create policy "caregivers can read their profile"
on public.profiles for select
to authenticated
using (auth.uid() = auth_user_id);
create policy "caregivers can create their profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = auth_user_id and role = 'caregiver');
create policy "caregivers can update their profile"
on public.profiles for update
to authenticated
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id and role = 'caregiver');
create policy "caregivers can read their players"
on public.caregiver_players for select
to authenticated
using (auth.uid() = caregiver_id);
create policy "caregivers can create their players"
on public.caregiver_players for insert
to authenticated
with check (auth.uid() = caregiver_id);
create policy "caregivers can update their players"
on public.caregiver_players for update
to authenticated
using (auth.uid() = caregiver_id)
with check (auth.uid() = caregiver_id);
create policy "caregivers can delete their players"
on public.caregiver_players for delete
to authenticated
using (auth.uid() = caregiver_id);
create policy "caregivers can read their player settings"
on public.player_settings for select
to authenticated
using (
  exists (
    select 1
    from public.caregiver_players
    where caregiver_players.id = player_settings.player_id
      and caregiver_players.caregiver_id = auth.uid()
  )
);
create policy "caregivers can create their player settings"
on public.player_settings for insert
to authenticated
with check (
  exists (
    select 1
    from public.caregiver_players
    where caregiver_players.id = player_settings.player_id
      and caregiver_players.caregiver_id = auth.uid()
  )
);
create policy "caregivers can update their player settings"
on public.player_settings for update
to authenticated
using (
  exists (
    select 1
    from public.caregiver_players
    where caregiver_players.id = player_settings.player_id
      and caregiver_players.caregiver_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.caregiver_players
    where caregiver_players.id = player_settings.player_id
      and caregiver_players.caregiver_id = auth.uid()
  )
);
-- Task 10: sesiones de actividad con datos mínimos, sin datos clínicos ni video.
create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.caregiver_players(id) on delete cascade,
  game_key text not null check (char_length(trim(game_key)) between 1 and 80),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_seconds integer not null check (duration_seconds >= 0),
  input_mode text not null check (input_mode in ('keyboard', 'touch', 'hand')),
  assistance_level text not null check (assistance_level in ('basic', 'guided', 'assisted')),
  created_at timestamptz not null default timezone('utc', now()),
  check (ended_at >= started_at)
);
create index if not exists game_sessions_player_started_idx
  on public.game_sessions (player_id, started_at desc);
alter table public.game_sessions enable row level security;
create policy "caregivers can read their game sessions"
on public.game_sessions for select
to authenticated
using (
  exists (
    select 1
    from public.caregiver_players
    where caregiver_players.id = game_sessions.player_id
      and caregiver_players.caregiver_id = auth.uid()
  )
);
create policy "caregivers can create their game sessions"
on public.game_sessions for insert
to authenticated
with check (
  exists (
    select 1
    from public.caregiver_players
    where caregiver_players.id = game_sessions.player_id
      and caregiver_players.caregiver_id = auth.uid()
  )
);
-- Partidas competitivas dirigidas por un cuidador.
-- Se guardan resultados recreativos; no se almacenan datos clínicos ni secretos de las rondas.
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
