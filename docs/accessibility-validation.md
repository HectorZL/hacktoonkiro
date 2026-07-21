# Validación de accesibilidad, usuarios y revisión legal

## Alcance y estado

Este documento define cómo validar las Tasks 13 y 14 del MVP. Es un protocolo reproducible y un registro de evidencias; no sustituye una auditoría de accesibilidad, una evaluación clínica ni asesoría jurídica.

Estados usados en este documento:

- **Implementado:** existe soporte en el código, pero todavía debe comprobarse en los dispositivos indicados.
- **Ejecutado:** se realizó la comprobación y se anotó el resultado con fecha, dispositivo, navegador y versión.
- **Pendiente:** no se debe presentar como resultado hasta completar la prueba.
- **Requiere revisión profesional:** necesita evaluación humana especializada o asesoría jurídica.

### Evidencia disponible al preparar este protocolo

- Implementado: layout responsive, áreas táctiles grandes, foco visible, skip link global, `prefers-reduced-motion`, `forced-colors`, `prefers-contrast`, `aria-live` y equivalentes visuales para audio.
- Implementado: `Space` solo despacha la acción cuando la actividad está activa; no se exige una pulsación larga y se mantiene cooldown contra rebotes.
- Ejecutado el 20 de julio de 2026 en Windows/PowerShell: `npm run lint`, `npm run build`, `git diff --check` y smoke HTTP de las siete rutas devolvieron resultado satisfactorio.
- Pendiente: pruebas en dispositivos reales, auditoría automatizada con axe/Lighthouse, revisión manual con lector de pantalla y pruebas con personas adultas mayores.
- Pendiente: revisión jurídica por una persona profesional en normativa ecuatoriana.

## Reproducción técnica

Ejecutar desde la raíz del repositorio en PowerShell:

```powershell
npm install
npm run lint
npm run build
npm run start -- --port 3012
```

Con el servidor de producción iniciado, comprobar las rutas principales:

```powershell
$routes = @('/', '/entrada', '/perfiles', '/motor', '/juegos/carrera-sacos', '/juegos/trompo', '/juegos/jardin-virtual')
foreach ($route in $routes) {
  $response = Invoke-WebRequest -Uri ("http://localhost:3012" + $route) -UseBasicParsing
  if ($response.StatusCode -ne 200) { throw "Ruta fallida: $route" }
  Write-Host "$route -> $($response.StatusCode)"
}
```

Registrar la fecha, sistema operativo, navegador, viewport y resultado en cada ejecución. `npm run lint`, `npm run build` y el smoke test son comprobaciones de regresión; no prueban por sí solos accesibilidad completa.

## Checklist multiplataforma

Marcar cada casilla solo después de observar el comportamiento. El estado inicial de esta tabla es deliberadamente pendiente para las pruebas que requieren ejecución humana o dispositivos concretos.

| Escenario | Procedimiento reproducible | Resultado esperado | Estado inicial |
| --- | --- | --- | --- |
| Escritorio + Space | Abrir cada juego en Windows/macOS/Linux; seleccionar “Barra espaciadora”; iniciar; pulsar `Space` una vez por acción | La acción se ejecuta una vez; fuera del estado activo no se despacha acción ni se bloquea el scroll del navegador | Pendiente de ejecución |
| Pulsación larga | Mantener `Space` durante al menos 2 segundos en cada estado activo | No se generan acciones repetidas por `event.repeat`; el cooldown protege rebotes | Pendiente de ejecución |
| Mobile + un toque | Abrir cada juego en un teléfono; seleccionar “Un toque”; iniciar; tocar el botón principal una vez | Una acción por toque, controles visibles y sin doble toque obligatorio | Pendiente de ejecución |
| Tablet | Repetir el flujo en tablet en vertical y horizontal | No hay recorte, solapamiento ni desplazamiento horizontal involuntario | Pendiente de ejecución |
| Zoom 200% | Usar zoom del navegador al 200% y recorrer inicio, configuración, juego y botones | El contenido sigue disponible sin pérdida de controles ni información | Pendiente de ejecución |
| Teclado y foco | Usar solo `Tab`, `Shift+Tab`, `Enter`, `Space` y `Escape`; observar el foco | Orden comprensible, foco visible, skip link al primer foco y ninguna trampa de teclado | Pendiente de ejecución |
| Orientación vertical/horizontal | Cambiar orientación durante la configuración y durante el juego | La actividad continúa; no se exige una orientación específica | Pendiente de ejecución |
| Movimiento reducido | Activar `prefers-reduced-motion: reduce`; iniciar y pausar cada juego | Animaciones y transiciones se reducen; la información esencial sigue visible | Pendiente de ejecución |
| Forced colors / alto contraste | Activar modo de colores forzados o alto contraste del sistema | Texto, controles, foco y estados siguen distinguibles sin depender solo del color | Pendiente de ejecución |
| Lector de pantalla | Recorrer encabezados, instrucciones, botones, progreso y mensajes con NVDA/VoiceOver/TalkBACK | Los nombres de controles, progreso y cambios de `aria-live` son comprensibles | Pendiente de ejecución |
| Audio silenciado | En Jardín Virtual no activar sonido o silenciarlo después de activarlo | La actividad y cada alerta se entienden por texto, icono, progreso o cambio visual | Pendiente de ejecución |
| Estado inactivo | Pulsar `Space` antes de iniciar, durante pausa y al terminar | No se ejecuta la acción del juego; iniciar, pausar y reiniciar siguen siendo controles explícitos | Pendiente de ejecución |

### Registro de evidencia

Para cada caso ejecutado registrar:

- fecha y hora;
- dispositivo, sistema operativo, navegador y versión;
- viewport y orientación;
- modo de entrada y nivel de asistencia;
- pasos realizados;
- resultado observado;
- incidencia, severidad y captura solo si no contiene datos personales;
- nombre o identificador del evaluador.

Severidades sugeridas: **bloqueante** (impide jugar), **alta** (impide una modalidad o comprensión), **media** (dificulta el uso) y **baja** (mejora no bloqueante).

## Validación automatizada y manual

### Automatizada

- [x] `npm run lint` sin errores (20 de julio de 2026, Windows/PowerShell).
- [x] `npm run build` sin errores (20 de julio de 2026, Next.js 16.2.10).
- [x] `git diff --check` sin espacios o conflictos accidentales.
- [x] Smoke HTTP de las siete rutas indicadas; todas respondieron `HTTP 200`.
- [ ] Auditoría axe o equivalente en inicio y en cada juego.
- [ ] Lighthouse de accesibilidad en las rutas representativas.

No hay una suite axe/E2E/Lighthouse configurada actualmente. Hasta añadirla o ejecutarla externamente, esos puntos permanecen pendientes.

### Manual

- [ ] Completar la matriz con teclado, toque y tablet.
- [ ] Verificar foco y skip link con teclado real.
- [ ] Verificar zoom 200% sin pérdida de controles.
- [ ] Verificar lector de pantalla y mensajes `aria-live`.
- [ ] Verificar reduced motion, forced colors y alto contraste.
- [ ] Confirmar que audio, color y animación tienen alternativas.
- [ ] Revisar que el contenido no diagnostique, puntúe la salud ni interprete el desempeño.

## Protocolo de pruebas con personas adultas mayores

### Objetivo

Comprobar comprensión, esfuerzo y posibilidad de completar una actividad con una sola entrada. La prueba evalúa la interfaz, no la capacidad, salud o desempeño clínico de la persona participante.

### Participantes y diversidad de acceso

Reclutar voluntariamente personas de aproximadamente 70–80 años, con consentimiento informado, procurando incluir participantes con:

- movilidad reducida;
- temblor u otra dificultad de precisión;
- baja visión o necesidad de aumento;
- pérdida auditiva o preferencia por jugar sin sonido;
- poca experiencia digital;
- distintas preferencias entre teclado, toque y mano simulada.

No es necesario ni apropiado registrar diagnósticos. Si una condición funcional se comunica para adaptar la sesión, registrar únicamente la adaptación necesaria y con consentimiento, no una historia clínica.

### Preparación y seguridad

1. Explicar que se prueba el producto, no a la persona, y que puede detenerse en cualquier momento.
2. Obtener consentimiento antes de iniciar y autorización separada si se desea tomar notas, audio, video o fotografías. La opción predeterminada es no grabar.
3. Preparar una sesión de 20–30 minutos, con descansos y sin presión de tiempo.
4. Ofrecer el dispositivo estable, volumen configurable, texto ampliado y ayuda física solo cuando sea necesaria.
5. No pedir movimientos que produzcan dolor, fatiga o riesgo de caída.
6. Detener la sesión ante dolor, mareo, fatiga manifiesta, frustración sostenida o solicitud de la persona.
7. Usar códigos de participante; no incluir nombres, diagnósticos ni imágenes en el reporte público.

### Guion de tareas

Para cada participante, contrabalancear cuando sea posible el orden de modalidades:

1. Leer o escuchar la instrucción inicial y explicar con sus propias palabras qué debe hacer.
2. Completar una actividad con la modalidad preferida: espacio, toque o mano simulada.
3. Pausar y reanudar.
4. Repetir una instrucción.
5. Provocar una acción fuera de tiempo y comprobar que puede continuar sin penalización.
6. Repetir parte del flujo con otra modalidad si la persona lo acepta.
7. Preguntar qué entrada elegiría para usar el sistema en casa y qué cambiaría.

La persona moderadora debe dar solo ayuda estandarizada y anotar cuándo se entrega. No corregir innecesariamente ni convertir la sesión en una evaluación de velocidad o precisión.

### Métricas mínimas

Registrar por tarea, usando códigos y notas breves:

- comprensión de la instrucción: espontánea, con repetición o con ayuda;
- éxito sin ayuda: completó, completó con ayuda o no completó;
- activaciones accidentales: cantidad observada y contexto;
- fatiga: auto-reporte simple antes/después y solicitud de descanso;
- abandono: tarea abandonada, momento y motivo expresado;
- entrada preferida: espacio, toque, mano, otra o sin preferencia;
- incidencias de accesibilidad y severidad.

No convertir estas métricas en diagnósticos, puntuaciones de salud ni conclusiones sobre una persona. Reportar resultados agregados y las limitaciones del número de participantes.

### Criterio de salida

La prueba no se considera aprobada por una cifra aislada. El equipo debe revisar patrones, incidencias y comentarios, corregir bloqueantes y repetir las tareas afectadas. Los resultados reales, fechas y decisiones deben añadirse aquí antes de afirmar que Task 14 fue validada.

## Privacidad, cámara y datos mínimos

- [ ] Informar qué datos se guardan, para qué se usan, durante cuánto tiempo y cómo solicitar eliminación.
- [ ] Obtener consentimiento claro para perfiles, sesiones y cualquier uso opcional de cámara.
- [ ] Mantener el registro de sesiones limitado a jugador, juego, inicio, fin, duración, modo de entrada y asistencia.
- [ ] No guardar video, imágenes, audio, biometría derivada, diagnóstico ni eventos por frame.
- [ ] Mantener la cámara desactivada por defecto y explicar que el modo de mano preparado no equivale todavía a una integración MediaPipe real.
- [ ] Procesar la cámara localmente si se implementa; no enviarla al servidor sin una decisión y consentimiento específicos.
- [ ] Proteger el acceso a sesiones con RLS cuando se use Supabase.
- [ ] Revisar retención, eliminación, respaldo y acceso del fallback `localStorage`.
- [ ] Evitar datos personales en capturas, logs, commits y reportes de pruebas.
- [ ] Revisar textos de privacidad y consentimiento con asesoría especializada antes de un uso real.

## Revisión normativa ecuatoriana

Esta lista identifica fuentes que deben revisar el equipo y una persona profesional. Los enlaces son referencias de consulta, no una conclusión de cumplimiento:

- [Registro Oficial del Ecuador](https://www.registroficial.gob.ec/): verificar texto publicado, vigencia y reformas de las normas aplicables.
- [Leyes de la Asamblea Nacional](https://leyes.asambleanacional.gob.ec/): consultar la Constitución, la Ley Orgánica de las Personas Adultas Mayores, la Ley Orgánica de Discapacidades y la Ley Orgánica de Protección de Datos Personales.
- [Corte Constitucional — derechos de personas adultas mayores](https://constitucionviva.corteconstitucional.gob.ec/sontusderechos/adulta-mayor/): revisar derechos y enfoque de grupo de atención prioritaria.
- [Consejo de la Judicatura — accesibilidad para personas con discapacidad](https://www.funcionjudicial.gob.ec/ecuador-tercer-pais-de-america-con-manual-judicial-para-atender-a-personas-con-discapacidad/): considerar orientación institucional de accesibilidad y atención.
- [ISO — miembro INEN](https://www.iso.org/member/1711.html): localizar la información oficial disponible sobre normas técnicas ecuatorianas; confirmar directamente con INEN la vigencia y alcance de cualquier NTE citada.
- [WCAG 2.2, W3C](https://www.w3.org/TR/WCAG22/): referencia técnica internacional de accesibilidad web; no reemplaza la norma ecuatoriana ni una revisión legal.

### Pendientes legales explícitos

- [ ] Identificar con asesoría jurídica las obligaciones concretas aplicables al contexto, responsables y finalidad del tratamiento.
- [ ] Revisar aviso de privacidad, consentimiento, cámara opcional, perfiles compartidos, retención y eliminación.
- [ ] Confirmar la base jurídica y los mecanismos para ejercer derechos sobre datos personales.
- [ ] Confirmar si alguna norma técnica ecuatoriana es obligatoria para el contexto de despliegue y cuál es su versión vigente.
- [ ] Documentar nombre, fecha, alcance y conclusión de la revisión profesional.
- [ ] No publicar una afirmación de “cumplimiento legal” o “accesibilidad total” antes de cerrar estos puntos.

## Resultado y control de cambios

Al cerrar una ronda de validación, actualizar las casillas con fecha y referencia a incidencias. Mantener separadas las conclusiones técnicas, los resultados con usuarios y la opinión jurídica. Una ejecución exitosa de lint o build no demuestra por sí sola que una persona mayor pueda usar el sistema ni que el producto cumpla toda la normativa aplicable.
