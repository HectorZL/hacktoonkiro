# Lista de Verificación de Testing

## Flujo Completo: Login → Perfiles → Añadir/Quitar → Juegos

### ✓ Compilación y Linting
- [x] `npm run build` - Sin errores
- [x] `npm run lint` - Sin errores

### Modo Demo (Sin Supabase)

#### Login/Entrada
1. Ve a `/login`
2. Deberías ver el mensaje "Supabase no está configurado"
3. Click en "Entrar al modo demo"
4. Deberías ser redirigido a `/juegos`

#### Gestión de Perfiles
1. Ve a `/perfiles`
2. Deberías ver los perfiles demo: María y José
3. **Añadir jugador:**
   - Escribe un nombre (ej: "Elena")
   - Selecciona un avatar
   - Click en "Crear perfil"
   - Verifica mensaje: "Perfil de Elena creado correctamente"
   - El nuevo perfil aparece en la lista
4. **Eliminar jugador:**
   - Click en el botón "×" en cualquier tarjeta
   - Aparece confirmación: "¿Estás seguro de eliminar el perfil de [Nombre]?"
   - Confirma la eliminación
   - Verifica mensaje: "Perfil de [Nombre] eliminado correctamente"
   - El perfil desaparece de la lista
5. **Seleccionar jugador:**
   - Click en cualquier tarjeta de jugador
   - La tarjeta se marca con borde azul y fondo claro
   - Mensaje: "Jugador seleccionado: [Nombre]. Listo para continuar."

#### Configurar Partida
1. Ve a `/juegos`
2. Verifica mensaje: "Modo demo local: puedes probar la partida sin conectar Supabase..."
3. **Seleccionar participantes:**
   - Los jugadores creados aparecen en la lista
   - Click en jugadores para seleccionar/deseleccionar
   - Usa "Seleccionar todos" y "Limpiar" para pruebas rápidas
   - Contador muestra: "X participantes seleccionados"
4. **Configurar juego:**
   - Selecciona un juego (Trivia, Animales, Impostor, Charadas)
   - Ajusta número de rondas (1-20)
   - Ajusta tiempo por turno (30s - 2min)
5. **Iniciar partida:**
   - Requiere mínimo 2 participantes seleccionados
   - Click en "Comenzar partida"
   - Deberías ser redirigido al juego seleccionado

### Modo Supabase (Configurado)

#### Configuración Inicial
1. Copia `.env.example` a `.env.local`
2. Completa las variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu_clave_publica
   ```
3. Reinicia el servidor de desarrollo

#### Login
1. Ve a `/login`.
2. Para una prueba aislada, crea un usuario temporal desde Supabase Dashboard → **Authentication → Users → Add user**. Usa un correo y una contraseña administrados por el equipo evaluador; no los escribas en el repositorio ni en capturas.
3. Inicia sesión con ese usuario. Deberías ser redirigido a `/juegos`.
4. Si Supabase requiere confirmación por email, confirma la cuenta antes de iniciar sesión.
5. Si aparece `email rate limit exceeded`, no repitas el registro: espera el período indicado o utiliza el usuario temporal ya creado.

#### Gestión de Perfiles (con Supabase)
1. Ve a `/perfiles`
2. Deberías ver el formulario de "Acceso del cuidador"
3. Si ya estás autenticado, verás el botón "Cerrar sesión"
4. **Añadir jugador:**
   - Funciona igual que en modo demo
   - Los perfiles se guardan en Supabase
5. **Eliminar jugador:**
   - Funciona igual que en modo demo
   - Los perfiles se eliminan de Supabase (incluyendo player_settings)

#### Configurar Partida (con Supabase)
1. Ve a `/juegos`
2. Si no estás autenticado, verás: "Inicia sesión para dirigir una partida"
3. Una vez autenticado:
   - Los jugadores de Supabase aparecen automáticamente
   - Configura y comienza la partida igual que en modo demo

### Casos Edge a Verificar

#### Eliminación del Jugador Seleccionado
1. Selecciona un jugador en `/perfiles`
2. Elimina ese mismo jugador
3. Verifica que se seleccione automáticamente otro jugador
4. Si era el único jugador, verifica que el estado se limpie correctamente

#### Persistencia de Datos
- **Modo Demo:** Recarga la página, los jugadores persisten en localStorage
- **Modo Supabase:** Cierra sesión y vuelve a entrar, los jugadores persisten en DB

#### Validaciones
1. Intenta crear un jugador sin nombre → Error: "Escribe un nombre para crear el perfil"
2. Intenta comenzar partida con 0 jugadores → Error: "Selecciona al menos dos participantes"
3. Intenta comenzar partida con 1 jugador → Error: "Selecciona al menos dos participantes"

#### Estados de Carga
1. Observa el texto "Guardando…" al crear/eliminar jugadores
2. Observa el texto "Preparando partida…" al iniciar juego
3. Observa "Cargando perfiles…" al entrar a `/perfiles`
4. Observa "Cargando el espacio del cuidador…" al entrar a `/juegos`

### Navegación entre Páginas

1. Desde `/` (home):
   - Click "Entrar como cuidador" → `/login`

2. Desde `/login`:
   - Link "← Volver al inicio" → `/`
   - Link "Administrar perfiles" → `/perfiles`
   - Tras login exitoso → `/juegos`

3. Desde `/perfiles`:
   - Link "Ver actividad del cuidador" → `/cuidador`
   - Link "Abrir sala de juegos" → `/juegos`
   - Link "← Volver al inicio" → `/`

4. Desde `/juegos`:
   - Link "Ver actividad del cuidador" → `/cuidador`
   - Link "Administrar perfiles" → `/perfiles`
   - Button "Comenzar partida" → `/juegos/[juego-seleccionado]`

## Resumen de Cambios Implementados

### 1. Documentación (README.md)
- ✓ Añadida sección "Credenciales de prueba"
- ✓ Instrucciones para modo demo
- ✓ Instrucciones para configurar Supabase
- ✓ Ejemplo de credenciales de testing
- ✓ Flujo completo de prueba paso a paso

### 2. Funcionalidad de Eliminar (app/perfiles/page.tsx)
- ✓ Función `handleDeletePlayer()` implementada
- ✓ Confirmación con `window.confirm()` antes de eliminar
- ✓ Soporte para modo demo (localStorage)
- ✓ Soporte para Supabase (eliminación en cascada)
- ✓ Actualización automática de selección si se elimina el jugador activo
- ✓ Botón "×" en esquina superior derecha de cada tarjeta
- ✓ Estados de carga (`submitting`)
- ✓ Mensajes de feedback (éxito/error)
- ✓ Accesibilidad: `aria-label` descriptivo

## Notas de Entrega

El sistema está listo para entregar con:

1. **Login funcional:**
   - Modo demo sin configuración
   - Modo Supabase con autenticación completa
   - Credenciales de prueba documentadas

2. **Gestión completa de jugadores:**
   - ✓ Añadir jugadores con nombre y avatar
   - ✓ Eliminar jugadores con confirmación
   - ✓ Seleccionar jugador activo
   - ✓ Persistencia en localStorage (demo) o Supabase

3. **Configuración de partidas:**
   - Seleccionar múltiples participantes
   - Elegir entre 4 juegos
   - Configurar rondas y tiempos
   - Validaciones de mínimo 2 jugadores

4. **Compilación y calidad:**
   - ✓ Build sin errores
   - ✓ Lint sin errores
   - ✓ TypeScript sin errores
   - ✓ Código accesible

## Para Pruebas Rápidas

**Modo Demo (más rápido):**
```bash
npm run dev
# Ve a http://localhost:3000/perfiles
# Añade/elimina jugadores
# Ve a http://localhost:3000/juegos
# Selecciona participantes y comienza
```

**Modo Supabase (producción):**
1. Configura `.env.local` con tus credenciales
2. Crea cuenta en `/login`
3. Sigue el flujo completo documentado
