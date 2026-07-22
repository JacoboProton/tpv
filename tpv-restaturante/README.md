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

### Frontend (SPA)

- `app/page.jsx` — SPA central (~2500 líneas), orquesta todas las vistas vía estado `view`
- Vistas agrupadas en sidebar por bloques con códigos de color
- `"use client"` solo en `page.jsx`; server components para páginas públicas

### API

- API routes en `app/api/*/route.ts` con Drizzle ORM (`lib/drizzle.ts`)
- Middleware (`app/middleware.js`) protege `/api/*` con `x-tpv-key`
- Migraciones con Drizzle Kit
- Seed data en `components/constants.js` (catálogo, sala, empleados)

### Clean Architecture (progresiva)

```
domain/           Lógica de negocio pura (sin efectos secundarios)
├── types.ts      Tipos centralizados (Product, Order, Sale, Employee, etc.)
├── order/        Órdenes, líneas, totales, expansión de menús
├── payments/     Pagos, splits, refunds, bizum
├── kitchen/      Estados de cocina (pending→sent→ready→served→voided)
├── catalog/      Productos, categorías, stock
├── inventory/    Stock entries, deducciones
├── invoice/      IGIC, facturación
├── employees/    Empleados, roles, PIN
├── pricing/      Reglas de precio, descuentos
├── tables/       Estado de mesas
└── common/       Validación compartida

application/      Orquestación (use cases)
├── auth/         Login, logout, clock-in, restore session
├── sales/        Cola de ventas offline
├── AddItemsToOrder/
├── ApplyPersonalDiscount/
├── CancelTable/
├── CloseOrder/
├── OrderItemOperations/
└── TableStatus/

application/subscribers/   Efectos secundarios vía eventos
├── order-subscriber.ts     order:closed → Verifactu + cash drawer
├── stock-subscriber.ts     stock:changed → toast al agotarse
├── item-subscriber.ts      item:sent → toast cocina
├── payment-subscriber.ts   payment:refunded + payment:completed → API + offline + toast
└── order-created-subscriber.ts  order:created → placeholder

lib/              Utilidades compartidas
├── event-bus.ts  TypedEventBus singleton (6 eventos tipados)
├── api.js        Fetch con cache y fallback offline
├── offline.js    Cache GET + cola de mutaciones
├── verifactu.js  Integración Fiskaly (AEAT)
├── thermal-printer.js  ESC/POS WebUSB
├── realtime.js   Cliente Supabase Realtime
├── payment-logger.js   Logging de pagos
└── drizzle.ts    Conexión Drizzle ORM

hooks/            React hooks (cada vez más delgados)
├── useEmployees.ts      227→175 líneas (auth delegado a application/auth)
├── useOrderPayments.ts  Sin dependencias Verifactu/thermal printer
└── useSalesActions.ts   64→36 líneas (sin dependencias API/offline/toast)

modules/          Componentes agrupados por dominio
└── salon/        Drawers, paneles de sala
```

### Sistema de Eventos

Los hooks emiten eventos → `application/subscribers/` manejan efectos secundarios.
Esto elimina dependencias directas de hooks a librerías de integración (Verifactu, impresora térmica, fetch, toast).

```typescript
// Ejemplo: hook emite evento
eventBus.emit('order:closed', { sale, employeeName })

// Subscriber maneja el efecto
eventBus.on('order:closed', async ({ sale }) => {
  await registerVerifactu(sale)  // API call
  await openCashDrawer()         // efecto físico
})
```

### Multi-local (Tenants)

- `tenant_id` en **115/115 tablas** con 67 índices de tenant
- PK compuestas `(tenant_id, id)` en tablas core
- Cabecera `x-tenant-id` en todas las peticiones API
- Selector de local en sidebar (solo admin)
- Endpoints API: reset-orders, kds, audit, payment-logger todos tenant-scoped

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
  - Crea PaymentIntent desde servidor
  - Persiste venta en caja al completar cobro
  - Maneja timeout de lector en pagos lentos

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
- Cada `persistFloor()` llama a `broadcastFloorUpdate()`
- Requiere `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Offline

- GET cache en localStorage (`tpv:cache:`) — read from cache on fetch failure
- Cola de mutaciones (`tpv:mutations`) reintentada cada 10s + on reconnect
- Helpers en `lib/offline.js` (`cacheGet`, `cacheSet`, `enqueueMutation`, `onNetworkChange`)
- `lib/api.js` `apiFetchWithCache()` wraps el patrón: fetch → cache → fallback

## Páginas Públicas

- `/pedir` — Pedidos online (takeaway/delivery). Tema oscuro desde settings.
- `/reservar` — Reservas online (4 pasos: fecha, hora, datos, confirmación). Soporta reservas recurrentes.
- `/waitlist` — Lista de espera pública
- `/qr/[tableId]` — Menú QR por mesa
- `/descargar` — Descarga APK móvil (con QR)

## Stripe Payments

- **Dos canales**: Online (card) vía `StripeModal.jsx` + `POST /api/stripe/payment-intent`, Terminal (NFC) vía app móvil + `POST /api/stripe/terminal-payment-intent`
- **`getStripe()`**: lazy singleton, devuelve `null` si falta `STRIPE_SECRET_KEY`
- **Online**: `@stripe/stripe-js` + `@stripe/react-stripe-js`, PaymentElement con layout tabs
- **Terminal**: `@stripe/stripe-terminal-react-native` con simulated reader para desarrollo
- **Webhook** (`/api/stripe/webhook`): verifica firma, idempotencia vía `webhook_events(event_id PK)`, maneja `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.dispute.*`
- **Reconciliation** (`/api/stripe/reconciliation?days=N`): compara PIs Stripe vs ventas BD, detecta huérfanos, descuadres, disputas
- **Logging** (`lib/payment-logger.js`): tabla `payment_logs` con todas las operaciones, nunca rompe flujo

## Reservas Online

- `GET /api/reservations/availability?date=...&pax=N` devuelve slots disponibles
- `POST /api/reservations` crea reserva con ID `res_`, soporta `recurring=1`
- Admin: `components/ReservasView.jsx` con calendario mes/semana/día, flujo pendiente→confirmada→sentada→noshow/cancelada, depósitos
- Settings: `components/ReservaSettingsView.jsx` con horarios simple/avanzado, días cerrados, bloques, intervalo, duración, auto-confirm, depósitos

## Convenciones

- Sin comentarios en código salvo necesarios
- Inline styles en camelCase (`overflowY`, no `overflow-y`); Tailwind para layout
- `<img>` en vez de `<Image>` (regla ESLint `@next/next/no-img-element` desactivada)
- Colores desde objeto `C` mutable (`components/constants.js:40-44`), nunca hex hardcodeado
- `clone()` para deep-copy antes de mutar estado
- `tenant_id` en todas las queries de bases de datos
- Tests: `npx vitest run` antes de commits, `npx tsc --noEmit` para typecheck

## Comandos

```bash
npm run dev          # Next.js dev (port 3000)
npm run build        # Production build
npm run lint         # ESLint 9 flat config
npm run test         # Vitest (jsdom) — 301 tests, 21 archivos
npm run db:push      # Sincronizar schema Drizzle → BD (fresh DB)
npm run db:generate  # Generar migración SQL tras cambios en schema
npm run db:migrate   # Aplicar migraciones pendientes
npm run db:pull      # Introspeccionar BD → actualizar schema Drizzle
```

## Variables de Entorno

Ver `.env.example`. Claves mínimas:

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Conexión PostgreSQL (Supabase pooler session mode) |
| `TPV_API_KEY` | Clave API para middleware |
| `NEXT_PUBLIC_TPV_API_KEY` | Clave API pública (debe coincidir) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave anónima Supabase |
| `STRIPE_SECRET_KEY` | (opcional) Stripe Terminal + online |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | (opcional) Stripe publishable |
| `STRIPE_WEBHOOK_SECRET` | (opcional) Webhook Stripe |
| `FISKALY_API_KEY` | (opcional) Verifactu |
| `STRIPE_LOCATION_LINE1` | (opcional) Dirección local Stripe Terminal |
| `STRIPE_LOCATION_CITY` | (opcional) Ciudad local Stripe Terminal |

## Docker

```bash
docker compose up --build
```

PostgreSQL 16 + app en puerto 3000.
- `output: 'standalone'` en `next.config.ts` — necesario para multi-stage build
- Las tablas se crean automáticamente via `drizzle-kit push --force` en el entrypoint
- `server.js` escucha en `0.0.0.0:3000`
- Realtime requiere configurar variables Supabase en `docker-compose.yml`
- Fiskaly/Stripe no están configurados por defecto — añadir como `environment:`

## Testing

```bash
npx vitest run                    # Todos los tests (301 tests, 21 archivos)
npx vitest run __tests__/constants.test.ts   # Tests específicos
npx tsc --noEmit                  # Typecheck completo
```

## Scroll Gotchas

- Main content container: `maxHeight: '100vh'` + `overflowY: 'auto'`
- Modals: `max-h-[85vh] overflow-y-auto` explícito en la card interna
- Tab content areas: heredan scroll del contenedor principal
