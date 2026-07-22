# La Comanda — TPV Restaurante

## Stack

- **Next.js 16** (App Router, Turbopak)
- **React 19**, Tailwind 4 (`@import "tailwindcss"`, no `tailwind.config`), Lucide icons
- **PostgreSQL** via `pg` + **Drizzle ORM** (Supabase PostgreSQL, pooler session mode, eu-west-3)
- **Supabase Realtime** — sincronización en vivo POS/KDS/móvil (Broadcast, no DB replication)
- **Expo / React Native** — app móvil para camareros (`mobile/`)
- **Vitest 4** con jsdom
- **ESC/POS** — impresión térmica con WebUSB
- **Stripe Terminal** — pago NFC Tap-to-Pay en móvil

## Arquitectura

- `app/page.jsx` — SPA central (~2500 líneas), orquesta todas las vistas vía estado `view`
- Vistas agrupadas en sidebar por bloques con códigos de color
- API routes en `app/api/*/route.ts` con Drizzle ORM
- Migraciones con Drizzle Kit (`drizzle-kit generate` / `push` / `migrate`)
- Seed data en `components/constants.js` (catálogo, sala, empleados)
- `tenant_id` en **115/115 tablas** para multi-local, con índices compuestos

## Clean Architecture (progresiva)

- `domain/` — lógica pura (orden, pagos, cocina, catálogo, inventario, empleados), tipos centralizados en `domain/types.ts` con entidades `Product`, `Order`, `Table`, `Floor`, `Sale`, `Employee`, `Payment`, `Catalog`, etc.
- `application/` — orquestación: 8 directorios de use cases (auth, sales, AddItemsToOrder, ApplyPersonalDiscount, CancelTable, CloseOrder, OrderItemOperations, TableStatus)
- `application/subscribers/` — 6 suscriptores de eventos de dominio (order:closed → Verifactu + cash drawer, stock:changed → toast, item:sent → toast cocina, payment:refunded → API + offline + toast, payment:completed → API + offline + toast, order:created → placeholder)
- `lib/event-bus.ts` — TypedEventBus singleton con 6 eventos tipados
- Hooks React reducidos: `useEmployees.ts` 227→175 líneas (auth delegado a `application/auth/`), `useSalesActions.ts` 64→36 líneas (sin dependencias API/offline/toast), `useOrderPayments.ts` ya no importa Verifactu ni thermal printer
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
npx vitest run                    # Todos los tests (301 tests, 21 archivos)
npx vitest run __tests__/constants.test.ts   # Tests específicos
```

## Hosting

- **Render**: `https://tpv-restaurante.onrender.com`
- **Supabase**: PostgreSQL (pooler session mode, eu-west-3)
- **Mobile**: EAS (Expo Application Services) — build gratis se reinicia mensualmente
