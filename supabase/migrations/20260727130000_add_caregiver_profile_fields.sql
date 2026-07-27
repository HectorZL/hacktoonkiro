-- Datos identificativos no clínicos del cuidador.
-- Compatible con perfiles existentes: los nuevos campos se completan desde /perfil.

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists institution text;

alter table public.profiles
  drop constraint if exists profiles_first_name_length,
  drop constraint if exists profiles_last_name_length,
  drop constraint if exists profiles_institution_length;

alter table public.profiles
  add constraint profiles_first_name_length
    check (first_name is null or char_length(trim(first_name)) between 1 and 120),
  add constraint profiles_last_name_length
    check (last_name is null or char_length(trim(last_name)) between 1 and 120),
  add constraint profiles_institution_length
    check (institution is null or char_length(trim(institution)) between 1 and 180);
