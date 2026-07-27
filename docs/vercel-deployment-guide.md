# Guía de Despliegue a Vercel

## 📋 Requisitos Previos
- ✅ Supabase configurado ([ver guía](./supabase-setup-guide.md))
- ✅ Código subido a GitHub
- Cuenta en [vercel.com](https://vercel.com) (gratis)

## 🚀 Opción 1: Despliegue desde GitHub (Recomendado)

### Paso 1: Preparar el Repositorio en GitHub

1. **Verifica que tu código esté en GitHub:**
   ```powershell
   git status
   git add .
   git commit -m "Preparado para despliegue en Vercel"
   git push origin main
   ```

2. **Verifica que `.env.local` NO esté en el repo:**
   ```powershell
   git status
   # .env.local NO debe aparecer (está en .gitignore)
   ```

### Paso 2: Crear Proyecto en Vercel

1. Ve a [https://vercel.com](https://vercel.com)
2. Click en **"Sign Up"** o **"Log In"**
3. Conecta con tu cuenta de GitHub
4. Click en **"Add New..." → "Project"**
5. Busca tu repositorio `mayorsperson` (o el nombre de tu repo)
6. Click en **"Import"**

### Paso 3: Configurar Variables de Entorno

**⚠️ CRÍTICO:** Antes de hacer deploy, configura las variables:

1. En la página de configuración del proyecto, busca **"Environment Variables"**

2. Añade estas 3 variables (una por una):

   **Variable 1:**
   - **Name**: `NEXT_PUBLIC_SUPABASE_URL`
   - **Value**: Tu URL de Supabase (ej: `https://xxxxxxxxxxxx.supabase.co`)
   - **Environment**: Marca las 3 opciones (Production, Preview, Development)
   - Click **"Add"**

   **Variable 2:**
   - **Name**: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **Value**: Tu API key anon/public de Supabase
   - **Environment**: Marca las 3 opciones
   - Click **"Add"**

   **Variable 3 (Opcional - para Gemini AI):**
   - **Name**: `GEMINI_API_KEY`
   - **Value**: Tu clave de Gemini API (si la tienes)
   - **Environment**: Marca las 3 opciones
   - Click **"Add"**

3. **Verifica que tienes:**
   - ✓ `NEXT_PUBLIC_SUPABASE_URL`
   - ✓ `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - ✓ `GEMINI_API_KEY` (opcional)

### Paso 4: Configurar Build Settings

Vercel debería detectar automáticamente que es un proyecto Next.js:

- **Framework Preset**: `Next.js`
- **Build Command**: `npm run build` (o dejarlo en blanco)
- **Output Directory**: `.next` (o dejarlo en blanco)
- **Install Command**: `npm install` (o dejarlo en blanco)

**No cambies nada** si dice "Next.js" - Vercel sabe qué hacer.

### Paso 5: Deploy

1. Click en **"Deploy"**
2. Espera 2-3 minutos mientras Vercel:
   - ✓ Clona tu repositorio
   - ✓ Instala dependencias (`npm install`)
   - ✓ Compila el proyecto (`npm run build`)
   - ✓ Despliega a su CDN global

3. **¡Listo!** Verás:
   ```
   🎉 Congratulations!
   Your project is now live at:
   https://mayorsperson-xxxxx.vercel.app
   ```

### Paso 6: Verificar el Despliegue

1. Click en **"Visit"** o copia la URL
2. Deberías ver tu aplicación funcionando
3. **Prueba el flujo completo:**
   - Ve a `/login`
   - Crea una cuenta de prueba
   - Ve a `/perfiles` y crea jugadores
   - Ve a `/juegos` y selecciona participantes

4. **Verifica en Supabase:**
   - Ve a Supabase → Authentication → Users
   - Deberías ver el usuario que creaste desde Vercel ✅

## 🚀 Opción 2: Despliegue con Vercel CLI (Alternativa)

### Instalar Vercel CLI

```powershell
npm install -g vercel
```

### Login

```powershell
vercel login
```

### Deploy

```powershell
# Primer deploy (te hará preguntas)
vercel

# O deploy directo a producción
vercel --prod
```

### Configurar Variables de Entorno

```powershell
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Pega tu URL cuando te lo pida

vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
# Pega tu API key cuando te lo pida
```

### Re-deploy con las Variables

```powershell
vercel --prod
```

## ⚙️ Configuraciones Adicionales (Opcionales)

### Dominio Personalizado

1. En Vercel, ve a tu proyecto → **"Settings" → "Domains"**
2. Click en **"Add"**
3. Escribe tu dominio (ej: `mayorsperson.com`)
4. Sigue las instrucciones para configurar DNS

### Configurar CORS en Supabase

Si tienes problemas de CORS:

1. Ve a Supabase → **"Settings" → "API"**
2. En **"Additional Settings"**, busca **"CORS"**
3. Añade tu dominio de Vercel:
   ```
   https://mayorsperson-xxxxx.vercel.app
   ```

### Variables de Entorno Adicionales

Si en el futuro necesitas más variables:

1. Vercel Dashboard → Tu proyecto → **"Settings" → "Environment Variables"**
2. Click en **"Add New"**
3. Añade la variable
4. Re-deploy para que tome efecto:
   - Ve a **"Deployments"**
   - Click en los 3 puntos del último deploy → **"Redeploy"**

## 🔄 Actualizaciones Automáticas

Vercel detecta cambios automáticamente:

1. Haces cambios en tu código local
2. Commit y push a GitHub:
   ```powershell
   git add .
   git commit -m "Mejora en perfil de jugadores"
   git push origin main
   ```
3. Vercel detecta el push y **despliega automáticamente** 🎉
4. Recibirás un email cuando termine el deploy

### Branches y Preview Deployments

- **Branch `main`**: Se despliega a producción
- **Otras branches**: Vercel crea preview URLs automáticamente
  ```powershell
  git checkout -b feature/nueva-funcionalidad
  git push origin feature/nueva-funcionalidad
  # Vercel crea: https://mayorsperson-git-feature-nueva-funcionalidad.vercel.app
  ```

## 🔒 Seguridad en Producción

### Variables de Entorno Seguras

✅ **Correcto** (con `NEXT_PUBLIC_`):
- `NEXT_PUBLIC_SUPABASE_URL` → Visible en el navegador
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` → Visible en el navegador

❌ **Incorrecto** (sin `NEXT_PUBLIC_`):
- `GEMINI_API_KEY` → Solo en servidor, nunca expuesta
- Cualquier clave privada → Nunca uses `NEXT_PUBLIC_` para claves privadas

### Configurar Supabase RLS

El script SQL ya configuró Row Level Security (RLS):
- ✓ Los cuidadores solo ven SUS datos
- ✓ No pueden acceder a datos de otros usuarios
- ✓ Las políticas protegen todas las tablas

Verifica las políticas en:
- Supabase → **"Authentication" → "Policies"**

### Rate Limiting (Opcional)

Para producción, considera configurar rate limiting en Supabase:

1. Supabase → **"Settings" → "API"**
2. Configura límites según tu plan

## 📊 Monitoreo

### Ver Logs en Vercel

1. Vercel Dashboard → Tu proyecto → **"Logs"**
2. Filtra por:
   - **Runtime Logs**: Errores del servidor
   - **Build Logs**: Errores de compilación
   - **Static**: Archivos estáticos

### Ver Métricas

1. Vercel Dashboard → Tu proyecto → **"Analytics"**
2. Verás:
   - Número de visitantes
   - Tiempo de carga
   - Web Vitals (Core Web Vitals)

### Ver Logs en Supabase

1. Supabase → **"Logs"**
2. Filtra por:
   - **API**: Peticiones a la API
   - **Auth**: Login/logout
   - **Database**: Queries

## 🧪 Testing en Producción

### Crear Usuario de Prueba

1. Ve a tu URL de Vercel: `https://mayorsperson-xxxxx.vercel.app/login`
2. Crea una cuenta con email real (para recibir confirmaciones)
3. Sigue el flujo completo:
   - Login → Perfiles → Añadir/Eliminar → Juegos

### Verificar Base de Datos

1. Supabase → **"Table Editor"**
2. Verifica que los datos se guardan:
   - ✓ `profiles`: Tu usuario
   - ✓ `caregiver_players`: Jugadores creados
   - ✓ `player_settings`: Configuraciones
   - ✓ `game_sessions`: Sesiones jugadas

## 🔧 Troubleshooting

### Error: "Missing environment variables"

**Solución:**
1. Ve a Vercel → Settings → Environment Variables
2. Verifica que todas las variables estén configuradas
3. Re-deploy:
   - Deployments → 3 puntos → Redeploy

### Error: Build Failed

**Solución:**
1. Ve a **"Deployments" → Click en el deploy fallido**
2. Lee los logs de error
3. Arregla el error localmente:
   ```powershell
   npm run build
   # Si compila local, haz push
   git add .
   git commit -m "Fix build error"
   git push
   ```

### Error: "Failed to fetch" en producción

**Solución:**
1. Verifica la URL de Supabase en Environment Variables
2. Verifica que Supabase esté activo (no pausado)
3. Verifica CORS en Supabase

### La app funciona local pero no en Vercel

**Solución:**
1. Verifica las variables de entorno en Vercel
2. Compara `.env.local` (local) con Environment Variables (Vercel)
3. Re-deploy después de añadir variables faltantes

### Cambios no se reflejan

**Solución:**
1. Verifica que hiciste push a GitHub:
   ```powershell
   git status
   # Todo debe estar committed
   ```
2. Verifica en Vercel → Deployments que haya un nuevo deploy
3. Limpia caché del navegador (`Ctrl+Shift+R`)

## 🎯 Siguiente Paso

Una vez desplegado en Vercel, revisa:
- **[Deployment Checklist](./deployment-checklist.md)** - Verificación final

## 📚 Recursos Adicionales

- [Documentación de Vercel](https://vercel.com/docs)
- [Despliegue de Next.js](https://nextjs.org/docs/deployment)
- [Variables de entorno en Vercel](https://vercel.com/docs/concepts/projects/environment-variables)
- [Custom Domains](https://vercel.com/docs/concepts/projects/custom-domains)
