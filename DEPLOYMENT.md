# 🚀 Guía Rápida de Despliegue

## Resumen para Desplegar HOY

Tu aplicación está lista para subir a producción. Aquí está el camino más rápido:

---

## 📋 3 Pasos Principales

### 1️⃣ SUPABASE (15 minutos)
Base de datos + Autenticación

**Qué hacer:**
1. Ir a [supabase.com](https://supabase.com) y crear cuenta
2. Crear nuevo proyecto
3. Ejecutar `supabase-setup.sql` en SQL Editor
4. Copiar URL y API Key

**Guía completa:** [docs/supabase-setup-guide.md](./docs/supabase-setup-guide.md)

---

### 2️⃣ VERCEL (10 minutos)
Hosting + Deploy automático

**Qué hacer:**
1. Ir a [vercel.com](https://vercel.com) y crear cuenta
2. Importar tu repo de GitHub
3. Añadir variables de entorno (URL y Key de Supabase)
4. Deploy

**Guía completa:** [docs/vercel-deployment-guide.md](./docs/vercel-deployment-guide.md)

---

### 3️⃣ VERIFICAR (5 minutos)
Testing básico

**Qué hacer:**
1. Abrir tu URL de Vercel
2. Crear cuenta de prueba
3. Crear jugadores
4. Iniciar partida

**Checklist completo:** [docs/deployment-checklist.md](./docs/deployment-checklist.md)

---

## ⚡ Ruta Express (30 minutos total)

```
1. Supabase
   ├─ Crear proyecto (5 min)
   ├─ Ejecutar SQL script (2 min)
   └─ Copiar credenciales (3 min)

2. Vercel
   ├─ Conectar GitHub (3 min)
   ├─ Configurar variables (4 min)
   └─ Deploy (3 min)

3. Probar
   ├─ Login (2 min)
   ├─ Crear jugadores (3 min)
   └─ Iniciar juego (2 min)

✅ LISTO PARA ENTREGAR
```

---

## 📁 Archivos Importantes

### Scripts y Configuración
- **`supabase-setup.sql`** → Ejecutar en Supabase SQL Editor
- **`.env.example`** → Plantilla para variables de entorno
- **`.env.local`** → Tu archivo local (NO subir a Git)

### Guías Paso a Paso
- **`docs/supabase-setup-guide.md`** → Setup completo de Supabase
- **`docs/vercel-deployment-guide.md`** → Deploy completo a Vercel
- **`docs/deployment-checklist.md`** → Verificación exhaustiva
- **`docs/testing-checklist.md`** → Testing funcional completo

---

## 🔑 Variables de Entorno Necesarias

Estas 2 son **OBLIGATORIAS** para producción:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Esta es **OPCIONAL** (solo si usas Gemini AI):

```env
GEMINI_API_KEY=tu_clave_gemini
```

### Dónde Configurarlas

**Para desarrollo local:**
- Copia `.env.example` a `.env.local`
- Completa con tus credenciales

**Para producción en Vercel:**
- Vercel Dashboard → Settings → Environment Variables
- Añade las 2 (o 3) variables

---

## ✅ Checklist Mínimo Antes de Entregar

Marca estos ítems como verificados:

- [ ] Código está en GitHub
- [ ] Supabase proyecto creado
- [ ] SQL script ejecutado
- [ ] Vercel proyecto creado
- [ ] Variables configuradas en Vercel
- [ ] Deploy exitoso (build pasó)
- [ ] URL de producción funciona
- [ ] Login funciona en producción
- [ ] Crear/eliminar jugadores funciona
- [ ] Iniciar partida funciona

**Si todos están ✅, estás listo para entregar** 🎉

---

## 🆘 Si Algo Falla

### Build Error en Vercel
```powershell
# Prueba local
npm run build

# Si falla, arregla y sube
git add .
git commit -m "Fix build"
git push
```

### Variables No Funcionan
1. Vercel → Settings → Environment Variables
2. Verifica nombres exactos (incluyendo `NEXT_PUBLIC_`)
3. Re-deploy: Deployments → Redeploy

### Login No Funciona
1. Verifica URL en Vercel Environment Variables
2. Verifica API Key en Vercel Environment Variables
3. Verifica que Supabase proyecto está activo

### Jugadores No Aparecen
1. Supabase → Authentication → Verifica que el usuario existe
2. Supabase → Table Editor → caregiver_players
3. Verifica que `caregiver_id` coincide con tu user ID

---

## 📊 Límites de Planes Gratuitos

### Supabase Free
- 500 MB almacenamiento
- 2 GB transferencia/mes
- 50,000 usuarios activos/mes
- **✅ Más que suficiente para MVP**

### Vercel Free
- 100 GB ancho de banda/mes
- 100 builds/mes
- Dominios ilimitados
- **✅ Más que suficiente para MVP**

---

## 🎯 Después del Deploy

### Inmediatamente
1. ✅ Probar URL de producción
2. ✅ Crear cuenta de prueba real
3. ✅ Verificar flujo completo
4. ✅ Compartir URL con el equipo

### Primera Semana
1. Monitorear errores en Vercel logs
2. Monitorear queries en Supabase logs
3. Recoger feedback de usuarios
4. Verificar uso de recursos

### Mejoras Futuras
1. Considerar dominio personalizado
2. Configurar analytics
3. Optimizar performance
4. Añadir más juegos

---

## 📞 URLs Importantes

### Dashboards
- **Supabase:** https://supabase.com/dashboard
- **Vercel:** https://vercel.com/dashboard
- **GitHub:** https://github.com/tu-usuario/tu-repo

### Tu App (después del deploy)
- **Producción:** https://tu-app.vercel.app
- **Preview:** https://tu-app-git-branch.vercel.app

---

## 💡 Consejos Pro

### Para Testing Rápido
- En desarrollo, puedes desactivar temporalmente la confirmación de email en Supabase si el equipo lo aprueba.
- Crea un usuario de evaluación desde Supabase Dashboard; no guardes su correo ni contraseña en el repositorio.
- Si aparece `email rate limit exceeded`, espera el período indicado o usa el usuario ya creado en lugar de repetir registros.

### Para Deploy Rápido
- Vercel detecta cambios automáticamente en GitHub
- Cada push a `main` = deploy automático
- Branches = preview URLs automáticos

### Para Debug Rápido
- Console del navegador (F12)
- Vercel → Logs
- Supabase → Logs

---

## 🎉 Todo Listo

Con estos archivos tienes TODO lo necesario:

1. ✅ Script SQL listo para ejecutar
2. ✅ Guías paso a paso con screenshots conceptuales
3. ✅ Checklist verificable
4. ✅ Troubleshooting para problemas comunes
5. ✅ Aplicación funcionando en local
6. ✅ Build pasando sin errores

**Tiempo estimado total: 30-45 minutos**

¡Adelante! 🚀
