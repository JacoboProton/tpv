# La Comanda — TPV Restaurante

Sistema de TPV profesional para restaurantes con POS web, app móvil para camareros, pedidos online, reservas, KDS en tiempo real y pago NFC (Stripe Terminal).

> El archivo refleja el estado actual del código. Verifica con el código antes de asumir cifras concretas (tests, tablas, comandos han evolucionado).

## Stack

- **Next.js 16** (App Router, Turbopak, `proxy.ts` para middleware)
- **React 19**, Tailwind 4 (`@import "tailwindcss"`, sin `tailwind.config`), Lucide icons
- **PostgreSQL** via `pg` + **Drizzle ORM** (`drizzle-orm/node-postgres`)
- **Supabase Realtime** (Broadcast) — sincronización en vivo POS/KDS/móvil
- **Expo SDK 56 / React Native** — app móvil para camareros (`mobile/`)
- **@tpv/core** — paquete compartido (tipos/dominio de facturación, etc.), dependencia npm
- **Vitest 4** con jsdom — **529 passed + 1 skipped, 52 archivos**
- **ESC/POS** — impresión térmica con WebUSB
- **Stripe Terminal** — pago NFC Tap-to-Pay en móvil

## Arquitectura

### Frontend (App Router — rutas reales y code-split)

- `app/(taller)/layout.tsx` — shell SPA cliente que posee el estado global (floor, catálogo, ventas, empleados, ofertas, combos, settings de ticket, toast) y orquesta los hooks (`useAppInit`, `useOfflineSync`, `useRealtimeSync`, `useQrPolling`, `useKeyboardShortcuts`, `useLoginRouting`, …). Expone el estado por contexto (`AppProviders` en `modules/core/`).
- **URL = fuente de verdad** de la vista activa: `viewFromPath(pathname)` en `modules/core/view-routes.ts`; `setView` es `router.push(routeFor(v))`, con alias para rutas standalone (`kds → /cocina-kds`, `waitlist → /lista-espera`).
- **36 páginas dedicadas por dominio** con code-split real (`/salon`, `/cocina`, `/barra`, `/comandas`, `/informes`, `/gestoria`, `/inventario`, `/pedidos`, …).
- Las vistas de UI viven en `modules/*` (SalonView, CocinaView, KDSView, PedidosView, InformesView, …) y reciben estado/callbacks por contexto o por props.
- `app/(taller)/page.tsx` solo hace `redirect(routeFor('salon'))`.
- Vistas agrupadas en sidebar por bloques con códigos de color (`modules/core/nav-config.ts`).
- Historial del refactor: `docs/REFACTOR_PAGE_JSX.md`.

### API

- API routes en `app/api/*/route.ts` con Drizzle ORM (`lib/drizzle.ts`).
- **Proxy** (`proxy.ts`, Next 16 sustituye `middleware.ts`): rate-limit por IP (120 req/min), CORS (origenes en `ALLOWED_ORIGINS`) y **auth no spoofeable** — token JWT (`jose`) o API key verificados **sobrescriben** los headers de identidad fabricados; un anónimo no puede elegir su tenant.
  - **Rutas públicas** (`PUBLIC_PATHS`): el proxy las deja pasar sin identidad; los endpoints públicos de lectura/escritura validan el tenant con `getPublicTenantId()` contra `ALLOWED_PUBLIC_TENANTS` (nunca `getTenantId()` a ciegas).
- Migraciones con Drizzle Kit (`db/schema.ts` + `db/relations.ts`).
- Seed data en `lib/seed.ts` (re-exportado desde `components/constants.tsx`).
- **Bootstrap**: sin sesión activa, `useAppInit` siembra empleados seed y dispara la carga completa al primer login.

### Clean Architecture (progresiva)

```
domain/           Lógica de negocio pura (sin efectos secundarios)
├── types.ts      Tipos centralizados (Product, Order, Sale, Employee, …)
├── order/        Órdenes, líneas, totales, expansión de menús
├── payments/     Pagos, splits, refunds, bizum
├── kitchen/      Estados de cocina (pending→sent→ready→served→voided)
├── catalog/      Productos, categorías, stock
├── inventory/    Stock entries, deducciones
├── invoice/      IGIC, facturación (compartido con @tpv/core)
├── employees/    Empleados, roles, PIN
├── pricing/      Reglas de precio, descuentos
├── tables/       Estado de mesas
└── common/       Validación compartida

application/      Orquestación (use cases)
├── auth/         Login, logout, clock-in, restore session
├── sales/        Cola de ventas offline
├── AddItemsToOrder/ ApplyPersonalDiscount/ CancelTable/
├── CloseOrder/   OrderItemOperations/ TableStatus/
└── ...

application/subscribers/   Efectos secundarios vía eventos (order:closed → Verifactu + cajón, stock, item:sent, payments, …)

lib/              Utilidades compartidas (event-bus, api, offline, ticket-template, verifactu, thermal-printer, realtime, payment-logger, drizzle, …)

modules/          Componentes agrupados por dominio
├── core/         AppProviders + context hooks, Sidebar, TopBar, nav-config, view-routes
└── salon/        Drawers, paneles de sala
```

### Sistema de Eventos

Los hooks emiten eventos → `application/subscribers/` manejan efectos secundarios. Elimina dependencias directas de hooks a librerías de integración (Verifactu, impresora térmica, fetch, toast).

```typescript
eventBus.emit('order:closed', { sale, employeeName })
eventBus.on('order:closed', async ({ sale }) => {
  await registerVerifactu(sale)  // API call
  await openCashDrawer()         // efecto físico
})
```

### Multi-local (Tenants)

- Columna `tenant_id` en **todas** las tablas operacionales (82 tablas en `db/schema.ts`) con índices de tenant.
- PK compuestas `(tenant_id, id)` en tablas core (products, tables, …).
- Cabecera `x-tenant-id` en todas las peticiones API; el proxy la reescribe desde claims verificados para sesiones JWT.
- Selector de local en sidebar (solo admin).
- **Pago QR / rutas públicas**: el tenant se valida con `getPublicTenantId()` (whitelist `ALLOWED_PUBLIC_TENANTS`, por defecto solo `default`); un anónimo no puede apuntar a un tenant arbitrario.

## Sidebar — Grupos de Navegación

| Grupo | Color | Vistas |
|-------|-------|--------|
| **Sala y Cocina** | Azul | Salón, Emparejar, Comandas, Cocina, Cocina KDS |
| **Operaciones** | Azul | Pedidos, Reservas, Lista Espera |
| **Canales** | Verde | Buffet Kiosk, Pedidos Online, Reparto |
| **Gestión** | Naranja | Inventario, Carta, Informes, Equipo, Ofertas, Combos, Menús, Carrusel, Precios |
| **Administración** | Rojo | Gestoría, Auditoría, Turnos, Reg. Horario, Solicitudes, Pedidos Compra, Producción |

## App Móvil (Expo)

- `mobile/` — Proyecto Expo con expo-router (SDK 56).
- `mobile/lib/api.ts` — Conexión al backend con `x-tpv-key` y `x-tenant-id`.
- `mobile/lib/realtime.ts` — Escucha broadcasts de Supabase para actualizar en vivo.
- Login con PIN → selección de perfiles → salón → comandas → cocina.
- **Pago NFC** — `@stripe/stripe-terminal-react-native`, Tap-to-Pay en Android:
  - Simulado (`STRIPE_SIMULATED=true`) para desarrollo, real en producción.
  - Crea PaymentIntent desde el servidor y **persiste la venta** en caja al completar el cobro (`mobile/app/mesa/[id].tsx` pasa `paymentIntentId` a `closeOrderOnTable`, de modo que el webhook converge en la misma venta y no duplica).

Para build:
```bash
cd mobile
npx eas build -p android --profile preview    # APK test
npx eas build -p android --profile production # Play Store
npx eas update --branch production --message "cambios"  # solo JS (OTA)
```

## Sincronización en Tiempo Real

- `lib/realtime.ts` — Cliente Supabase Realtime (broadcast, no DB replication).
- `connectRealtime()` — canal `floor-sync`.
- `broadcastFloorUpdate()` / `broadcastFloorUpdateServer()` — evento `floor:updated`.
- `app/api/floor/route.ts` — al persistir la sala, el servidor también emite broadcast.
- KDS (`app/(taller)/cocina-kds` o `app/kds/page.tsx`) y POS escuchan el mismo evento.
- Polling de respaldo (`AbortController`): 10s floor, 15s sales en `hooks/useRealtimeSync.ts`.
- Requiere `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Offline

- GET cache en localStorage (`tpv:cache:`) — read from cache on fetch failure.
- Cola de mutaciones (`tpv:mutations`, cola v2 con Zod) reintentada cada 10s + on reconnect, con retry exponencial (1s→60s, máx 10 intentos) e idempotencia.
- Helpers en `lib/offline.ts` (`cacheGet`, `cacheSet`, `enqueueMutation`, `onNetworkChange`, `isOnline`).
- `lib/api.ts` `apiFetch()`/`apiFetchWithCache()` envuelve: fetch → cache → fallback; adjunta `x-*-id`/`x-idempotency-key`.
- `lib/floor-vc.ts` — Vector Clocks LWW para resolución de conflictos de mesa multi-dispositivo.

## Páginas Públicas

- `/pedir` — Pedidos online (takeaway/delivery), tema oscuro desde settings.
- `/reservar` — Reservas online (4 pasos: fecha, hora, datos, confirmación). Soporta recurrentes.
- `/waitlist` — Lista de espera pública.
- `/qr/[tableId]` — Menú QR por mesa.
- `/fichar` — Kiosco de fichaje público.
- `/kds` — KDS autónomo con pairing por código.
- `/menu` — Carta pública.

## Stripe Payments

- **Dos canales**:
  - **Online** (card): `modules/payment/StripeModal.tsx` + `POST /api/stripe/payment-intent` con `automatic_payment_methods` y `card.request_extended_authorization`.
  - **Terminal** (NFC): app móvil + `POST /api/stripe/terminal-payment-intent` con `payment_method_types: ['card_present']`.
- **`getStripe()`**: lazy singleton, devuelve `null` si falta `STRIPE_SECRET_KEY`. SDK `stripe-v17.7`.
- **Online flow**: `StripeModal.tsx` carga `@stripe/stripe-js` (solo si `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` empieza por `pk_`) → crea PaymentIntent (valida `amount <= 9999.99 EUR`, rate-limit, idempotency por `tableId+amount+floor(now/5min)`, metadata con `tableId/tableName/employeeName/source`) → `Elements` + `PaymentElement` → `stripe.confirmPayment({redirect:'if_required'})`.
- **Terminal**: `POST /api/stripe/terminal-connection-token`, resolución de `locationId` (cache en settings BD + env `STRIPE_LOCATION_*`).
- **Webhook** (`/api/stripe/webhook`): verifica `stripe-signature` con `STRIPE_WEBHOOK_SECRET`, idempotencia vía `webhook_events(event_id PK)`. Eventos: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.dispute.*`.
  - Si `metadata.qrOrderId` → `qr_orders.order_status='paid'` (única vía legítima a `paid`).
  - Si `metadata.tableId` → inserta venta *stub* (`stub_<pi>`) o marca `stripe_confirmed=true`.
- **Reconciliation** (`/api/stripe/reconciliation?days=N`): compara PIs Stripe vs ventas BD; devuelve `orphans`, `mismatches`, `refundMismatches`, `disputed`, `salesNotInStripe`.
- **Logging** (`lib/payment-logger.ts`): tabla `payment_logs`, todos los endpoints Stripe logean; nunca rompe el flujo.
- **Redsys** alternativo: `lib/redsys.ts` + endpoints asociados.

## Reservas Online

- `GET /api/reservations/availability?date=...&pax=N` — slots (horario, días cerrados, fecha bloqueada, capacidad, solape). Público, tenant validado con `getPublicTenantId`.
- `POST /api/reservations` — crea reserva (`res_`), soporta `recurring=1`.
- Admin: `modules/customers/ReservasView.tsx` (calendario mes/semana/día, availability, flujo pendiente→confirmada→sentada→noshow/cancelada, depósitos, recurrencia).
- Settings: `components/views/ReservaSettingsView.tsx`.

## Pedidos QR y Pago

- `app/pedir/page.tsx` + `app/api/qr-order/route.ts` (público, tenant validado con `getPublicTenantId`).
- **Un pedido se crea siempre `pending`**; los precios se **recalculan contra el catálogo del servidor** (nunca se confía en el precio enviado por el cliente) y el importe se recomputa.
- Un cliente solo puede cancelar su propio pedido (`action:'status'` → `cancelled`). Cualquier otra transición de estado (`paid`, `confirmed`, `preparing`, …) exige sesión de staff (`requireRole`), y `paid` se alcanza de forma legítima vía webhook de Stripe.

## Convenciones

- Sin comentarios en código salvo necesarios.
- Inline styles en camelCase (`overflowY`); Tailwind para layout.
- `<img>` en vez de `<Image>` (ESLint `@next/next/no-img-element` desactivado).
- Colores desde objeto `C` mutable (`lib/theme.ts` → `components/constants.tsx`).
- `clone()` para deep-copy antes de mutar estado.
- `tenant_id` en todas las queries de bases de datos.
- **HTML en tickets/facturas**: toda interpolación de input de usuario pasa por `esc()` (`lib/ticket-template.ts` y factura A4 en `@tpv/core`).
- Deuda de tipos conocida: ~120 ocurrencias de `as unknown as` (aceptada; no añadir más sin necesidad).

## Comandos

```bash
npm run dev            # Next.js dev (port 3000, NODE_OPTIONS=--max-old-space-size=2048)
npm run build          # next build
npm run build:core     # Compilar @tpv/core (npm --workspace @tpv/core build)
npm run start          # next start
npm run lint           # ESLint 9 flat config (0 errors, warnings heredadas)
npm run lint:any       # node scripts/check-any-baseline.mjs
npm run test           # Vitest (jsdom) — 529 passed + 1 skipped, 52 archivos
npm run test:coverage  # Vitest con cobertura (80/75)
npm run test:e2e       # Playwright (e2e/login, critical-flow, full-flow)
npm run type-coverage  # type-coverage --strict (>=99)
npm run contract:test  # pact-test
npm run mutation:test  # stryker run
npm run bundle:check   # next build && size-limit (1.5MB gzip JS)
npm run db:push        # Sincronizar schema Drizzle → BD (fresh DB / dev)
npm run db:generate    # Generar migración SQL tras cambios en schema
npm run db:migrate     # Aplicar migraciones pendientes (drizzle-kit migrate)
npm run db:pull        # Introspeccionar BD → actualizar schema Drizzle
```

## Migraciones (Drizzle Kit)

- Schema: `db/schema.ts` + `db/relations.ts`; output en `db/migrations/`.
- Pipelines:
  - **`drizzle-kit push`** — sincroniza el schema a una BD nueva/dev (no versiona).
  - **`drizzle-kit migrate`** — aplica las migraciones del journal (CLI).
  - **Runtime**: `lib/run-migrations.ts` usa `drizzle-orm/node-postgres/migrator` (lee `_journal.json` + `.sql`) y se expone en `app/api/migrate`.
- El journal (`db/migrations/meta/_journal.json`) registra las migraciones `0000` → `0008`. Si añades una tabla nueva al schema, genera una migración (`npm run db:generate`) y asegúrate de que quede registrada en el journal — de lo contrario `migrate`/el migrator runtime no la aplicarán.

## Variables de Entorno

Ver `.env.example`. Claves mínimas:

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Conexión PostgreSQL (par/prod; `DATABASE_URL_POOLER` si existe) |
| `TPV_API_KEY` | Clave API del proxy |
| `NEXT_PUBLIC_TPV_API_KEY` | Clave API pública (debe coincidir con `TPV_API_KEY`) |
| `JWT_SECRET` / `JWT_PRIVATE_KEY` | Sesiones (`jose`; RS256 si hay clave privada) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave anónima Supabase |
| `ALLOWED_ORIGINS` | Origenes CORS permitidos |
| `ALLOWED_PUBLIC_TENANTS` | Tenants alcanzables por rutas públicas (por defecto `default`) |
| `CRON_SECRET` | Autentica cron/demo-seed internos |
| `STRIPE_SECRET_KEY` | (opcional) Stripe Terminal + online |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | (opcional) Stripe publishable |
| `STRIPE_WEBHOOK_SECRET` | (opcional) Webhook Stripe |
| `STRIPE_LOCATION_*` | (opcional) Dirección local Stripe Terminal |
| `FISKALY_API_KEY` | (opcional) Verifactu |
| `GLOVO_WEBHOOK_SECRET` / `UBER_WEBHOOK_SECRET` | (opcional) Verificación de webhooks de delivery |

## Docker

```bash
docker compose up --build
```

PostgreSQL 16 + app en puerto 3000.
- `output: 'standalone'` en `next.config.ts` — necesario para el multi-stage build (`@tpv/core` en `transpilePackages`).
- El entrypoint (`scripts/docker-entrypoint.sh`) ejecuta **`npx drizzle-kit migrate`** y, una vez el servidor responde, siembra datos de ejemplo si la BD está vacía (POST `/api/demo-seed` con `CRON_SECRET`).
- `server.js` escucha en `0.0.0.0:3000`.
- Realtime requiere variables Supabase en `docker-compose.yml`.
- Fiskaly/Stripe no están configurados por defecto — añadir como `environment:`.

## Despliegue demo (Render)

El repositorio es un monorepo npm; `render.yaml` (raíz) define el servicio web con `runtime: docker` (imagen de `docker compose up --build`); el Dockerfile usa un único `scripts/docker-entrypoint.sh`.

Pasos:

1. Conecta el repo a Render y crea el Blueprint (`render.yaml`).
2. Fija estas variables en el panel antes de abrir al cliente:

| Variable | Recomendado | Notas |
|----------|-------------|-------|
| `JWT_SECRET` | cadena aleatoria larga | Sin ella el entrypoint genera una por arranque (las sesiones no sobreviven a redespliegues) |
| `CRON_SECRET` | cadena aleatoria larga | Autentica el POST interno `/api/demo-seed` |
| `TPV_API_KEY` | cadena aleatoria larga | Crea la API key `pos` (cliente web) si está definida |
| `NEXT_PUBLIC_TPV_API_KEY` | igual que `TPV_API_KEY` | Debe coincidir |
| `ALLOWED_ORIGINS` | `https://tu-dominio.onrender.com` | CORS; sin ella otros orígenes no reciben headers CORS |
| `ALLOWED_PUBLIC_TENANTS` | `default` (o los que quieras públicos) | Tenants alcanzables por rutas públicas |

> **Sobre `NEXT_PUBLIC_TPV_API_KEY` (clave pública).** Es un tradeoff del modelo
> offline-first: el cliente (POS web, KDS, app móvil) necesita autenticar sus
> requests cuando no hay sesión JWT, y por ser `NEXT_PUBLIC_` queda incrustada en
> el bundle del navegador. **No escala privilegios**: el proxy solo la acepta con
> rol de cliente (`x-client-type`, nunca empleado/admin). Mitigaciones requeridas
> en despliegue:
> - Genera una clave **aleatoria larga** (no la compartas entre entornos).
> - Trátala como pública y **rota** si se filtra o revoca con `POST /api/api-keys`
>   (rotación por tenant/cliente + `activate=false` para desactivar).
> - No reutilices la clave de cliente para nada que requiera rol empleado/admin.

3. Opcionales: Stripe, Fiskaly, Supabase Realtime, `GLOVO_WEBHOOK_SECRET`, `UBER_WEBHOOK_SECRET`.
4. Comprueba en logs `[demo] seed -> 200 {"ok":true,...}`.
5. Login demo: **Administrador 1234** (Ana `1111`, Luis `2222`).

Ver `docs/GUIA_DEMO_HOSTELERO.md`.

## Testing

```bash
npx vitest run                          # 529 passed + 1 skipped, 52 archivos
npx vitest run __tests__/integration/   # Tests de integración API (11 archivos, 79 tests)
npx vitest run __tests__/constants.test.ts   # Test específico
npx tsc --noEmit                        # Typecheck completo (0 errores)
```

### Tests de integración

Mock-based (sin BD real). Usan `vi.hoisted()` para estado mutable compartido + `Map<object, any[]>` keyed por referencias Drizzle.

```typescript
const dbData = new Map<object, any[]>();
const mockRbac = vi.hoisted(() => ({ authorized: true, employee: {...} }));
vi.mock('@/lib/drizzle', () => ({
  getDb: () => ({ select: () => ({ from: (t) => ({ where: () => dbData.get(t)||[] }) }) })
}));
beforeEach(() => { dbData.clear(); mockRbac.authorized = true; });
```

Rutas cubiertas: `api-keys`, `catalog`, `clockin`, `employees`, `fichar`, `kds`, `keep-alive`, `sales`, `session`, `settings`.

## Scroll Gotchas

- Main content container: `maxHeight: '100vh'` + `overflowY: 'auto'` (`app/(taller)/layout.tsx`).
- Modals: `max-h-[85vh] overflow-y-auto` explícito en la card interna.
- Tab content areas: heredan scroll del contenedor principal.

## Seguridad: RBAC server-side

Todas las rutas API operacionales están protegidas con `requireRole()` de `lib/rbac.ts`, que valida sesión activa contra la BD (tabla `sessions`, TTL por defecto 12h, editable por `JWT_TTL_MS`):

| Rol | Rutas protegidas |
|-----|-----------------|
| **admin** | access-logs, auto-order-settings, backup, closures, clockin-corrections, export/sales, food-cost, invoice, verifactu, stock-log, catalog/PUT+PATCH, modifiers/PUT, settings/PUT, offers/PUT, stripe/reconciliation, catalog/csv, … |
| **admin+camarero** | cancellations, delivery, delivery-zones, payments, qr-calls, reservations, shifts, time-off-requests, turns, waitlist, albaranes, purchase-orders, gestoria, suppliers, recipes, production, add-stock, move-stock, sales/POST+DELETE+GET, **sales/refund (tenant-scoped)**, … |
| **admin+camarero+cocina** | clockin, kds, kds/audit, stripe/terminal-* |
| **Públicas (sin auth)** | webhooks, qr-order, qr/*, reservations/availability, delivery/tracking, employees/GET+POST(verify), catalog/GET, modifiers/GET, settings/GET, offers/GET, delivery-zones/GET, buffet/GET |

Puntos clave:

- Las rutas públicas **nunca usan `getTenantId()`** a ciegas: usan `getPublicTenantId()` (whitelist `ALLOWED_PUBLIC_TENANTS`) y rechazan con 401 si el tenant no está autorizado. Esto evita la exfiltración/inyección cross-tenant anónima (tracking delivery, disponibilidad de reservas, webhooks de delivery, pedidos QR, **qr-calls, kds/audit, token de realtime**).
- El token de Realtime (`/api/realtime/token`) solo se emite para tenants en `ALLOWED_PUBLIC_TENANTS`, y el cliente de Realtime se autentica con ese JWT (<code>c.setAuth</code>) antes de suscribirse a `floor-sync:<tenant>`.
- `requireRole()` devuelve el rol leído **desde la BD** (no confía en `x-employee-role`).
- Operaciones sobre recursos multi-tenant (p. ej. refunds sobre ventas) filtran por `tenantId` del caller, no solo por el `id` del recurso (evita IDOR cross-tenant).
- El helper inseguro original (`lib/auth-deprecated.ts`) está renombrado y lanza error si se importa.
