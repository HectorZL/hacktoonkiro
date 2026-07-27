-- ================================================
-- SETUP SQL PARA SUPABASE
-- Plataforma de Juegos Accesibles - Mayorsperson
-- ================================================
-- Ejecuta este script en el SQL Editor de Supabase
-- ================================================
-- 1. TABLA DE PERFILES (CUIDADORES Y JUGADORES)
-- ================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  institution TEXT,
  role TEXT NOT NULL CHECK (role IN ('caregiver', 'player')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS institution TEXT;
-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
-- RLS (Row Level Security) para profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- Los usuarios pueden ver y editar su propio perfil
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR auth.uid() = auth_user_id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id OR auth.uid() = auth_user_id);
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR auth.uid() = auth_user_id);
-- 2. TABLA DE JUGADORES GESTIONADOS POR CUIDADORES
-- ================================================
CREATE TABLE IF NOT EXISTS caregiver_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  avatar_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Índices
CREATE INDEX IF NOT EXISTS idx_caregiver_players_caregiver_id ON caregiver_players(caregiver_id);
-- RLS para caregiver_players
ALTER TABLE caregiver_players ENABLE ROW LEVEL SECURITY;
-- Los cuidadores pueden gestionar sus propios jugadores
CREATE POLICY "Caregivers can view own players"
  ON caregiver_players FOR SELECT
  USING (auth.uid() = caregiver_id);
CREATE POLICY "Caregivers can insert own players"
  ON caregiver_players FOR INSERT
  WITH CHECK (auth.uid() = caregiver_id);
CREATE POLICY "Caregivers can update own players"
  ON caregiver_players FOR UPDATE
  USING (auth.uid() = caregiver_id);
CREATE POLICY "Caregivers can delete own players"
  ON caregiver_players FOR DELETE
  USING (auth.uid() = caregiver_id);
-- 3. TABLA DE CONFIGURACIÓN DE JUGADORES
-- ================================================
CREATE TABLE IF NOT EXISTS player_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES caregiver_players(id) ON DELETE CASCADE,
  input_mode TEXT NOT NULL DEFAULT 'keyboard' CHECK (input_mode IN ('keyboard', 'touch', 'hand')),
  assistance_level TEXT NOT NULL DEFAULT 'guided' CHECK (assistance_level IN ('basic', 'guided', 'assisted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id)
);
-- Índices
CREATE INDEX IF NOT EXISTS idx_player_settings_player_id ON player_settings(player_id);
-- RLS para player_settings
ALTER TABLE player_settings ENABLE ROW LEVEL SECURITY;
-- Los cuidadores pueden gestionar settings de sus jugadores
CREATE POLICY "Caregivers can view player settings"
  ON player_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM caregiver_players
      WHERE caregiver_players.id = player_settings.player_id
      AND caregiver_players.caregiver_id = auth.uid()
    )
  );
CREATE POLICY "Caregivers can insert player settings"
  ON player_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM caregiver_players
      WHERE caregiver_players.id = player_settings.player_id
      AND caregiver_players.caregiver_id = auth.uid()
    )
  );
CREATE POLICY "Caregivers can update player settings"
  ON player_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM caregiver_players
      WHERE caregiver_players.id = player_settings.player_id
      AND caregiver_players.caregiver_id = auth.uid()
    )
  );
CREATE POLICY "Caregivers can delete player settings"
  ON player_settings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM caregiver_players
      WHERE caregiver_players.id = player_settings.player_id
      AND caregiver_players.caregiver_id = auth.uid()
    )
  );
-- 4. TABLA DE SESIONES DE JUEGO
-- ================================================
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES caregiver_players(id) ON DELETE CASCADE,
  game_key TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  input_mode TEXT NOT NULL CHECK (input_mode IN ('keyboard', 'touch', 'hand')),
  assistance_level TEXT NOT NULL CHECK (assistance_level IN ('basic', 'guided', 'assisted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (ended_at >= started_at)
);
-- Índices para búsquedas y reportes
CREATE INDEX IF NOT EXISTS idx_game_sessions_player_id ON game_sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_key ON game_sessions(game_key);
CREATE INDEX IF NOT EXISTS idx_game_sessions_started_at ON game_sessions(started_at DESC);
-- RLS para game_sessions
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
-- Los cuidadores pueden ver sesiones de sus jugadores
CREATE POLICY "Caregivers can view game sessions"
  ON game_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM caregiver_players
      WHERE caregiver_players.id = game_sessions.player_id
      AND caregiver_players.caregiver_id = auth.uid()
    )
  );
-- Las sesiones se pueden insertar
CREATE POLICY "Caregivers can insert game sessions"
  ON game_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM caregiver_players
      WHERE caregiver_players.id = game_sessions.player_id
      AND caregiver_players.caregiver_id = auth.uid()
    )
  );
-- 5. TABLAS DE PARTIDAS GRUPALES
-- ================================================
CREATE TABLE IF NOT EXISTS competition_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_key TEXT NOT NULL CHECK (game_key IN ('trivia-ecuador', 'animales', 'impostor', 'charadas')),
  rounds INTEGER NOT NULL CHECK (rounds BETWEEN 1 AND 20),
  turn_seconds INTEGER NOT NULL CHECK (turn_seconds BETWEEN 15 AND 180),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ended_at >= started_at)
);
CREATE TABLE IF NOT EXISTS competition_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_session_id UUID NOT NULL REFERENCES competition_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES caregiver_players(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (competition_session_id, player_id)
);
CREATE INDEX IF NOT EXISTS idx_competition_sessions_caregiver_started
  ON competition_sessions(caregiver_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_competition_scores_session
  ON competition_scores(competition_session_id);
ALTER TABLE competition_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Caregivers can view competition sessions" ON competition_sessions;
CREATE POLICY "Caregivers can view competition sessions"
  ON competition_sessions FOR SELECT
  USING (auth.uid() = caregiver_id);
DROP POLICY IF EXISTS "Caregivers can insert competition sessions" ON competition_sessions;
CREATE POLICY "Caregivers can insert competition sessions"
  ON competition_sessions FOR INSERT
  WITH CHECK (auth.uid() = caregiver_id);
DROP POLICY IF EXISTS "Caregivers can view competition scores" ON competition_scores;
CREATE POLICY "Caregivers can view competition scores"
  ON competition_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competition_sessions
      WHERE competition_sessions.id = competition_scores.competition_session_id
      AND competition_sessions.caregiver_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Caregivers can insert competition scores" ON competition_scores;
CREATE POLICY "Caregivers can insert competition scores"
  ON competition_scores FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM competition_sessions
      JOIN caregiver_players ON caregiver_players.id = competition_scores.player_id
      WHERE competition_sessions.id = competition_scores.competition_session_id
      AND competition_sessions.caregiver_id = auth.uid()
      AND caregiver_players.caregiver_id = auth.uid()
    )
  );
-- 6. FUNCIONES Y TRIGGERS PARA UPDATED_AT
-- ================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Triggers para actualizar updated_at automáticamente
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_caregiver_players_updated_at
  BEFORE UPDATE ON caregiver_players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_player_settings_updated_at
  BEFORE UPDATE ON player_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
-- 6. DATOS DE PRUEBA (OPCIONAL - COMENTAR SI NO SE NECESITA)
-- ================================================
-- Estos datos se crean automáticamente cuando un cuidador se registra
-- y crea sus propios jugadores desde la aplicación
-- ================================================
-- FIN DEL SCRIPT
-- ================================================
-- SIGUIENTE PASO:
-- 1. Ve a tu proyecto de Supabase
-- 2. SQL Editor (menú lateral)
-- 3. Pega y ejecuta este script completo
-- 4. Verifica que todas las tablas se crearon en "Table Editor"
-- ================================================
