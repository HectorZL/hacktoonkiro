# Plataforma de juegos accesibles

Aplicación web en español para actividades recreativas de personas mayores, pensada para usarse con el acompañamiento de una persona cuidadora y, cuando corresponde, en un dispositivo compartido.

La plataforma prioriza botones grandes, instrucciones claras, interacción pausada y alternativas visuales para audio y animación. Es una herramienta de entretenimiento y actividad: **no realiza diagnósticos ni sustituye la atención profesional**.

## Funcionalidades implementadas

### Perfiles y cuidador

- Registro e inicio de sesión de cuidadores con Supabase cuando está configurado.
- Perfil del cuidador con nombre, apellido, institución y cierre de sesión.
- Creación, selección y eliminación de perfiles de jugadores con nombre y avatar.
- Modo demo sin Supabase: perfiles, preferencias y sesiones se guardan en el navegador.
- Panel `/cuidador` con actividad reciente, tiempo jugado, juegos usados, resumen por jugador y vistas de 7 o 30 días.

### Sala de juegos compartidos

En `/juegos`, el cuidador selecciona al menos dos participantes, configura entre 1 y 20 rondas y define el tiempo de turno (30 a 120 segundos). Están disponibles:

| Juego | Mecánica |
| --- | --- |
| **Trivia de Ecuador** | Preguntas de selección múltiple; cada respuesta correcta suma un punto. Usa preguntas generadas por la API cuando están disponibles y conserva un banco local de respaldo. |
| **Animales y mímica** | Una persona representa en privado una consigna de animal; el cuidador confirma si el grupo adivinó antes de que termine el tiempo. |
| **Charadas** | Igual que la dinámica de mímica, con acciones y escenas cotidianas. |
| **Impostor** | Cada jugador recibe un papel secreto. Las pistas duran un minuto y el grupo vota por una persona al terminar. El equipo gana si descubre al impostor; el impostor gana si llega sin ser descubierto a la última ronda. |

Las partidas compartidas incluyen marcador, efectos de sonido, música suave y lectura de resultados opcionales. Sus resultados se conservan localmente y se guardan en Supabase para perfiles autenticados compatibles.

### Actividades individuales

Estas rutas se pueden abrir directamente:

- `/juegos/carrera-sacos`: carrera con salto por una acción, asistencia de ritmo y sin penalización por fallar un obstáculo.
- `/juegos/trompo`: cinco lanzamientos con una ventana amplia de acción y asistencia configurable.
- `/juegos/jardin-virtual`: actividad relajada para cuidar escenas de plantas, flores y mascotas sin derrota ni puntuación.
- `/juegos/mente-activa`: cuatro ejercicios de atención, memoria y orientación con retroalimentación amable.

`/entrada` y `/motor` son pantallas de demostración para la entrada normalizada y el motor de interacción; no son juegos de la sala principal.

## Accesibilidad e interacción

- Navegación por teclado, controles táctiles y botones de gran tamaño.
- Barra espaciadora para la acción principal cuando el foco no está en un control interactivo; `Escape` pausa las actividades que lo admiten.
- Pausa, repetición de instrucciones y mensajes con `aria-live`.
- Foco visible, diseño responsive y compatibilidad con `prefers-reduced-motion`.
- Efectos de sonido, música y voz opcionales con información visual equivalente.
- En **Mente Activa**, el control por cámara/gestos es opcional, requiere consentimiento y procesa la imagen localmente en el dispositivo. No se almacenan ni envían imágenes de la cámara al servidor.

## Tecnología

- Next.js 16 con App Router, React y TypeScript.
- Tailwind CSS 4.
- Supabase para autenticación y almacenamiento opcionales.
- MediaPipe Tasks Vision para la cámara y gestos opcionales de Mente Activa.
- API de Gemini opcional para generar preguntas de Trivia, con preguntas locales de respaldo.

## Inicio rápido

### Requisitos

- Node.js compatible con Next.js 16.
- npm.

### Instalación y desarrollo

```powershell
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

En modo demo no se requieren variables de entorno: se puede acceder a `/juegos` y `/perfiles` para probar la aplicación con datos locales.

### Validación y producción

```powershell
npm run lint
npm run build
npm run start
```

`npm run start` debe ejecutarse después de generar el build con `npm run build`.

## Configuración opcional de Supabase y Gemini

Copia `.env.example` a `.env.local` y completa únicamente los valores que utilizarás:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxxx

# Opcional: generación de preguntas de Trivia desde el servidor.
GEMINI_API_KEY=tu_clave_de_gemini
GEMINI_MODEL=gemini-3.5-flash-lite
```

- Sin Supabase, la aplicación funciona en modo demo y guarda los datos en `localStorage`.
- Sin Gemini, Trivia sigue funcionando con el banco local de preguntas.
- No incluyas `.env.local`, claves, contraseñas ni datos personales en el repositorio.
- Para preparar las tablas, políticas RLS y autenticación de Supabase, consulta [`docs/supabase-setup-guide.md`](./docs/supabase-setup-guide.md).

## Rutas principales

| Ruta | Uso |
| --- | --- |
| `/` | Entrada de la aplicación; redirige a Juegos en modo demo o a Login cuando se requiere sesión. |
| `/login` | Inicio de sesión y creación de cuenta del cuidador. |
| `/perfil` | Datos y cierre de sesión del cuidador. |
| `/perfiles` | Gestión de jugadores. |
| `/juegos` | Preparación de partidas compartidas. |
| `/cuidador` | Actividad y resumen de sesiones. |

## Documentación adicional

- [`docs/supabase-setup-guide.md`](./docs/supabase-setup-guide.md): configuración de autenticación, tablas y RLS.
- [`docs/testing-checklist.md`](./docs/testing-checklist.md): lista de comprobación funcional.
- [`docs/accessibility-validation.md`](./docs/accessibility-validation.md): protocolo de accesibilidad.
- [`docs/deployment-checklist.md`](./docs/deployment-checklist.md): preparación para despliegue.
- [`DEPLOYMENT.md`](./DEPLOYMENT.md): guía general de despliegue.

## Privacidad y límites

La aplicación está diseñada para registrar datos mínimos de uso, como sesiones, juego, duración y modo de entrada. Los datos se mantienen en el navegador en modo demo o asociados a la cuenta del cuidador al usar Supabase.

No se guardan videos, imágenes de cámara, biometría ni diagnósticos. Antes de usarla con datos reales, configura correctamente la autenticación, las políticas RLS y las variables de entorno de tu entorno de despliegue.

## Repositorio

[github.com/HectorZL/hacktoonkiro](https://github.com/HectorZL/hacktoonkiro)
