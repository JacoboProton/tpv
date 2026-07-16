<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# La Comanda — TPV Restaurante

## Stack

- **Next.js 16** (App Router, Turbopak, `"use client"` only on `app/page.jsx`)
- **React 19**, Tailwind 4 (`@import "tailwindcss"`, no `tailwind.config`), Lucide icons
- **PostgreSQL** via `pg` + **Drizzle ORM** (`drizzle-orm/node-postgres`)
- **Supabase Realtime** (Broadcast) para sincronización KDS/POS en tiempo real
- **Vitest 4** with jsdom, path alias `@/`
- **ESC/POS** thermal printing with WebUSB

## Key architecture

- `app/page.jsx` is the **SPA entrypoint** — a single 2400+ line `"use client"` component orchestrating all views via `view` state. All state (floor, catalog, sales, employees) lives here.
- Views are mounted conditionally: `{view === 'salon' && <SalonView .../>}`
- API routes in `app/api/*/route.ts` use Drizzle ORM (`import { getDb } from '@/lib/drizzle'`). Middleware (`app/middleware.js`) protects `/api/*` with `x-tpv-key` header.
- DB schema managed via Drizzle Kit: `db:schema.ts` auto-generated from `drizzle-kit pull`. Use `drizzle-kit generate` for migrations, `drizzle-kit push` for fresh DB sync.
- Seed data functions in `components/constants.js` (`seedCatalog`, `seedFloor`, `seedEmployees`). Called when DB returns empty.
- Seed data functions in `components/constants.js` (`seedCatalog`, `seedFloor`, `seedEmployees`). Called when DB returns empty.

## Offline architecture

- GET cache in `localStorage` with prefix `tpv:cache:` (read from cache on fetch failure)
- Mutations queue in `localStorage` (`tpv:mutations`) when offline, retried every 10s + on reconnect
- Use `lib/offline.js` helpers (`cacheGet`, `cacheSet`, `enqueueMutation`, `onNetworkChange`)
- `lib/api.js` `apiFetchWithCache()` wraps the pattern: fetch → cache → fallback

## Commands

```bash
npm run dev          # next dev (port 3000)
npm run build        # Production build
npm run lint         # ESLint 9 flat config
npm run test         # Vitest (jsdom) — 187 tests, 13 files
npm run db:push      # Sync Drizzle schema → DB (fresh DB / dev)
npm run db:generate  # Generate migration SQL after schema changes
npm run db:migrate   # Apply pending migrations
npm run db:pull      # Introspect DB → update Drizzle schema
```

## Conventions

- **No comments in code** unless necessary for clarity — let the code speak.
- **React inline styles** must use camelCase (`overflowY`, not `overflow-y`). Tailwind classes preferred for layout.
- **`<img>` instead of `<Image>`** — `@next/next/no-img-element` is explicitly disabled in the ESLint config.
- **Colors** come from a mutable `C` object (`components/constants.js:40-44`), swapped via `setGlobalTheme('dark'|'light')`. Always use `C.cream`, `C.muted`, `C.brass` etc. Never hardcode hex.
- **`seedFloor()`** layout: 9 mesas (left, 4-column grid), 6 barras (center), 4 delivery (right). Migration in `page.jsx` auto-upgrades old floors.
- **`clone()`** from `constants.js` for deep-copying state before mutation.
- **Floors** have `tables[]` with `type: 'mesa'|'barra'|'llevar'|'domicilio'`, `status`, `orderId`, `orderIds[]`.
- **Products** have `agotado` (boolean), `show_tpv`, `show_qr`, `course`, `ubicacion`, `allergens[]`.
- **Thermal printing** via `window.print()` with `#thermal-ticket` CSS or WebUSB ESC/POS from `lib/thermal-printer.js`.
- **Verifactu** (AEAT) uses Fiskaly REST API (no SDK) — `lib/verifactu.js` + `lib/fiskaly.js`.
- **Stripe** payments — two channels on `getStripe()` (returns `null` if `STRIPE_SECRET_KEY` missing).

## Stripe Payments

- **Two channels**: Online (card) via `StripeModal.jsx` + `POST /api/stripe/payment-intent` con `automatic_payment_methods` y `card.request_extended_authorization`. Terminal (NFC) via app móvil + `POST /api/stripe/terminal-payment-intent` con `payment_method_types: ['card_present']`.
- **`getStripe()`** (lazy singleton): devuelve `null` si falta `STRIPE_SECRET_KEY`. El SDK se instancia con `stripe-v17.7`.
- **Online flow**: (1) `StripeModal.jsx` carga `@stripe/stripe-js` con `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` solo si empieza por `pk_`. (2) `useEffect` → `POST /api/stripe/payment-intent` con `{amount, tableId, tableName, employeeName}`. (3) Ruta valida `amount <= 9999.99 EUR`, rate-limit 10 req/60s por IP, genera `idempotencyKey` de `tableId+amount+floor(Date.now()/5min)` (o usa uno del cliente), crea PI con `metadata: {tableId, tableName, employeeName, source: 'la-comanda-tpv', env, max_amount}`. (4) `clientSecret` → `Elements` + `StripePaymentForm` con `PaymentElement` (layout tabs, card primero). (5) `stripe.confirmPayment({elements, redirect: 'if_required'})`. Si `paymentIntent.status === 'succeeded'`, llama `onSuccess(paymentIntent)`.
- **Terminal (NFC)**: `POST /api/stripe/terminal-connection-token` genera connection token, resuelve `locationId` (caché en settings BD → `globalThis.__stripeLocationId` → lista `terminal.locations` limit 1 → crea con `STRIPE_LOCATION_*` env vars).
- **Webhook** (`/api/stripe/webhook`): verifica `stripe-signature` con `STRIPE_WEBHOOK_SECRET`, `stripe.webhooks.constructEvent(rawBody, sig, secret)`. Idempotencia vía `webhook_events(event_id PK, type, status, body, error, ...)`. `ensureEventTracked()` inserta `ON CONFLICT` que reabre si `failed`, skip si `processed/processing`. Eventos: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.dispute.*`. `handlePaymentIntentSucceeded`: si `metadata.qrOrderId` → `qr_orders.order_status='paid'`; si `metadata.tableId` → inserta venta 'stub' (`id='stub_'+pi.id`) si no existe, o marca `stripe_confirmed=true`. Disputas actualizan `sales.dispute_status` y `dispute_data` JSONB, log en `payment_logs`.
- **Reconciliation** (`/api/stripe/reconciliation?days=N`): lista PIs desde Stripe (max 5 páginas x 100), filtra por `metadata.source`. Compara con `sales` que tienen `payment_intent_id`. Devuelve: `orphans` (PI en Stripe sin venta en BD), `mismatches` (descuadres >1 céntimo), `refundMismatches` (devoluciones Stripe no registradas en `sales.refunds[].stripeRefundId`), `disputed` (disputas activas/perdidas), `salesNotInStripe` (ventas con PI no encontradas en Stripe).
- **Logging** (`lib/payment-logger.js`): tabla `payment_logs(event_id, payment_intent_id, operation, amount_cents, currency, status, table_id, table_name, employee_name, source, error, stripe_response slice 2000, created_at)`. Todos los endpoints Stripe logean (creación, webhook, error). Nunca rompe flujo (catch silencioso).

## Scroll gotchas

- Main content container has `maxHeight: '100vh'` with `overflowY: 'auto'` — overflow fixes go here (`page.jsx:1774`).
- Modals (Settings, clock-in, etc.) need explicit `max-h-[85vh] overflow-y-auto` on the inner card to scroll.
- Tab content areas in views like `GestoriaView` rely on the main container scroll — don't need their own.

## Realtime (Supabase Realtime)

- `server.js` is a plain Next.js custom server (no Socket.IO).
- `lib/realtime.js` provides: `connectRealtime()`, `broadcastFloorUpdate(floor)`, `disconnectRealtime()`.
- Uses Supabase Realtime **Broadcast** — no depende de la base de datos.
- Cada `persistFloor()` llama a `broadcastFloorUpdate()`.
- KDS (`app/kds/page.jsx`) y POS (`app/page.jsx`) escuchan el evento `floor:updated` y sincronizan el estado.
- Requiere `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en el entorno.

## Testing quirks

- Tests use **Vitest** (not Jest), run via `npm run test` or `npx vitest run`.
- 13 test files, 187 tests total (6 web + 7 mobile).
- `getDailyMenu("happy_hour")` test may return happy hour instead of undefined — happy hour is all-day in test seed.

## Tailwind 4 notes

- Config via CSS `@import "tailwindcss"` + `@theme inline {}` block — no `tailwind.config.js`.
- Utility classes defined as `@utility name { ... }` (glass, scrollbar-hide, price-glow).
- Key custom utilities: `scrollbar-hide` (for hiding scrollbars), `fade-up` (entry animation), `pulse-cuenta` (payment alert ring).

## Public pages

- `app/pedir/page.jsx` — Pedidos online (takeaway/delivery). Client-side, fetches `/api/catalog`, `/api/settings`, `/api/delivery-zones`. Dark theme from `qrThemePrimary`/`qrThemeSecondary` settings.
- `app/reservar/page.jsx` — Reservas online públicas. 4-step flow: date + pax (calendar), slot selection, contact form, confirmation. Fetches `/api/reservations/availability?date=...&pax=...` for slots. POST to `/api/reservations` with `source: 'online'`.
- `app/waitlist/page.jsx` — Lista de espera pública.
- `app/qr/[tableId]/page.jsx` — Menú QR por mesa.

## Online Reservations

- `app/api/reservations/availability/route.ts` — `GET /api/reservations/availability?date=YYYY-MM-DD&pax=N` returns `{ slots: [{time, available, paxRemaining}], isClosed, isBlocked, totalSeats, existingPax, availableSeats }`. Checks settings (schedule, closed days, blocked dates, interval, duration, max pax, online toggle), tables capacity, overlapping reservations, and past-time filtering.
- `app/api/reservations/route.ts` — Full CRUD (`GET`, `POST`, `DELETE`). Supports recurring reservations via `recurring=1` param. POST creates reservation with auto-assigned `res_` ID. Valid sources: `manual`, `online`, `qr`.
- `components/ReservasView.jsx` — Admin view: calendar (month/week/day), availability checker, status flow (pendiente→confirmada→sentada→noshow/cancelada), deposit tracking, recurring reservation support.
- `components/ReservaSettingsView.jsx` — Settings: schedule type (simple/advanced with shifts), closed days, blocked dates, interval, duration, max pax, auto-confirm, deposits, WhatsApp confirm/reminder, review request.

## env vars

See `.env.example` / README. Key: `TPV_API_KEY` and `NEXT_PUBLIC_TPV_API_KEY` must match for API auth. Missing `DATABASE_URL` throws at import time.

## Docker (punto débil #2 resuelto)

- `docker compose up --build` levanta PostgreSQL 16 + app en puerto 3000.
- `DATABASE_URL` apunta a `postgres://tpv:tpv_local_dev@postgres:5432/tpv_restaurant`.
- `scripts/docker-entrypoint.sh` corre `drizzle-kit push --force` automáticamente al arrancar (crea tablas en BD fresca).
- Fiskaly/Stripe no están configurados en `docker-compose.yml` — añadir como `environment:` si se necesitan.
- `output: 'standalone'` en `next.config.ts` — necesario para el multi-stage build.
- `server.js` escucha en `0.0.0.0:3000` (variable `HOST`).
- Para Realtime en Docker necesitas añadir `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` al servicio `app` en `docker-compose.yml`.
