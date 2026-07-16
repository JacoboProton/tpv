# La Comanda — TPV Restaurante

Sistema de TPV profesional para restaurantes con POS web, app móvil para camareros, pedidos online, reservas, KDS en tiempo real y pago NFC.

## Stack

- **Next.js 16** (App Router, Turbopak)
- **React 19**, Tailwind 4, Lucide icons
- **PostgreSQL** via `pg` + **Drizzle ORM**
- **Supabase Realtime** — sincronización en vivo POS/KDS/móvil
- **Expo / React Native** — app móvil para camareros (`mobile/`)
- **Vitest 4** con jsdom
- **ESC/POS** — impresión térmica con WebUSB
- **Stripe Terminal** — pago NFC Tap-to-Pay en móvil

## Arquitectura

- `app/page.jsx` — SPA central (~2500 líneas), orquesta todas las vistas vía estado `view`
- Vistas agrupadas en sidebar por bloques con códigos de color
- API routes en `app/api/*/route.ts` con Drizzle ORM (`lib/drizzle.ts`)
- Migraciones con Drizzle Kit (`drizzle-kit generate` / `push` / `migrate`)
- Seed data en `components/constants.js` (catalogo, sala, empleados)
- `tenant_id` en todas las tablas core para multi-local

## Sidebar — Grupos de Navegación

| Grupo | Color | Vistas |
|-------|-------|--------|
| **Sala y Cocina** | Azul | Salón, Emparejar (screen mirroring), Comandas, Cocina, Cocina KDS |
| **Operaciones** | Azul | Pedidos, Reservas, Lista Espera |
| **Canales** | Verde | Buffet Kiosk, Pedidos Online, Reparto |
| **Gestión** | Naranja | Inventario, Carta, Informes, Equipo, Ofertas, Combos, Menús, Carrusel, Precios |
| **Administración** | Rojo | Gestoría, Auditoría, Turnos, Reg. Horario, Solicitudes, Pedidos Compra, Producción |

Cada grupo tiene un color de acento propio. La vista activa se ilumina con el color del grupo.

## App Móvil (Expo)

- `mobile/` — Proyecto Expo con expo-router (SDK 56)
- `mobile/lib/api.ts` — Conexión al backend con `x-tpv-key` y `x-tenant-id`
- `mobile/lib/realtime.ts` — Escucha broadcasts de Supabase para actualizar en vivo
- Login con PIN → selección de perfiles → salón → comandas → cocina
- **Pago NFC** — Integración con `@stripe/stripe-terminal-react-native` para Tap-to-Pay en Android
  - Simulado (`STRIPE_SIMULATED=true`) para desarrollo, real en producción
  - Solicita permiso de ubicación (Android 13+) antes de conectar lector
  - Crea PaymentIntent desde servidor, evita error de publishable key
  - Persiste venta en caja al completar cobro

Para build:
```bash
cd mobile
npx eas build -p android --profile preview   # APK test
npx eas build -p android --profile production # Play Store
npx eas update --branch production --message "cambios"  # solo JS (OTA)
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
- `/waitlist` — Lista de espera pública
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
npm run db:push      # Sincronizar schema Drizzle → BD (fresh DB)
npm run db:generate  # Generar migración SQL tras cambios en schema
npm run db:migrate   # Aplicar migraciones pendientes
npm run db:pull      # Introspeccionar BD → actualizar schema Drizzle
```

## Variables de Entorno

Ver `.env.example`. Claves mínimas:

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Conexión PostgreSQL (Neon, local, etc.) |
| `TPV_API_KEY` | Clave API para middleware |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave anónima Supabase |
| `STRIPE_SECRET_KEY` | (opcional) Stripe Terminal |
| `STRIPE_WEBHOOK_SECRET` | (opcional) Webhook Stripe |
| `FISKALY_API_KEY` | (opcional) Verifactu |

## Docker

```bash
docker compose up --build
```

PostgreSQL 16 + app en puerto 3000.
- Las tablas se crean automáticamente via `drizzle-kit push --force` en el entrypoint.
- Realtime requiere configurar variables Supabase en `docker-compose.yml`.

## Testing

```bash
npx vitest run                    # Todos los tests (187 tests, 13 archivos)
npx vitest run __tests__/constants.test.ts   # Tests específicos
```
