# La Comanda — TPV Restaurante

Sistema de TPV profesional para restaurantes con POS web, app móvil para camareros, pedidos online, reservas y KDS en tiempo real.

## Stack

- **Next.js 16** (App Router, Turbopak)
- **React 19**, Tailwind 4, Lucide icons
- **PostgreSQL** via `@neondatabase/serverless` (HTTP) — sin ORM
- **Supabase Realtime** — sincronización en vivo POS/KDS/móvil
- **Expo / React Native** — app móvil para camareros (`mobile/`)
- **Vitest 4** con jsdom
- **ESC/POS** — impresión térmica con WebUSB

## Arquitectura

- `app/page.jsx` — SPA central (~2500 líneas), orquesta todas las vistas vía estado `view`
- Vistas condicionales: `{view === 'salon' && <SalonView .../>}`
- API routes en `app/api/*/route.js` con `@neondatabase/serverless`
- Migraciones automáticas en `lib/migrate.js` (idempotentes)
- Seed data en `components/constants.js` (catalogo, sala, empleados)
- `tenant_id` en todas las tablas core para multi-local

## App Móvil (Expo)

- `mobile/` — Proyecto Expo con expo-router
- `mobile/lib/api.ts` — Conexión al backend con `x-tpv-key` y `x-tenant-id`
- `mobile/lib/realtime.ts` — Escucha broadcasts de Supabase para actualizar en vivo
- Login con PIN → selección de perfiles → salón → comandas → cocina
- APK disponible en `https://tpv-sigma.vercel.app/descargar`

Para build:
```bash
cd mobile
npx eas build -p android --profile preview
npx eas update --branch production --message "cambios"  # solo JS
```

## Sincronización en Tiempo Real

- `lib/realtime.js` — Cliente Supabase Realtime (broadcast, no DB replication)
- `connectRealtime()` — Conecta al canal `floor-sync`
- `broadcastFloorUpdate()` / `broadcastFloorUpdateServer()` — Emiten evento `floor:updated`
- `app/api/floor/route.js` — Al guardar la sala, el servidor también emite broadcast
- KDS (`app/kds/page.jsx`) y POS escuchan el mismo evento
- Requiere `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Offline

- GET cache en localStorage (`tpv:cache:`)
- Cola de mutaciones (`tpv:mutations`) reintentada cada 10s
- Helpers en `lib/offline.js`

## Páginas Públicas

- `/pedir` — Pedidos online (takeaway/delivery)
- `/reservar` — Reservas online (4 pasos: fecha, hora, datos, confirmación)
- `/waitlist` — Lista de espera
- `/qr/[tableId]` — Menú QR por mesa
- `/descargar` — Descarga APK móvil (con QR)

## Multi-local (Tenants)

- `tenants` table + `tenant_id` en 40+ tablas
- PK compuestas `(tenant_id, id)` en tablas core
- Cabecera `x-tenant-id` en todas las peticiones API
- Selector de local en sidebar (solo admin)

## Convenciones

- Sin comentarios en código salvo necesarios
- Inline styles en camelCase; Tailwind para layout
- `<img>` en vez de `<Image>` (regla ESLint desactivada)
- Colores desde objeto `C` mutable (`components/constants.js:40-44`)
- `clone()` para deep-copy antes de mutar estado

## Comandos

```bash
npm run dev          # Next.js dev (port 3000)
npm run build        # Production build
npm run lint         # ESLint 9 flat config
npm run test         # Vitest (jsdom)
```

## Variables de Entorno

Ver `.env.example`. Claves mínimas:

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Conexión Neon PostgreSQL |
| `TPV_API_KEY` | Clave API para middleware |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave anónima Supabase |
| `STRIPE_SECRET_KEY` | (opcional) Stripe |
| `FISKALY_API_KEY` | (opcional) Verifactu |

## Docker

```bash
docker-compose up --build
```

PostgreSQL 16 + app en puerto 3000. Realtime requiere configurar variables Supabase.

## Testing

```bash
npx vitest run __tests__/constants.test.js
```

## Vercel

Deploy automático con `git push`. Requiere variables de entorno configuradas en dashboard.
