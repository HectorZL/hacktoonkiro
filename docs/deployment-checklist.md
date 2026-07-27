# 🚀 Checklist de Despliegue a Producción

## Pre-requisitos

### ✅ Desarrollo Local Funcionando
- [ ] `npm install` ejecutado sin errores
- [ ] `npm run build` compila sin errores
- [ ] `npm run lint` pasa sin errores
- [ ] Aplicación funciona en `http://localhost:3000`
- [ ] Modo demo funciona correctamente (sin Supabase)

### ✅ Código en GitHub
- [ ] Repositorio creado en GitHub
- [ ] `.gitignore` incluye `.env.local` y `node_modules`
- [ ] Último código subido con `git push`
- [ ] `.env.local` NO está en el repositorio

---

## 📦 PARTE 1: Configurar Supabase

### 1.1 Crear Proyecto
- [ ] Cuenta creada en [supabase.com](https://supabase.com)
- [ ] Proyecto nuevo creado
- [ ] Región seleccionada (cerca de tus usuarios)
- [ ] Contraseña de base de datos guardada de forma segura

### 1.2 Ejecutar Script SQL
- [ ] Abierto SQL Editor en Supabase
- [ ] Contenido de `supabase-setup.sql` copiado
- [ ] Script ejecutado con éxito (`Success. No rows returned`)

### 1.3 Verificar Tablas
- [ ] Tabla `profiles` existe
- [ ] Tabla `caregiver_players` existe
- [ ] Tabla `player_settings` existe
- [ ] Tabla `game_sessions` existe
- [ ] Políticas RLS habilitadas en todas las tablas

### 1.4 Obtener Credenciales
- [ ] `Project URL` copiada (ej: `https://xxxx.supabase.co`)
- [ ] `anon public key` copiada (empieza con `eyJhbGc...`)
- [ ] Credenciales guardadas de forma segura

### 1.5 Configurar Autenticación
- [ ] Email provider habilitado
- [ ] Decisión tomada sobre confirmación de email:
  - [ ] OFF para testing rápido
  - [ ] ON para producción

### 1.6 Probar Localmente con Supabase
- [ ] `.env.local` creado con las credenciales
- [ ] Servidor reiniciado (`npm run dev`)
- [ ] Usuario de prueba creado desde `/login`
- [ ] Jugador de prueba creado desde `/perfiles`
- [ ] Usuario aparece en Supabase → Authentication → Users
- [ ] Jugador aparece en Supabase → Table Editor → caregiver_players

**🔴 NO CONTINÚES si algún checkbox falla. Revisa [supabase-setup-guide.md](./supabase-setup-guide.md)**

---

## 🌐 PARTE 2: Desplegar a Vercel

### 2.1 Preparar Deploy
- [ ] Últimos cambios commiteados
- [ ] Push a GitHub completado
- [ ] Verificado que `.env.local` NO está en GitHub

### 2.2 Crear Proyecto en Vercel
- [ ] Cuenta creada en [vercel.com](https://vercel.com)
- [ ] Conectado con GitHub
- [ ] Repositorio importado en Vercel
- [ ] Framework detectado como "Next.js"

### 2.3 Configurar Variables de Entorno
- [ ] `NEXT_PUBLIC_SUPABASE_URL` añadida
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` añadida
- [ ] `GEMINI_API_KEY` añadida (opcional)
- [ ] Todas las variables marcadas para: Production, Preview, Development

### 2.4 Deploy Inicial
- [ ] Click en "Deploy"
- [ ] Build completado con éxito
- [ ] URL de producción generada (ej: `https://mayorsperson.vercel.app`)

### 2.5 Verificar Deploy
- [ ] URL de Vercel abierta en navegador
- [ ] Página principal carga correctamente
- [ ] No hay errores en la consola del navegador

**🔴 NO CONTINÚES si el deploy falla. Revisa [vercel-deployment-guide.md](./vercel-deployment-guide.md)**

---

## 🧪 PARTE 3: Testing en Producción

### 3.1 Test de Autenticación
- [ ] Ir a `https://tu-app.vercel.app/login`
- [ ] Crear nueva cuenta de prueba en producción
- [ ] Login exitoso (redirige a `/juegos`)
- [ ] Usuario aparece en Supabase → Authentication → Users

### 3.2 Test de Gestión de Jugadores
- [ ] Ir a `/perfiles`
- [ ] Crear jugador: "Test María"
- [ ] Jugador aparece en la lista
- [ ] Jugador aparece en Supabase → caregiver_players
- [ ] Seleccionar jugador
- [ ] Eliminar jugador (botón ×)
- [ ] Confirmación aparece
- [ ] Jugador eliminado de la lista
- [ ] Jugador eliminado de Supabase

### 3.3 Test de Configuración de Partida
- [ ] Crear 2-3 jugadores de prueba
- [ ] Ir a `/juegos`
- [ ] Jugadores aparecen en la lista
- [ ] Seleccionar 2+ jugadores
- [ ] Seleccionar un juego (ej: Trivia Ecuador)
- [ ] Configurar rondas (ej: 3)
- [ ] Click en "Comenzar partida"
- [ ] Redirige al juego seleccionado
- [ ] Juego carga correctamente

### 3.4 Test de Sesiones (Opcional)
- [ ] Completar una partida
- [ ] Ir a `/cuidador`
- [ ] Verificar que la sesión aparece
- [ ] Verificar datos en Supabase → game_sessions

### 3.5 Test de Navegación
- [ ] Home (`/`) → Links funcionan
- [ ] Login (`/login`) → Autenticación funciona
- [ ] Perfiles (`/perfiles`) → CRUD funciona
- [ ] Juegos (`/juegos`) → Selección funciona
- [ ] Cuidador (`/cuidador`) → Dashboard carga
- [ ] Botones "Volver" funcionan

### 3.6 Test de Seguridad
- [ ] Cerrar sesión
- [ ] Intentar acceder a `/juegos` sin login
- [ ] Mensaje de "Inicia sesión" aparece
- [ ] Crear otro usuario (Usuario B)
- [ ] Usuario B no ve jugadores de Usuario A
- [ ] RLS funcionando correctamente ✅

### 3.7 Test de Responsive
- [ ] Abrir en móvil o DevTools móvil
- [ ] Layout responsive funciona
- [ ] Botones son tocables (44x44px mínimo)
- [ ] Textos legibles
- [ ] No hay scroll horizontal

### 3.8 Test de Accesibilidad Básica
- [ ] Navegación con Tab funciona
- [ ] Foco visible en todos los elementos
- [ ] Labels presentes en inputs
- [ ] Mensajes de error legibles
- [ ] aria-live funcionando en notificaciones

---

## 🔒 PARTE 4: Seguridad y Producción

### 4.1 Variables de Entorno
- [ ] `.env.local` NO está en GitHub
- [ ] Claves privadas NO tienen prefijo `NEXT_PUBLIC_`
- [ ] Solo claves públicas usan `NEXT_PUBLIC_`

### 4.2 Supabase RLS
- [ ] Políticas RLS habilitadas en todas las tablas
- [ ] Verificado que usuarios solo ven sus datos
- [ ] Probado con múltiples cuentas

### 4.3 Autenticación
- [ ] Passwords tienen mínimo 6 caracteres
- [ ] Confirmación de email configurada (si aplica)
- [ ] No hay tokens hardcodeados en el código

### 4.4 Rate Limiting (Opcional para MVP)
- [ ] Considerar configurar en Supabase
- [ ] Considerar configurar en Vercel (planes Pro+)

---

## 📊 PARTE 5: Monitoreo

### 5.1 Configurar Alertas
- [ ] Email de notificaciones de Vercel configurado
- [ ] Alertas de deploy habilitadas
- [ ] Monitoreo de errores considerado

### 5.2 Analytics (Opcional)
- [ ] Vercel Analytics habilitado (si disponible)
- [ ] Google Analytics configurado (opcional)

### 5.3 Logs
- [ ] Saber cómo acceder a logs de Vercel
- [ ] Saber cómo acceder a logs de Supabase
- [ ] Plan para revisar logs periódicamente

---

## 📝 PARTE 6: Documentación

### 6.1 URLs y Credenciales
Documenta en un lugar seguro:

```
PRODUCCIÓN
==========
URL: https://_____.vercel.app
Supabase Project: _____
Supabase URL: https://_____.supabase.co
GitHub Repo: https://github.com/_____/_____

CREDENCIALES DE PRUEBA
======================
Email: _____@_____.com
Password: _____

ACCESOS
-------
Vercel Dashboard: https://vercel.com/dashboard
Supabase Dashboard: https://supabase.com/dashboard
GitHub Repo: https://github.com/_____/_____
```

### 6.2 README Actualizado
- [ ] URL de producción en README
- [ ] Instrucciones de desarrollo actualizadas
- [ ] Credenciales de prueba documentadas

### 6.3 Equipo Informado
- [ ] URLs compartidas con el equipo
- [ ] Credenciales de prueba compartidas
- [ ] Guías de despliegue accesibles

---

## 🎯 PARTE 7: Post-Deploy

### 7.1 Primera Hora
- [ ] Verificar que el sitio está accesible
- [ ] Probar flujo completo end-to-end
- [ ] Verificar logs por errores
- [ ] Confirmar que no hay errores de consola

### 7.2 Primer Día
- [ ] Monitorear analytics/tráfico
- [ ] Revisar logs de errores
- [ ] Verificar performance (Lighthouse)
- [ ] Probar desde diferentes dispositivos

### 7.3 Primera Semana
- [ ] Revisar uso de Supabase (límites del plan Free)
- [ ] Revisar uso de Vercel (límites del plan Free)
- [ ] Recoger feedback de usuarios
- [ ] Priorizar bugs críticos

---

## 🚨 Troubleshooting Rápido

### Build Failed
```powershell
# Probar local
npm run build

# Si falla, arreglar y push
git add .
git commit -m "Fix build"
git push
```

### Variables No Funcionan
1. Vercel → Settings → Environment Variables
2. Verificar nombres exactos
3. Re-deploy después de cambios

### RLS Bloqueando Acceso
1. Supabase → Authentication → Verificar user ID
2. Table Editor → Verificar caregiver_id
3. SQL Editor → Ejecutar query de verificación

### No Se Ven los Cambios
1. Verificar push a GitHub
2. Verificar nuevo deploy en Vercel
3. Limpiar caché del navegador (Ctrl+Shift+R)

---

## ✅ Checklist Final

**Antes de declarar "Listo para Entregar":**

- [ ] ✅ Supabase configurado y funcionando
- [ ] ✅ Vercel desplegado con éxito
- [ ] ✅ Variables de entorno configuradas
- [ ] ✅ Testing en producción completado
- [ ] ✅ Seguridad verificada (RLS, variables)
- [ ] ✅ URLs documentadas
- [ ] ✅ Credenciales guardadas
- [ ] ✅ Equipo informado
- [ ] ✅ README actualizado
- [ ] ✅ Sin errores críticos

---

## 🎉 ¡Felicidades!

Si todos los checkboxes están marcados, **¡tu aplicación está en producción!**

### Próximos Pasos Sugeridos:
1. Compartir URL con usuarios de prueba
2. Recoger feedback inicial
3. Monitorear errores y performance
4. Planear siguientes features
5. Considerar dominio personalizado

### Límites del Plan Free

**Supabase Free:**
- ✓ 500 MB de almacenamiento
- ✓ 2 GB de transferencia/mes
- ✓ 50,000 usuarios activos/mes
- ✓ Pausa después de 1 semana inactiva

**Vercel Free:**
- ✓ 100 GB de ancho de banda/mes
- ✓ 100 builds/mes
- ✓ Dominios ilimitados
- ✓ HTTPS automático

Para el MVP y testing, estos límites son más que suficientes 🚀

---

## 📚 Referencias

- [Guía de Supabase](./supabase-setup-guide.md)
- [Guía de Vercel](./vercel-deployment-guide.md)
- [Guía de Testing](./testing-checklist.md)
- [README del Proyecto](../README.md)
