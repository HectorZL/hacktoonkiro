# Plan de implementación — Plataforma de juegos accesibles para adultos mayores

## Problema

Crear una plataforma web para personas de 70–80 años, incluyendo usuarios con movilidad muy reducida. El sistema debe permitir jugar con:

- **Computadora:** barra espaciadora como entrada predeterminada.
- **Móvil/tablet:** un toque como entrada predeterminada.
- **Cámara:** reconocimiento opcional de una mano.
- **Dispositivos compartidos:** selección de perfil por nombre/avatar.
- **Gestión:** el cuidador crea los perfiles.
- **Datos:** solo nombre, sesiones, juegos utilizados y tiempo de juego.
- **Resultados:** indicadores de actividad y bienestar, nunca diagnósticos médicos.
- **Audio:** opcional, siempre con equivalente visual.
- **Despliegue:** Next.js en Vercel Free + Supabase Free.

No se almacenará video de la cámara.

## Requisitos consolidados

### Accesibilidad

1. Todos los juegos deben poder completarse con una sola entrada:
   - barra espaciadora;
   - un toque;
   - o una mano, como alternativa opcional.
2. No se requerirán:
   - combinaciones de teclas;
   - pulsaciones simultáneas;
   - mantener una tecla presionada;
   - arrastrar;
   - doble toque obligatorio;
   - movimientos rápidos;
   - precisión fina.
3. Cada juego tendrá una mecánica adaptada:
   - una pulsación puede confirmar una acción;
   - activar una acción automática;
   - avanzar un paso;
   - o interactuar con el elemento actual.
4. Las pulsaciones accidentales deben tener protección contra rebote y recuperación.
5. Debe existir pausa, reanudación, reinicio y práctica sin penalización.
6. Las instrucciones serán breves, visuales y repetibles.
7. El audio nunca será la única forma de comunicar información.
8. Los objetivos táctiles preferidos serán de al menos **44 × 44 CSS px**. WCAG 2.2 establece 24 × 24 px como mínimo AA en el criterio correspondiente; 44 × 44 será una decisión protectora para este público.
9. Se aplicarán WCAG 2.2 en contraste, teclado, foco, tamaño de texto, alternativas a gestos, tiempo y cancelación de acciones.
10. La conformidad final debe comprobarse también con usuarios reales de 70–80 años.

### Mecánicas accesibles

Los cuatro juegos utilizarán una interacción por turnos o acción automática lenta:

1. El sistema muestra una situación.
2. El usuario pulsa espacio o toca una vez.
3. El sistema ejecuta una acción.
4. Se muestra una confirmación visual.
5. La siguiente acción aparece sin penalizar errores.

La duración y la complejidad serán ajustables por juego.

## Investigación utilizada

### Evidencia directa

- **W3C WCAG 2.2:** teclado, foco, contraste, tamaño de objetivos, gestos, cancelación, límites de tiempo y alternativas no sonoras.
- **W3C WAI-AGE:** necesidades relacionadas con envejecimiento visual, auditivo, cognitivo y motriz.
- **Game Accessibility Guidelines:** controles simples, alternativas digitales a gestos, ausencia de acciones simultáneas, velocidad ajustable, prácticas sin fallo y compatibilidad con tecnologías asistivas.
- **Ability-Based Design**, Wobbrock et al., DOI: 10.1145/1941487.1941504.
- **ISO 9241-171:** orientación sobre accesibilidad de software.
- **NN/g:** investigación de usabilidad con usuarios mayores de 65 años.

### Decisiones que deberán validarse

No existe evidencia universal que determine una ventana de reacción exacta, una tasa mínima de acierto de MediaPipe o una frecuencia sonora ideal para todos los adultos mayores. Por ello, valores como el tiempo inicial de respuesta, velocidad de escaneo y tamaño de hitboxes serán configurables y se probarán con usuarios.

### Ecuador

Durante la fase legal se deberá verificar oficialmente:

- Constitución del Ecuador, especialmente derechos de grupos de atención prioritaria.
- Ley Orgánica de las Personas Adultas Mayores.
- Ley Orgánica de Discapacidades, si corresponde al grupo o servicio.
- Ley Orgánica de Protección de Datos Personales.
- Vigencia y alcance de NTE INEN-ISO/IEC 40500:2012.
- Requisitos oficiales del Registro Oficial y del INEN.

La aplicación no se presentará como dispositivo médico ni como herramienta diagnóstica.

## Arquitectura propuesta

```mermaid
flowchart TD
    UI[Next.js UI accesible] --> INPUT[Input unificado]
    INPUT --> KEY[Barra espaciadora]
    INPUT --> TOUCH[Toque único]
    INPUT --> HAND[MediaPipe opcional]
    INPUT --> GAMES[Motor de juegos]

    GAMES --> AUDIO[Audio opcional + feedback visual]
    GAMES --> SESSION[Registro de sesión]
    SESSION --> SUPABASE[(Supabase PostgreSQL)]

    CAREGIVER[Cuidador] --> PROFILES[Perfiles]
    PROFILES --> SUPABASE

    SUPABASE --> DASH[Panel de actividad]
    SUPABASE --> REPORTS[Reportes simples]
```

## Principios técnicos

- MediaPipe solo se carga si el jugador selecciona cámara.
- No se procesa ni almacena video en el servidor.
- La barra espaciadora funciona como entrada predeterminada en computadora.
- El toque único funciona como entrada predeterminada en móvil/tablet.
- Las métricas se guardan al iniciar y terminar una sesión, no en cada frame.
- Los reportes y gráficas se generan con datos mínimos.
- Se evita Realtime salvo que sea necesario, para respetar el plan gratuito.
- Los assets se sirven desde `public/` y la CDN de Vercel.
- Los PDFs, si se mantienen, se generan del lado del cliente.

## Task Breakdown

### Task 1: Crear el proyecto base y el sistema visual accesible

**Objetivo:** Crear el proyecto Next.js con TypeScript, App Router, Tailwind y tokens visuales accesibles.

**Implementación:**

- Crear el proyecto con Next.js y TypeScript.
- Configurar Tailwind y estilos globales.
- Crear tokens para:
  - fondo cálido de bajo deslumbramiento;
  - texto oscuro de alto contraste;
  - estados de éxito, advertencia y error redundantes por color, icono y texto;
  - tipografía legible;
  - botones de mínimo 48 px preferidos;
  - foco visible.
- Usar `button`, `label`, `main`, `nav` y otros elementos semánticos.
- Evitar fijar colores como requisito científico; validar contraste con herramientas WCAG.

**Tests:**

- Prueba automatizada de contraste.
- Navegación por teclado.
- Verificación de foco visible.
- Prueba de zoom al 200%.

**Estado:** La portada muestra directamente los tres juegos disponibles con instrucciones breves y botones “Jugar” grandes. Las opciones de perfiles y cuidador están separadas en un bloque secundario; los enlaces técnicos y la demostración inicial se retiraron para reducir la carga cognitiva.

**Demo:** Una persona puede identificar y abrir un juego sin pasar por configuración ni opciones técnicas.

### Task 2: Configurar Supabase y perfiles creados por cuidadores

**Objetivo:** Permitir que un cuidador cree y seleccione perfiles de jugadores en dispositivos compartidos.

**Implementación:**

- Configurar Supabase Auth para cuidadores.
- Crear tablas:
  - `profiles`;
  - `caregiver_players`;
  - `player_settings`.
- El cuidador podrá crear un jugador con:
  - nombre;
  - avatar opcional;
  - configuración de entrada;
  - nivel de asistencia.
- Crear pantalla de selección de jugador con nombres y avatares grandes.
- Configurar RLS:
  - el cuidador solo ve sus jugadores;
  - un jugador no puede ver datos de otros;
  - no guardar información clínica.
- Permitir cerrar y cambiar de jugador fácilmente.

**Tests:**

- Un cuidador crea un perfil.
- El perfil aparece en la selección.
- Un cuidador no puede ver perfiles ajenos.
- Se puede cambiar de perfil en un dispositivo compartido.

**Demo:** El cuidador crea “María” y “José”; ambos aparecen como perfiles seleccionables.

### Task 3: Implementar el sistema de entrada unificado

**Objetivo:** Unificar barra espaciadora, toque y mano en eventos independientes de la fuente.

**Implementación:**

- Crear una interfaz común:

```ts
type InputMode = "keyboard" | "touch" | "hand";

type GameInput =
  | { type: "action"; timestamp: number }
  | { type: "position"; x: number; y: number; timestamp: number }
  | { type: "pause"; timestamp: number };
```

- `KeyboardAdapter`:
  - espacio = acción;
  - Escape = pausa/salida, si el dispositivo lo permite;
  - no exigir flechas.
- `TouchAdapter`:
  - un toque = acción;
  - botón táctil de pausa separado.
- `HandAdapter`:
  - cargarse solo bajo demanda;
  - gesto de acción configurable;
  - usar posición solo en juegos que realmente lo necesiten.
- Implementar:
  - cooldown para evitar doble activación;
  - tolerancia a pulsaciones largas;
  - indicador visual de entrada aceptada.
- Guardar `keyboard` como modo predeterminado en computadora.

**Tests:**

- Una pulsación genera una única acción.
- Una pulsación larga no genera acciones repetidas.
- Un toque genera una única acción.
- Los tres adapters producen el mismo evento lógico.
- Pausa y reanudación funcionan con el método seleccionado.

**Demo:** Una pantalla muestra “Acción recibida” mediante espacio, toque o mano.

### Task 4: Crear el motor de acciones automáticas y asistencia

**Objetivo:** Permitir que el sistema avance lentamente y que el jugador solo confirme acciones.

**Implementación:**

- Crear una máquina de estados:
  - `idle`;
  - `showing`;
  - `waiting-for-action`;
  - `accepted`;
  - `feedback`;
  - `paused`;
  - `completed`.
- Configurar por juego:
  - duración de cada estado;
  - velocidad de escaneo;
  - número de opciones;
  - tamaño de hitboxes;
  - número de reintentos.
- Añadir niveles:
  - **Básico:** menos asistencia.
  - **Guiado:** opciones más grandes y ritmo reducido.
  - **Asistido:** ritmo lento, orientación visual y errores sin penalización.
- Permitir cambiar el nivel durante una sesión.

**Tests:**

- El flujo no requiere pulsaciones rápidas.
- Pausar conserva el estado.
- Reanudar continúa desde el mismo punto.
- Un error permite repetir.
- La acción automática no se activa sin feedback visual.

**Demo:** Una pantalla presenta una opción, espera la pulsación y muestra una confirmación grande.

### Task 5: Implementar “Carrera de sacos” — prototipo ilustrado implementado

**Objetivo:** Crear una carrera lúdica que se controle con una sola pulsación o toque, sin exigir movimientos rápidos.

**Estado:** La actividad usa ilustraciones SVG originales, fondo parallax en capas, tres corredores amistosos, obstáculos recuperables, monedas decorativas y música opcional generada con Web Audio. El arte y la animación mantienen equivalentes escritos, pausa y reducción de movimiento.

**Implementación:**

- El personaje avanza automáticamente a ritmo configurable.
- Espacio/toque activa un salto dentro de una ventana amplia.
- Los obstáculos son grandes y se muestran con anticipación.
- Un salto fuera de tiempo sirve como práctica y no elimina al jugador.
- En modo mano, una acción simulada activa el mismo salto.
- Incluir pausa, reanudación, reinicio y feedback visual.

**Tests:**

- La actividad se puede completar solo con espacio.
- La actividad se puede completar solo con toque.
- El juego continúa tras un salto fuera de la ventana.
- La velocidad y la ventana cambian según asistencia.
- La entrada tiene cooldown contra pulsaciones accidentales.

**Demo:** El personaje recorre la pista y supera obstáculos con una pulsación amplia.

### Task 6: Implementar “Lanzamiento del trompo”

**Objetivo:** Crear una actividad de lanzamiento controlada con una sola pulsación o toque y una ventana de acción amplia.

**Implementación:**

- Mostrar una marca que se mueve lentamente entre los extremos de una pista.
- Espacio/toque lanza el trompo cuando la marca está dentro de la ventana verde.
- Un lanzamiento fuera de la ventana inicia una ronda de práctica sin derrota.
- La duración del giro y la amplitud de la ventana se ajustan por asistencia.
- En modo mano, una acción simulada activa el mismo lanzamiento.
- Incluir pausa, reanudación, reinicio y feedback visual.

**Tests:**

- La actividad se puede completar solo con espacio.
- La actividad se puede completar solo con toque.
- Un lanzamiento fuera de la ventana no finaliza la actividad.
- Las ventanas se identifican con texto, forma y posición, no solo con color.
- La entrada tiene cooldown contra lanzamientos accidentales.

**Demo:** El jugador espera la ventana verde y lanza el trompo con una pulsación.

### Task 7: Implementar “Director de Orquesta”

**Objetivo:** Crear un juego musical accesible con respuesta por una sola pulsación.

**Implementación:**

- Mostrar un instrumento o cuadrante destacado.
- Espacio/toque reproduce el instrumento seleccionado.
- El sistema presenta secuencias cortas en modo memoria.
- Permitir:
  - modo libre;
  - modo guiado;
  - repetición de instrucciones;
  - secuencias de longitud configurable.
- La mano podrá seleccionar cuadrantes como alternativa.
- Todo sonido tendrá:
  - iluminación visual;
  - nombre del instrumento;
  - animación no parpadeante.

**Tests:**

- Cada instrumento tiene feedback visual y sonoro.
- Se puede jugar con audio silenciado.
- La secuencia puede repetirse.
- Un error no finaliza la partida.

**Demo:** El jugador sigue una secuencia musical usando solo la barra espaciadora.

### Task 8: Implementar “El Jardín Virtual” — completado

**Objetivo:** Crear una experiencia relajante sin puntuación ni exigencia de precisión.

**Implementación:**

- Mostrar una planta, flores o mascota por vez en una escena grande.
- La escena cambia automáticamente a un ritmo lento y configurable.
- Espacio/toque/una mano simulada interactúa con el elemento actual para regar, cuidar o acompañar.
- El cuidado hace crecer la escena con feedback visible y repetible.
- No hay límite de tiempo, derrota ni penalización.
- Incluye pausa, reanudación, reinicio y repetición de instrucciones.
- Las animaciones son decorativas y el estado se entiende también mediante texto, progreso e iconos.

**Tests:**

- El jardín funciona sin audio.
- Se puede cuidar la escena con una pulsación o toque.
- Las acciones se pueden repetir.
- Pausar detiene el cambio automático de escena.
- No hay penalizaciones.

**Demo:** El jugador cuida una planta, flores o mascota usando solo espacio o un toque.

### Task 9: Añadir audio opcional y equivalencias visuales — base implementada

**Objetivo:** Añadir feedback sonoro sin hacer que el audio sea necesario.

**Implementación:**

- Crear `lib/audio/manager.ts` con tonos generados localmente mediante Web Audio.
- Activar las alertas únicamente después de una decisión explícita del usuario.
- Ofrecer silencio completo mediante un control visible en El Jardín Virtual.
- Emitir alertas suaves para inicio, cuidado, cambio de escena, pausa y reanudación.
- Mantener para cada alerta una equivalencia visual y textual mediante icono, progreso y `aria-live`.
- No almacenar, descargar ni enviar audio; si el navegador no admite Web Audio, la actividad continúa con feedback visual.
- La música, narración y control de volumen quedan para una ampliación posterior; no se afirma una frecuencia universal adecuada.

**Tests:**

- El jardín es comprensible sin audio.
- Las alertas se pueden activar y silenciar.
- El audio no bloquea la partida si el navegador lo rechaza o no lo admite.
- Cada evento sonoro tiene equivalente visual y escrito.

**Demo:** Cuidar el jardín con alertas activadas y silenciadas sin perder información.

### Task 10: Registrar sesiones y datos mínimos — base implementada

**Objetivo:** Guardar únicamente los datos necesarios para actividad y bienestar.

**Implementación:**

- Crear `game_sessions` con jugador, juego, inicio, fin, duración, modo de entrada y nivel de asistencia.
- Registrar el jardín al entrar y finalizar la sesión al reiniciar o salir de la página.
- Enviar datos a Supabase únicamente cuando hay credenciales y un jugador Supabase válido.
- Usar `hacktoonkiro:sessions` como fallback local, limitado a las últimas 100 sesiones.
- Persistir el jugador seleccionado bajo `hacktoonkiro:active-player` para asociarlo al juego.
- Aplicar RLS para que cada cuidador solo lea y cree sesiones de sus jugadores.
- No guardar video, imágenes de cámara, audio, precisión clínica, diagnósticos ni datos biométricos derivados.
- Enviar una sola fila al finalizar la sesión, no eventos por frame.

**Tests:**

- Una sesión se inicia y se finaliza en el jardín.
- La duración se calcula en segundos sin valores negativos.
- La salida o reinicio conserva el registro local aunque Supabase no esté configurado.
- RLS limita el acceso al cuidador correspondiente.

**Demo:** El jardín registra una sesión de un jugador con su duración, entrada y nivel de asistencia.

### Task 11: Crear el panel de cuidador — base implementada

**Objetivo:** Mostrar información simple y no clínica.

**Estado:** La ruta `/cuidador` muestra actividad reciente, tiempo de juego, juegos realizados, resumen por jugador y sesiones por período de 7 o 30 días. Incluye gráfica visual con tabla alternativa para lectores de pantalla, funciona con el fallback local y consulta las sesiones del cuidador autenticado cuando Supabase está configurado.

**Implementación:**

- Mostrar por jugador:
  - última sesión;
  - minutos jugados;
  - juegos utilizados;
  - sesiones por período.
- Usar textos comprensibles:
  - “Actividad reciente”;
  - “Tiempo de juego”;
  - “Juegos realizados”.
- Evitar términos como:
  - “deterioro”;
  - “diagnóstico”;
  - “capacidad cognitiva”;
  - “rendimiento médico”.
- Gráficas simples, con tablas alternativas para lectores de pantalla.
- Permitir seleccionar semana o mes.

**Tests:**

- El cuidador solo ve sus jugadores.
- Un jugador sin actividad tiene un mensaje claro.
- Las gráficas tienen alternativa tabular.
- Los datos no se interpretan como diagnóstico.

**Demo:** El cuidador observa la actividad de María durante la última semana.

### Task 12: Añadir alertas no clínicas — saltado por decisión de alcance

**Estado:** Esta tarea se salta explícitamente en este ciclo. No se implementan alertas de actividad ni notificaciones; el panel solo muestra los datos registrados cuando el cuidador los consulta.

### Task 13: Accesibilidad móvil, teclado y navegador — base y auditoría automatizada completadas; pruebas reales pendientes

**Objetivo:** Asegurar que la experiencia funcione en computadora, móvil y tablet.

**Estado:** La base responsive, el skip link global, el foco visible, el gating de `Space`, las preferencias de movimiento/contraste y la checklist reproducible están implementados. axe 4.12.1 no encontró violaciones en las ocho rutas y Lighthouse 13.4.1 obtuvo 100/100 de accesibilidad en preset desktop y configuración móvil predeterminada. Faltan pruebas con dispositivos reales, zoom, orientación, lector de pantalla y validación manual.

**Implementación:**

- Diseño responsive.
- Área principal de acción grande.
- Barra espacial capturada solo cuando el juego está activo.
- Teclado virtual móvil compatible.
- Soporte para zoom del navegador.
- Manifest PWA opcional.
- Evitar orientación obligatoria cuando sea posible.
- Añadir instrucciones para usar un interruptor externo que simule la barra espaciadora.

**Tests:**

- Juego completo en escritorio con espacio.
- Juego completo en móvil con un toque.
- Juego completo con zoom al 200%.
- Navegación con teclado.
- Prueba en tablet.
- Prueba con orientación vertical y horizontal.

**Demo:** El mismo juego puede completarse con espacio en computadora y toque en celular.

### Task 14: Validación con usuarios y revisión legal — protocolo documentado; validación pendiente

**Objetivo:** Validar la accesibilidad real y revisar obligaciones ecuatorianas antes de presentar el sistema como producto.

**Estado:** El protocolo de [`docs/accessibility-validation.md`](./docs/accessibility-validation.md) define participantes, guion, métricas, privacidad, fuentes oficiales y pendientes legales. No se han realizado todavía pruebas con personas de 70–80 años ni una revisión jurídica profesional, por lo que no se afirma conformidad legal o accesibilidad total.

**Implementación:**

- Preparar pruebas con personas de 70–80 años.
- Incluir distintos perfiles:
  - movilidad reducida;
  - temblor;
  - baja visión;
  - hipoacusia;
  - poca experiencia digital.
- Medir:
  - comprensión de instrucciones;
  - éxito sin ayuda;
  - errores accidentales;
  - fatiga;
  - abandono;
  - preferencia de entrada.
- Revisar con fuente oficial:
  - Registro Oficial;
  - INEN;
  - normativa de protección de datos;
  - normativa de adultos mayores.
- Documentar que el sistema no es médico ni diagnóstico.

**Tests:**

- Pruebas moderadas con usuarios reales.
- Auditoría WCAG automatizada y manual.
- Revisión de privacidad.
- Revisión de textos de consentimiento y uso de cámara.

**Demo:** Al menos un usuario de cada perfil puede completar un juego con su modalidad preferida.

### Task 15: Optimización para Vercel Free y Supabase Free

**Objetivo:** Mantener el sistema dentro de las capas gratuitas.

**Implementación:**

- Ejecutar MediaPipe únicamente en el cliente.
- No enviar frames al servidor.
- Lazy-load de juegos y MediaPipe.
- Servir assets estáticos desde Vercel.
- Registrar sesiones en lugar de eventos por frame.
- Usar consultas agregadas y paginadas.
- Evitar polling frecuente.
- Generar PDFs, si se mantienen, en el navegador.
- Documentar el comportamiento de pausa de Supabase Free.
- Configurar variables de entorno sin incluir secretos en el cliente.

**Tests:**

- Medir tamaño del bundle.
- Medir llamadas de red por sesión.
- Revisar uso de base de datos estimado.
- Ejecutar Lighthouse.
- Ejecutar prueba E2E de jugador y cuidador.

**Demo:** Plataforma completa desplegada en Vercel, funcional dentro del consumo esperado del plan gratuito.

## Criterios de éxito del primer MVP

El MVP será aceptable cuando:

1. Un cuidador pueda crear perfiles.
2. Varios jugadores puedan compartir un dispositivo.
3. Un jugador pueda seleccionar su perfil por nombre/avatar.
4. Los cuatro juegos funcionen con una sola pulsación de espacio.
5. Los cuatro juegos funcionen con un toque en móvil.
6. La cámara sea opcional.
7. No se requieran movimientos rápidos ni precisión fina.
8. Todos los sonidos tengan equivalente visual.
9. Se guarden solo sesiones, juegos, minutos y nombre.
10. El cuidador vea actividad no clínica.
11. No se almacene video.
12. Se hayan hecho pruebas con personas de 70–80 años.
13. Se haya verificado la normativa ecuatoriana aplicable en fuentes oficiales.

## Restricciones de alcance

- El sistema no es un dispositivo médico.
- El sistema no realiza diagnósticos ni evaluaciones clínicas.
- No se almacenará video, imágenes de cámara ni datos biométricos derivados.
- La cámara será opcional y se procesará localmente cuando esté habilitada.
- El audio será opcional y nunca será el único canal de información.
- Los valores de tiempos, velocidades, hitboxes y umbrales deberán validarse con usuarios reales.
