# Guía de Configuración de Supabase

## 📋 Requisitos Previos
- Cuenta en [supabase.com](https://supabase.com) (gratis)
- El archivo `supabase-setup.sql` en la raíz del proyecto

## 🚀 Paso 1: Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Click en **"Start your project"** o **"New Project"**
3. Selecciona tu organización (o crea una nueva)
4. Completa los datos del proyecto:
   - **Name**: `mayorsperson` (o el nombre que prefieras)
   - **Database Password**: Genera una contraseña segura (guárdala)
   - **Region**: Selecciona la más cercana (ej: `South America (São Paulo)` para Ecuador)
   - **Pricing Plan**: `Free` (suficiente para el MVP)
5. Click en **"Create new project"**
6. Espera 1-2 minutos mientras Supabase crea tu proyecto

## 🗄️ Paso 2: Ejecutar el Script SQL

1. En el menú lateral de Supabase, ve a **"SQL Editor"**
2. Click en **"New query"**
3. Abre el archivo `supabase-setup.sql` de tu proyecto
4. Copia todo el contenido del archivo
5. Pégalo en el editor SQL de Supabase
6. Click en **"Run"** (o presiona `Ctrl+Enter` / `Cmd+Enter`)
7. Deberías ver: `Success. No rows returned`

## ✅ Paso 3: Verificar las Tablas

1. En el menú lateral, ve a **"Table Editor"**
2. Deberías ver estas 6 tablas:
   - ✓ `profiles` - Perfiles de usuarios (cuidadores)
   - ✓ `caregiver_players` - Jugadores gestionados por cuidadores
   - ✓ `player_settings` - Configuraciones de cada jugador
   - ✓ `game_sessions` - Registro de sesiones de juego individuales
   - ✓ `competition_sessions` - Registro de partidas grupales
   - ✓ `competition_scores` - Participantes y resultados de partidas grupales

3. Click en cada tabla para verificar su estructura:

   **profiles:**
   - id (uuid)
   - auth_user_id (uuid)
   - display_name (text)
   - role (text)
   - created_at (timestamptz)
   - updated_at (timestamptz)

   **caregiver_players:**
   - id (uuid)
   - caregiver_id (uuid)
   - player_name (text)
   - avatar_key (text)
   - created_at (timestamptz)
   - updated_at (timestamptz)

   **player_settings:**
   - id (uuid)
   - player_id (uuid)
   - input_mode (text)
   - assistance_level (text)
   - created_at (timestamptz)
   - updated_at (timestamptz)

   **game_sessions:**
   - id (uuid)
   - player_id (uuid)
   - game_key (text)
   - started_at (timestamptz)
   - ended_at (timestamptz)
   - duration_seconds (int4)
   - input_mode (text)
   - assistance_level (text)
   - created_at (timestamptz)

## 🔑 Paso 4: Obtener las Credenciales

1. En el menú lateral, ve a **"Project Settings"** (⚙️ abajo a la izquierda)
2. Click en **"API"** en el submenú
3. Busca la sección **"Project API keys"**
4. Copia estos dos valores:

   📋 **Project URL:**
   ```
   https://xxxxxxxxxxxx.supabase.co
   ```

   📋 **anon public (API key):**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...
   ```

## 📝 Paso 5: Configurar Variables de Entorno Locales

1. En tu proyecto, copia el archivo `.env.example`:
   ```powershell
   Copy-Item .env.example .env.local
   ```

2. Abre `.env.local` y completa las variables:
   ```env
   # Supabase público para el navegador
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...

   # Gemini (opcional, para contenido generado con IA)
   GEMINI_API_KEY=tu_clave_de_gemini
   GEMINI_MODEL=gemini-3.5-flash-lite
   ```

3. **⚠️ IMPORTANTE:** Nunca subas `.env.local` a Git (ya está en `.gitignore`)

## 🔒 Paso 6: Configurar Autenticación

1. En el menú lateral de Supabase, ve a **"Authentication"**
2. Click en **"Providers"**
3. Verifica que **"Email"** esté habilitado (debería estar por defecto)
4. Configuración recomendada:
   - ✓ **Enable Email provider**: ON
   - ✓ **Confirm email**: OFF (para desarrollo rápido) o ON (para producción)
   - ✓ **Enable Email Confirmations**: Según tu preferencia

### Opcional: Desactivar Confirmación de Email (Para Testing Rápido)

Si quieres crear cuentas sin verificar el email:

1. Ve a **"Authentication" → "Providers" → "Email"**
2. Scroll down hasta **"Email Confirmations"**
3. **Desactiva** "Enable email confirmations"
4. Click en **"Save"**

Ahora los usuarios pueden registrarse e iniciar sesión inmediatamente.

## 🧪 Paso 7: Probar la Conexión Local

1. Asegúrate de que el servidor esté corriendo:
   ```powershell
   npm run dev
   ```

2. Ve a [http://localhost:3000/login](http://localhost:3000/login)

3. **Crea un usuario temporal para la prueba** desde Supabase Dashboard → **Authentication → Users → Add user**. Usa credenciales administradas por el equipo evaluador y no las copies al repositorio, a la documentación ni a las capturas.
4. Ve a `/login` e inicia sesión con ese usuario.
5. Si configuraste confirmación de email:
   - Revisa tu correo y confirma la cuenta.
   - Vuelve a `/login` e inicia sesión.

6. Si NO configuraste confirmación de email:
   - Deberías ser redirigido automáticamente a `/juegos`.

7. **Verifica que funciona:**
   - Ve a `/perfiles`
   - Crea un jugador (ej: "María")
   - Ve a Supabase → Table Editor → `caregiver_players`
   - Deberías ver el jugador que acabas de crear ✅

## 📊 Paso 8: Verificar RLS (Row Level Security)

El script ya configuró políticas de seguridad. Para verificar:

1. En Supabase, ve a **"Authentication" → "Users"**
2. Deberías ver tu usuario de prueba
3. Ve a **"Table Editor" → "caregiver_players"**
4. Verifica que el `caregiver_id` coincide con el `id` de tu usuario

Las políticas RLS aseguran que:
- ✓ Los cuidadores solo ven SUS propios jugadores
- ✓ No pueden ver ni modificar jugadores de otros cuidadores
- ✓ Las sesiones de juego están vinculadas a los jugadores correctos

## 🔧 Troubleshooting

### Error: "Supabase no está configurado"
- Verifica que `.env.local` existe y tiene las variables correctas
- Reinicia el servidor de desarrollo (`Ctrl+C` y `npm run dev`)

### Error: "Invalid API key"
- Verifica que copiaste la clave `anon public` completa
- Asegúrate de no tener espacios extra al inicio o final

### Error: "Failed to fetch"
- Verifica que la URL de Supabase es correcta
- Verifica tu conexión a internet
- Verifica que el proyecto de Supabase esté activo (no pausado)

### No puedo crear jugadores
- Verifica que iniciaste sesión correctamente
- Ve a Supabase → Authentication → Users (debería aparecer tu usuario)
- Ve a Table Editor → profiles (debería existir tu perfil de cuidador)

### Los jugadores no aparecen
- Verifica que `caregiver_id` en `caregiver_players` coincide con tu user id
- Ejecuta esta query en SQL Editor para verificar:
  ```sql
  SELECT * FROM caregiver_players WHERE caregiver_id = 'TU_USER_ID';
  ```

## 🎯 Próximo Paso

Una vez que Supabase esté funcionando localmente, continúa con:
- **[Guía de Despliegue a Vercel](./vercel-deployment-guide.md)**

## 📚 Recursos Adicionales

- [Documentación oficial de Supabase](https://supabase.com/docs)
- [Guía de RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [API de autenticación](https://supabase.com/docs/guides/auth)
