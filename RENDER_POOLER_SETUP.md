# Configurar Supabase Pooler en Render

## Objetivo
Usar el connection pooler de Supabase (puerto 6543) en Render para optimizar conexiones en serverless.

## Pasos

### 1. Obtener URL del pooler desde Supabase
1. Accede a [Supabase Dashboard](https://app.supabase.com) → tu proyecto → **Database** → **Connection pooling**
2. Selecciona **Session mode** (recomendado para Next.js serverless)
3. Copia la URL de conexión que aparece (formato: `postgresql://[user]:[password]@[host]:6543/[database]?sslmode=require`)
4. Esta es tu **DATABASE_URL_POOLER**

### 2. Configurar en Render
1. Accede a [Render Dashboard](https://dashboard.render.com) → tu servicio (`tpv-restaurante`)
2. Ve a **Environment**
3. Añade/actualiza la variable:
   - **Key**: `DATABASE_URL_POOLER`
   - **Value**: `postgresql://[user]:[password]@[host]:6543/[database]?sslmode=require` (pega la URL del paso 1)
   - Marca como **Secret** (checkbox)
4. Haz clic en **Save Changes**

### 3. Verificar (opcional)
- El código en `lib/drizzle.ts` automáticamente preferirá `DATABASE_URL_POOLER` si está definida
- Si no está definida pero sí `DB_POOLER_PORT=6543`, intentará reemplazar el puerto de `DATABASE_URL`
- Las migraciones (drizzle-kit) también usarán `DATABASE_URL_POOLER` gracias a `drizzle.config.ts`

## Variables en render.yaml
Ya están incluidas:
- `DATABASE_URL_POOLER` — Variable secreta (sincronizada desde Render dashboard)
- `DB_POOLER_PORT` — Puerto por defecto 6543 (usado si no hay DATABASE_URL_POOLER explícita)
- `DB_POOL_MAX` — Máximo de conexiones en pool (20)
- `DB_POOL_IDLE_MS` — Tiempo inactivo antes de cerrar conexión (10s)
- `DB_CONN_TIMEOUT_MS` — Timeout para abrir conexión (5s)

## Notas
- El pooler en **Session mode** es mejor para serverless porque cada petición obtiene su propia conexión lógica.
- **Transaction mode** es más agresivo (reutiliza conexiones entre transacciones) pero puede causar problemas si no cierras explícitamente transacciones.
- Monitorea `pg_stat_activity` en Supabase Dashboard → **Database** → **Logs** para verificar que las conexiones se reutilizan.
