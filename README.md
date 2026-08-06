# La Comanda — TPV Restaurante

## Stack

- **Next.js 16** (App Router, Turbopak), React 19, Tailwind 4, Lucide icons
- **PostgreSQL** via `pg` + **Drizzle ORM** (Supabase, pooler session mode, eu-west-3)
- **Supabase Realtime** — sincronización en vivo POS/KDS/móvil (Broadcast)
- **Expo / React Native** — app móvil (`mobile/`)
- **@tpv/core** — paquete compartido (`packages/core/`) con tipos, utilidades, tests
- **Vitest 4** con jsdom, **382 tests, 33 archivos**
- **ESC/POS** — impresión térmica WebUSB
- **Stripe Terminal** — pago NFC Tap-to-Pay

## Arquitectura

- `app/(taller)/layout.tsx` — layout cliente, dueño del estado global; monta `AppProviders` + shell (`Sidebar`, `TopBar`, banners, modales)
- Rutas reales de App Router por dominio con code-split (36 páginas dedicadas) + catch-all `[...view]` como fallback SPA; la URL es la fuente de verdad de la vista activa (`modules/core/view-routes.ts`)
- API routes en `app/api/*/route.ts` con Drizzle ORM
- RBAC server-side: `requireRole()` protege ~40 rutas operacionales (admin/camarero/cocina)
- Migraciones con Drizzle Kit
- Seed data en `components/constants.js`
- `tenant_id` en **115/115 tablas**, 67 índices compuestos

## Frontend — Rutas reales (App Router) y code-split

La SPA monolítica (`app/page.jsx` + `ViewRouter`) se migró a rutas reales de App Router (plan en `docs/REFACTOR_PAGE_JSX.md`, fases 0–4):

- **`app/(taller)/`** agrupa el shell autenticado. `layout.tsx` posee el estado global y lo expone por contexto (`useFloor`, `useCatalog`, `useSales`, `useAuth`, `useUi`); además monta la comanda drawer, el modal de pago, banners y atajos de teclado.
- **URL = fuente de verdad**: `viewFromPath(pathname)` deriva la vista activa en el layout y `setView` se implementa como `router.push(routeFor(v))`. Alias evitan colisiones con rutas standalone (`kds → /cocina-kds`, `waitlist → /lista-espera`).
- **Code-split por dominio**: 36 páginas dedicadas (`/salon`, `/cocina`, `/barra`, `/comandas`, `/informes`, `/gestoria`, `/inventario`, `/pedidos`, `/reservas`, …) cargan solo su vista en un bundle propio.
- **Mezcla server/client**: las páginas de solo presentación son **Server Components**; `salon` y `almacen` siguen `"use client"` (gating por contexto). El catch-all `[...view]/page.tsx` es un Server Component que usa `await params` y delega en `ViewRouter`.
- **Frontera cliente explícita**: las ~30 vistas que usan hooks declaran `"use client"` (p. ej. `ViewRouter`, `AlmacenMenuView`, `PedidosView`).
- `app/(taller)/page.tsx` redirige (`redirect`) a `/salon`.

## Clean Architecture (progresiva)

- `domain/` — lógica pura, tipos centralizados en `domain/types.ts`
- `application/` — 8 directorios de use cases (auth, sales, AddItemsToOrder, etc.)
- `application/subscribers/` — 6 suscriptores de eventos (order:closed→Verifactu+cash drawer, stock:changed→toast, item:sent→toast cocina, payment:refunded/completed→API+offline+toast, order:created→placeholder)
- `lib/event-bus.ts` — TypedEventBus singleton
- Hooks cada vez más delgados, dependencias delegadas a subscribers
- `modules/` — componentes por dominio

## Sidebar — Grupos de Navegación

| Grupo | Color | Vistas |
|-------|-------|--------|
| **Sala y Cocina** | Azul | Salón, Emparejar (screen mirroring), Comandas, Cocina, Cocina KDS |
| **Operaciones** | Azul | Pedidos, Reservas, Lista Espera |
| **Canales** | Verde | Buffet Kiosk, Pedidos Online, Reparto |
| **Gestión** | Naranja | Inventario, Carta, Informes, Equipo, Ofertas, Combos, Menús, Carrusel, Precios |
| **Administración** | Rojo | Gestoría, Auditoría, Turnos, Reg. Horario, Solicitudes, Pedidos Compra, Producción |

## Multi-local (Tenants)

- Tabla `tenants` + `tenant_id` en 115/115 tablas
- 67 índices de tenant creados
- PK compuestas `(tenant_id, id)` en tablas core
- Cabecera `x-tenant-id` en todas las peticiones API
- Selector de local en sidebar (solo admin)

## @tpv/core (paquete compartido)

- `packages/core/` — tipos, utilidades y tests comunes entre web y mobile
- Compila con `tsc --outDir dist` (`lib: ["esnext"]`, sin DOM)
- Web app lo consume como `file:../packages/core` → `npm run build` ejecuta `build:core` + `copy:core` (workaround Turbopack que no sigue symlinks fuera del project root)
- `tsc --noEmit`: 0 errores tanto en web como en mobile

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

## Convenciones

- Sin comentarios en código salvo necesarios
- Inline styles en camelCase; Tailwind para layout
- `<img>` en vez de `<Image>` (regla ESLint desactivada)
- Colores desde objeto `C` mutable (`components/constants.js:40-44`)
- `clone()` para deep-copy antes de mutar estado

## Comandos

```bash
npm run dev            # Next.js dev (port 3000)
npm run build          # build:core → copy:core → next build
npm run build:core     # Compilar @tpv/core (packages/core)
npm run copy:core      # Copiar @tpv/core compilado (workaround Turbopack symlinks)
npm run lint           # ESLint 9 flat config — 0 errors, ~1371 warnings
npm run test           # Vitest (jsdom) — 382 tests, 33 archivos
npm run db:push        # Sincronizar schema Drizzle → BD
npm run db:generate    # Generar migración SQL
npm run db:migrate     # Aplicar migraciones pendientes
npm run db:pull        # Introspeccionar BD → schema Drizzle
```

## Variables de Entorno

Ver `.env.example`. Claves mínimas:

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Conexión PostgreSQL (Supabase) |
| `TPV_API_KEY` | Clave API para middleware |
| `NEXT_PUBLIC_TPV_API_KEY` | Clave API pública (debe coincidir con TPV_API_KEY) |
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
npx vitest run                    # 382 tests, 33 archivos
npx vitest run __tests__/integration/   # Tests de integración API (61 tests, 10 archivos)
npx vitest run __tests__/constants.test.ts   # Test específico
```

Los tests de integración usan Drizzle mockeado (`vi.hoisted` + `Map<object, any[]>`) — sin BD real. Patrón en `__tests__/helpers/request.ts` y `AGENTS.md`.

## Hosting

- **Render**: `https://tpv-restaurante.onrender.com`
- **Supabase**: PostgreSQL (pooler session mode, eu-west-3)
- **Mobile**: EAS (Expo Application Services) — build gratis se reinicia mensualmente

## Seguridad: RBAC server-side

Todas las rutas API operacionales están protegidas con `requireRole()` de `lib/rbac.ts`, que valida sesión activa contra la BD (tabla `sessions`, TTL 12h):

| Rol | Rutas protegidas |
|-----|-----------------|
| **admin** | access-logs, auto-order-settings, backup, closures, clockin-corrections, debug, export/sales, food-cost, invoice, stock-log, upload, verifactu, catalog/PUT+PATCH, modifiers/PUT, settings/PUT, offers/PUT, stripe/reconciliation, catalog/csv |
| **admin+camarero** | cancellations, delivery, delivery-zones/POST+PUT+DELETE, payments, qr-calls, reservations/POST+PUT+DELETE, shifts, time-off-requests, turns, waitlist, albaranes, purchase-orders, gestoria, suppliers, supplier-catalog, recipes, production, add-stock, move-stock, sales/POST+DELETE+GET |
| **admin+camarero+cocina** | clockin, kds, kds/audit, stripe/terminal-* |
| **Públicas (sin auth)** | webhooks, qr-order, qr/*, reservations/availability, delivery/tracking, employees/GET+POST(verify), catalog/GET, modifiers/GET, settings/GET, offers/GET, delivery-zones/GET, buffet/GET |

El helper inseguro original (`lib/auth-deprecated.ts`) está renombrado y lanza error si se importa.
