<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# La Comanda — TPV Restaurante

## Stack

- **Next.js 16** (App Router, Turbopak). Shell `"use client"` en `app/(taller)/layout.tsx`; las vistas son rutas reales de App Router con páginas `"use client"` por dominio.
- **React 19**, Tailwind 4 (`@import "tailwindcss"`, no `tailwind.config`), Lucide icons
- **PostgreSQL** via `pg` + **Drizzle ORM** (`drizzle-orm/node-postgres`)
- **Supabase Realtime** (Broadcast) para sincronización KDS/POS en tiempo real
- **Vitest 4** with jsdom, path alias `@/`
- **ESC/POS** thermal printing with WebUSB

## Key architecture

- `app/(taller)/layout.tsx` (333 líneas) es el **shell SPA**: dueño del estado global (floor, catalog, sales, employees, offers, combos, ticketSettings, toast) y orquestador de hooks (`useOrders`, `useKitchen`, `useInventory`, `useEmployees`, `useAppInit`, `useOfflineSync`, `useRealtimeSync`, `useQrPolling`, `useDebtOrder`, `useKeyboardShortcuts`, `useLoginRouting`).
- `app/(taller)/page.tsx` solo hace `redirect(routeFor('salon'))`. Las ~37 rutas de dominio viven en `app/(taller)/<dominio>/page.tsx` (salon, comandas, cocina, cocina-kds, barra, inventario, almacén, informes, pedidos, empleados, gestoría, reservas, etc.).
- Las vistas de UI están en `modules/*` (SalonView, CocinaView, BarraView, KDSView, PedidosView, InformesView, InventarioView…) y reciben estado/callbacks por contexto (`modules/core/app-contexts` → `AppProviders`) o por props (`as unknown as Props` — deuda de tipos conocida, ver abajo).
- **Routing**: `modules/core/view-routes.ts` — `routeFor(view)` mapea alias (`kds`→`cocina-kds`, `waitlist`→`lista-espera`), resto ruta directa. `viewFromPath(path)` es el inverso.
- API routes en `app/api/*/route.ts` usan Drizzle ORM (`import { getDb } from '@/lib/drizzle'`).
- **Proxy** (raíz `proxy.ts`, Next 16 sustituye `middleware.ts` por `proxy.ts`): protege `/api/*` con rate-limit por IP (120 req/min), CORS (lista `ALLOWED_ORIGINS`) y **auth no spoofeable**: token JWT (cookie HttpOnly `tpv_session` o Bearer) verificado con `jose` sobrescribe cualquier header de identidad fabricado; o API key de cliente (`lib/auth/api-keys.ts`) que solo escala rol de cliente (no empleado). Lista de rutas públicas en `PUBLIC_PATHS`.
- DB schema gestionado con Drizzle Kit: `db/schema.ts` + `db/relations.ts` (config en `drizzle.config.ts`). Usar `drizzle-kit generate` para migraciones, `drizzle-kit push` para sync de BD fresca, `drizzle-kit pull` para introspectar.
- **Sesión**: `lib/session.ts` (`sessionLogin`, `sessionLogout`, `sessionKeepalive`, `startKeepalive`) + JWT `lib/auth/jwt.ts` (TTL por defecto 12h, `JWT_TTL_MS`). `lib/rbac.ts` `requireRole()` valida sesión contra BD y devuelve el rol *desde la BD* (no se confía en headers).
- Seed data en `lib/seed.ts` (`seedCatalog`, `seedFloor`, `seedEmployees`, `getDailyMenu`) re-exportado desde `components/constants.tsx`. Se llama cuando la API devuelve vacío (`useAppInit`).
- Versión anterior: un monolito SPA `app/page.jsx` (2400+ líneas). **Ya no existe** — refactorizado en `app/(taller)/*` + `modules/*` (ver `docs/REFACTOR_PAGE_JSX.md`).

## Offline architecture

- GET cache en `localStorage` con prefijo `tpv:cache:` (read from cache on fetch failure).
- Mutations queue en `localStorage` (`tpv:mutations`) cuando offline, retried cada 10s + on reconnect. Cola v2 con Zod schema por endpoint (`MUTATION_SCHEMAS`), `generateMutationId()`, retry exponencial con jitter (`BASE_RETRY_MS=1s`, `MAX_RETRY_MS=60s`, `MAX_ATTEMPTS=10`).
- Helpers en `lib/offline.ts`: `cacheGet`, `cacheSet`, `enqueueMutation`, `onNetworkChange`, `isOnline`.
- `lib/api.ts` `apiFetch()`/`apiFetchWithCache()` envuelve el patrón: fetch → cache → fallback, y adjunta headers `x-tpv-key`, `x-tenant-id`, `x-employee-role`, `x-employee-id`, `x-device-id`, `x-idempotency-key`.
- `lib/floor-vc.ts`: Vector Clocks LWW para resolución de conflictos de mesa multi-dispositivo. `computeFloorDiff()` + `stableKeyOrder()` en `lib/api.ts` permiten PATCHes por diff en vez de PUT full.

## Commands

```bash
npm run dev          # next dev (port 3000)
npm run build        # Production build
npm run build:core   # Build workspace @tpv/core
npm run lint         # ESLint 9 flat config
npm run lint:any     # node scripts/check-any-baseline.mjs
npm run test         # Vitest (jsdom) — 490 tests, 45 files
npm run test:coverage# Vitest con coverage (umbrales 80/75)
npm run test:e2e     # Playwright (e2e/login, critical-flow, full-flow)
npm run db:push      # Sync Drizzle schema → DB (fresh DB / dev)
npm run db:generate  # Generate migration SQL after schema changes
npm run db:migrate   # Apply pending migrations
npm run db:pull      # Introspect DB → update Drizzle schema
npm run analyze:bundles # ANALYZE=true next build (bundle analyzer)
npm run type-coverage    # type-coverage --strict
npm run contract:test    # pact-test
npm run mutation:test    # stryker run
npm run bundle:check     # next build && size-limit (límite 1.5MB gzip JS)
```

## Conventions

- **No comments in code** unless necessary for clarity — let the code speak.
- **React inline styles** must use camelCase (`overflowY`, not `overflow-y`). Tailwind classes preferred for layout.
- **`<img>` instead of `<Image>`** — `@next/next/no-img-element` is explicitly disabled in the ESLint config.
- **Colors** come from a mutable `C` object (`lib/theme.ts`, re-export desde `components/constants.tsx`), swapped via `setGlobalTheme('dark'|'light')`. Siempre usa `C.cream`, `C.muted`, `C.brass`, etc. Nunca hardcodees hex.
- **`seedFloor()`** layout: 9 mesas (left, 4-column grid), 6 barras (center), 4 delivery (right). Migración auto-upgrade de floors viejos en `useAppInit` → `normalizeTableFields`/`migrateTo3ColumnLayout` (`domain/tables/floor-layout.ts`).
- **`clone()`** from `components/constants.tsx` for deep-copying state before mutation.
- **Floors** have `tables[]` con `type: 'mesa'|'barra'|'llevar'|'domicilio'`, `status`, `orderId`, `orderIds[]`, además de `orders`, `zones`, `sales`, `history`, `vectorClock`.
- **Products** have `agotado` (boolean), `show_tpv`, `show_qr`, `course`, `ubicacion`, `allergens[]`.
- **Thermal printing** via `window.print()` con `#thermal-ticket` CSS o WebUSB ESC/POS desde `lib/thermal-printer.ts` (también `openDrawer`).
- **Ticket HTML**: `lib/ticket-template.ts` `buildTicketHtml()` + `printTicketHtml()`. Escapa HTML con `esc()` — usa `esc()` siempre que interpoles input de usuario. Factura A4 compartida: `@tpv/core/src/domain/invoice/invoice-html.ts` (`buildInvoiceHtml`, también con `esc()`).
- **Verifactu** (AEAT) usa Fiskaly REST API (no SDK) — `lib/verifactu.ts` + `lib/fiskaly.ts`.
- **Stripe** payments — dos canales en `getStripe()` (devuelve `null` si falta `STRIPE_SECRET_KEY`).
- **Known type debt**: hay ~120 ocurrencias de `as unknown as` (50 archivos), sobre todo `modules/*` casteando context/props. Es aceptado como deuda; no lo añadas sin necesidad, pero tampoco bloquees cambios por ello.

## Stripe Payments

- **Two channels**: Online (card) via `modules/payment/StripeModal.tsx` + `POST /api/stripe/payment-intent` con `automatic_payment_methods` y `card.request_extended_authorization`. Terminal (NFC) via app móvil + `POST /api/stripe/terminal-payment-intent` con `payment_method_types: ['card_present']`.
- **`getStripe()`** (lazy singleton): devuelve `null` si falta `STRIPE_SECRET_KEY`. El SDK se instancia con `stripe-v17.7`.
- **Online flow**: (1) `StripeModal.tsx` carga `@stripe/stripe-js` con `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` solo si empieza por `pk_`. (2) `useEffect` → `POST /api/stripe/payment-intent` con `{amount, tableId, tableName, employeeName}`. (3) Ruta valida `amount <= 9999.99 EUR`, rate-limit 10 req/60s por IP, genera `idempotencyKey` de `tableId+amount+floor(Date.now()/5min)` (o usa uno del cliente), crea PI con `metadata: {tableId, tableName, employeeName, source: 'la-comanda-tpv', env, max_amount}`. (4) `clientSecret` → `Elements` + `StripePaymentForm` con `PaymentElement` (layout tabs, card primero). (5) `stripe.confirmPayment({elements, redirect: 'if_required'})`. Si `paymentIntent.status === 'succeeded'`, llama `onSuccess(paymentIntent)`.
- **Terminal (NFC)**: `POST /api/stripe/terminal-connection-token` genera connection token, resuelve `locationId` (caché en settings BD → `globalThis.__stripeLocationId` → lista `terminal.locations` limit 1 → crea con `STRIPE_LOCATION_*` env vars).
- **Webhook** (`/api/stripe/webhook`): verifica `stripe-signature` con `STRIPE_WEBHOOK_SECRET`, `stripe.webhooks.constructEvent(rawBody, sig, secret)`. Idempotencia vía `webhook_events(event_id PK, type, status, body, error, ...)`. `ensureEventTracked()` inserta `ON CONFLICT` que reabre si `failed`, skip si `processed/processing`. Eventos: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.dispute.*`. `handlePaymentIntentSucceeded`: si `metadata.qrOrderId` → `qr_orders.order_status='paid'`; si `metadata.tableId` → inserta venta 'stub' (`id='stub_'+pi.id`) si no existe, o marca `stripe_confirmed=true`. Disputas actualizan `sales.dispute_status` y `dispute_data` JSONB, log en `payment_logs`.
- **Reconciliation** (`/api/stripe/reconciliation?days=N`): lista PIs desde Stripe (max 5 páginas x 100), filtra por `metadata.source`. Compara con `sales` que tienen `payment_intent_id`. Devuelve: `orphans`, `mismatches` (>1 céntimo), `refundMismatches`, `disputed`, `salesNotInStripe`.
- **Logging** (`lib/payment-logger.ts`): tabla `payment_logs(...)`. Todos los endpoints Stripe logean (creación, webhook, error). Nunca rompe flujo (catch silencioso).
- **Redsys** alternativo: `lib/redsys.ts` + endpoints asociados.

## Scroll gotchas

- Main content container tiene `maxHeight: '100vh'` con `overflowY: 'auto'` — overflow fixes go here (`app/(taller)/layout.tsx:249`).
- Modals (Settings, clock-in, etc.) necesitan `max-h-[85vh] overflow-y-auto` explícito en la card interna para scrollear.
- Tab content areas en views como GestoriaView dependen del scroll del contenedor principal — no necesitan el suyo.

## Realtime (Supabase Realtime)

- `server.js` es un plain Next.js custom server (no Socket.IO), escucha en `0.0.0.0:3000`.
- `lib/realtime.ts` proporciona: `connectRealtime()`, `broadcastFloorUpdate()`, `broadcastFloorUpdateServer()`, `applyFloorDiff()`, `onFloorUpdate()`, `broadcastReadyNotification()`, `disconnectRealtime()`.
- Usa Supabase Realtime **Broadcast** — no depende de la base de datos.
- Cada `persistFloor()` llama a `broadcastFloorUpdate()`.
- KDS (`app/kds/page.tsx` o `app/(taller)/cocina-kds`) y shell POS (`app/(taller)/layout.tsx`) escuchan `floor:updated` y sincronizan el estado. Polling de respaldo cada 10s (floor) y 15s (sales) en `hooks/useRealtimeSync.ts`.
- Requiere `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en el entorno.

## Testing

- Tests con **Vitest** (`npm run test` / `npx vitest run`). Suites: **490 passed + 1 skipped en 45 archivos** (27 unit web + 10 integration + 8 mobile) + 3 e2e Playwright.
- Coverage: umbrales 80% statements/functions/lines, 75% branches (`vitest.config.ts`). Solo incluye `lib/**/*.{ts,tsx}` (excluye infra/IO: api, drizzle, env, realtime, rbac, etc.).
- **Mutation testing**: `npm run mutation:test` (stryker). **Contract testing**: `npm run contract:test` (pact-test).
- `getDailyMenu("happy_hour")` puede devolver happy hour all-day en el seed (`lib/seed.ts` — h1 con `days: [0..6]`).

### Integration tests (`__tests__/integration/`, 10 archivos)

`api-keys` (13), `catalog` (15), `clockin` (4), `employees` (8), `fichar-employees` (1), `kds` (7), `keep-alive` (2), `sales` (4), `session` (15), `settings` (3). Tests de rutas API con Drizzle mockeado — no se necesita BD real.

**Pattern:**

```typescript
import { vi, beforeEach } from 'vitest';
import { employees } from '../../db/schema'; // or any table
import { req } from '../helpers/request';

// 1. Shared mutable state via vi.hoisted
const dbData = new Map<object, any[]>();
function seed(table: object, data: any[]) { dbData.set(table, data); }

const mockRbac = vi.hoisted(() => ({ authorized: true, employee: { id: 'e1', role: 'admin', tenantId: 'default' } }));
const mockBcrypt = vi.hoisted(() => ({
  hashSync: vi.fn((s: string) => 'hashed_' + s),
  compareSync: vi.fn((s: string, hash: string) => hash === 'hashed_' + s),
}));

// 2. vi.mock a nivel top (hoisted — las factories capturan dbData/mockRbac por referencia)
vi.mock('@/lib/rbac', () => ({ requireRole: () => async () => mockRbac }));
vi.mock('bcryptjs', () => ({ default: mockBcrypt, ...mockBcrypt }));
vi.mock('@/lib/tenant', () => ({ getTenantId: () => 'default' }));

// 3. Mock drizzle — Map<object, any[]> keyed por referencias de tabla zit de drizzle
vi.mock('@/lib/drizzle', () => {
  function whereResult(data: any[]) {
    const p = Promise.resolve(data);
    (p as any).orderBy = () => p; // soporta .where().orderBy()
    return p;
  }
  function from(table: any) {
    return {
      where: () => whereResult(dbData.get(table) || []),
      leftJoin: () => ({ where: () => whereResult(dbData.get(table) || []) }),
    };
  }
  return { getDb: () => ({ select: () => ({ from }), insert: () => ... }) };
});

// 4. Reset en beforeEach
beforeEach(() => {
  dbData.clear();
  mockRbac.authorized = true;
  // ...
});

// 5. Seed con referencias a tablas de Drizzle
seed(employees, [{ id: 'e1', name: 'Alice', ... }]);
const { GET } = await import('../../app/api/employees/route');
```

**Key rules:**
- Todo estado mutable compartido (dbData, mockRbac, mockBcrypt) DEBE estar en `vi.hoisted()` — las factories de `vi.mock` son hoisted por encima del código de módulo.
- Usa `Map<object, any[]>` keyed por referencias de tabla (`employees`, `products`, ...) — son singletons exportados de `db/schema`.
- `db.select({...}).from(table).where(...).orderBy(...)` → el mock devuelve thenable con `.orderBy()`.
- Para test de auth: `mockRbac.authorized = false` + `mockRbac.error` + `mockRbac.status = 401`.
- `req()` de `__tests__/helpers/request.ts` construye NextRequest.

## Tailwind 4 notes

- Config via CSS `@import "tailwindcss"` + `@theme inline {}` block — no `tailwind.config.js`.
- Utility classes definidas como `@utility name { ... }` (glass, scrollbar-hide, price-glow).
- Key custom utilities: `scrollbar-hide`, `fade-up`, `pulse-cuenta`.

## Public pages

- `app/pedir/page.tsx` — Pedidos online (takeaway/delivery). Client-side, fetches `/api/catalog`, `/api/settings`, `/api/delivery-zones`. Dark theme from `qrThemePrimary`/`qrThemeSecondary` settings.
- `app/menu/page.tsx` — Carta pública.
- `app/reservar/page.tsx` — Reservas online públicas. 4-step flow: date + pax (calendar), slot selection, contact form, confirmation. Fetches `/api/reservations/availability?date=...&pax=...` for slots. POST to `/api/reservations` con `source: 'online'`.
- `app/waitlist/page.tsx` — Lista de espera pública.
- `app/qr/[tableId]/page.tsx` — Menú QR por mesa.
- `app/fichar/page.tsx` — Fichaje público.
- `app/kds/page.tsx` — KDS autónomo con pairing por código (almacena `kds_tenant_id` en localStorage).

## Online Reservations

- `app/api/reservations/availability/route.ts` — `GET /api/reservations/availability?date=YYYY-MM-DD&pax=N` returns `{ slots: [{time, available, paxRemaining}], isClosed, isBlocked, totalSeats, existingPax, availableSeats }`. Checks settings (schedule, closed days, blocked dates, interval, duration, max pax, online toggle), tables capacity, overlapping reservations, and past-time filtering.
- `app/api/reservations/route.ts` — Full CRUD (`GET`, `POST`, `DELETE`). Soporta reservas recurrentes via `recurring=1`. POST crea reserva con ID auto-asignado `res_`. Valid sources: `manual`, `online`, `qr`.
- `modules/customers/ReservasView.tsx` — Vista admin: calendario (mes/semana/día), availability checker, flujo de estados (pendiente→confirmada→sentada→noshow/cancelada), depósitos, recurrencia.
- `components/views/ReservaSettingsView.tsx` — Settings: tipo de horario (simple/avanzado con turnos), días cerrados, fechas bloqueadas, intervalo, duración, max pax, auto-confirm, depósitos, WhatsApp confirm/reminder, review request.

## Proxy y seguridad

- `proxy.ts` (raíz) protege `/**` API con matcher `/api/:path*`. Auth de 2 niveles: **JWT** (cookie `tpv_session` / Bearer, `jose` RS256 si `JWT_PRIVATE_KEY`) y **API key** (`x-tpv-key`, verificada en BD por tenant).
- Headers de identidad (`x-employee-id/role/device-id`) son **reeescritos por el proxy** desde claims verificados — el servidor nunca confía en headers fabricados por el cliente.
- CORS: solo origenes en `ALLOWED_ORIGINS` (+ dev fallbacks localhost:3000/3001). Rate limit global 120 req/min/IP en `lib/rate-limit.ts` (Redis Upstash con fallback a `Map` en memoria — el fallback solo es válido para dev, no es multi-proceso seguro).

## env vars

See `.env.example` / README. Key: `TPV_API_KEY` y `NEXT_PUBLIC_TPV_API_KEY` deben coincidir para auth API. `JWT_SECRET` y `JWT_PRIVATE_KEY` (opcional, RS256) para sesiones. `DATABASE_URL` y `DATABASE_URL_POOLER` (drizzle usa pooler si existe). Missing `DATABASE_URL` lanza en import time.

## Docker

- `docker compose up --build` levanta PostgreSQL 16 + app en puerto 3000.
- `DATABASE_URL` apunta a `postgres://tpv:tpv_local_dev@postgres:5432/tpv_restaurant`.
- `scripts/docker-entrypoint.sh` corre `npx drizzle-kit push --force` automáticamente al arrancar (crea tablas en BD fresca) — por eso `drizzle-kit` está en `dependencies` (necesario en la imagen de runtime para migraciones).
- Fiskaly/Stripe no están configurados en `docker-compose.yml` — añadir como `environment:` si se necesitan.
- `output: 'standalone'` en `next.config.ts` — necesario para el multi-stage build (ver `Dockerfile`). `@tpv/core` en `transpilePackages`.
- Para Realtime en Docker necesitas añadir `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` al servicio `app` en `docker-compose.yml`.