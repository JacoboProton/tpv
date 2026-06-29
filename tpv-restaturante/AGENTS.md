<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# La Comanda — TPV Restaurante

## Stack

- **Next.js 16** (App Router, Turbopak, `"use client"` only on `app/page.jsx`)
- **React 19**, Tailwind 4 (`@import "tailwindcss"`, no `tailwind.config`), Lucide icons
- **PostgreSQL** via `@neondatabase/serverless` (raw SQL template strings, no ORM)
- **Vitest 4** with jsdom, path alias `@/`
- **ESC/POS** thermal printing with WebUSB

## Key architecture

- `app/page.jsx` is the **SPA entrypoint** — a single 2400+ line `"use client"` component orchestrating all views via `view` state. All state (floor, catalog, sales, employees) lives here.
- Views are mounted conditionally: `{view === 'salon' && <SalonView .../>}`
- API routes in `app/api/*/route.js` use `import { sql } from '@/lib/db'` directly. No ORM. Middleware (`app/middleware.js`) protects `/api/*` with `x-tpv-key` header.
- DB migrations auto-run on first load via `lib/migrate.js` (idempotent `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ADD COLUMN IF NOT EXISTS`).
- Seed data functions in `components/constants.js` (`seedCatalog`, `seedFloor`, `seedEmployees`). Called when DB returns empty.

## Offline architecture

- GET cache in `localStorage` with prefix `tpv:cache:` (read from cache on fetch failure)
- Mutations queue in `localStorage` (`tpv:mutations`) when offline, retried every 10s + on reconnect
- Use `lib/offline.js` helpers (`cacheGet`, `cacheSet`, `enqueueMutation`, `onNetworkChange`)
- `lib/api.js` `apiFetchWithCache()` wraps the pattern: fetch → cache → fallback

## Commands

```bash
npm run dev          # Custom server with Socket.IO (port 3000)
npm run build        # Production build
npm run lint         # ESLint 9 flat config
npm run test         # Vitest (jsdom)
```

Test: `npx vitest run __tests__/constants.test.js`

## Conventions

- **No comments in code** unless necessary for clarity — let the code speak.
- **React inline styles** must use camelCase (`overflowY`, not `overflow-y`). Tailwind classes preferred for layout.
- **`<img>` instead of `<Image>`** — `@next/next/no-img-element` is explicitly disabled in the ESLint config.
- **Colors** come from a mutable `C` object (`components/constants.js:40-44`), swapped via `setTheme('dark'|'light')`. Always use `C.cream`, `C.muted`, `C.brass` etc. Never hardcode hex.
- **`seedFloor()`** layout: 9 mesas (left, 4-column grid), 6 barras (center), 4 delivery (right). Migration in `page.jsx` auto-upgrades old floors.
- **`clone()`** from `constants.js` for deep-copying state before mutation.
- **Floors** have `tables[]` with `type: 'mesa'|'barra'|'llevar'|'domicilio'`, `status`, `orderId`, `orderIds[]`.
- **Products** have `agotado` (boolean), `show_tpv`, `show_qr`, `course`, `ubicacion`, `allergens[]`.
- **Thermal printing** via `window.print()` with `#thermal-ticket` CSS or WebUSB ESC/POS from `lib/thermal-printer.js`.
- **Verifactu** (AEAT) uses Fiskaly REST API (no SDK) — `lib/verifactu.js` + `lib/fiskaly.js`.
- **Stripe** payments implemented (optional) via `lib/api.js` `createPaymentIntent`.

## Scroll gotchas

- Main content container has `maxHeight: '100vh'` with `overflowY: 'auto'` — overflow fixes go here (`page.jsx:1774`).
- Modals (Settings, clock-in, etc.) need explicit `max-h-[85vh] overflow-y-auto` on the inner card to scroll.
- Tab content areas in views like `GestoriaView` rely on the main container scroll — don't need their own.

## WebSocket (Socket.IO)

- `server.js` wraps Next.js with Socket.IO. Run via `npm run dev` / `npm run start`.
- `lib/socket.js` provides: `connectSocket()`, `getSocket()`, `emitFloorUpdate(floor)`.
- Every `persistFloor()` call emits `floor:updated` via socket.
- KDS (`app/kds/page.jsx`) and POS (`app/page.jsx`) both listen for `floor:updated` to sync state in real time across tabs/devices.
- KDS also emits `emitFloorUpdate()` on persist so changes flow back to POS.

## Testing quirks

- Tests use **Vitest** (not Jest), run via `npm run test` or `npx vitest run`.
- 4 test files: `constants.test.js`, `offline.test.js`, `thermal-printer.test.js`, `verifactu.test.js` (86 tests total).
- `getDailyMenu("happy_hour")` test may return happy hour instead of undefined — happy hour is all-day in test seed.

## Tailwind 4 notes

- Config via CSS `@import "tailwindcss"` + `@theme inline {}` block — no `tailwind.config.js`.
- Utility classes defined as `@utility name { ... }` (glass, scrollbar-hide, price-glow).
- Key custom utilities: `scrollbar-hide` (for hiding scrollbars), `fade-up` (entry animation), `pulse-cuenta` (payment alert ring).

## env vars

See `.env.example` / README. Key: `TPV_API_KEY` and `NEXT_PUBLIC_TPV_API_KEY` must match for API auth. Missing `DATABASE_URL` throws at import time.

## Docker (punto débil #2 resuelto)

- `docker-compose up --build` levanta PostgreSQL 16 + app en puerto 3000.
- `DATABASE_URL` apunta a `postgres://tpv:tpv_local_dev@postgres:5432/tpv_restaurant`.
- Las migraciones se ejecutan automáticamente al arrancar.
- Fiskaly/Stripe no están configurados en `docker-compose.yml` — añadir como `environment:` si se necesitan.
- `output: 'standalone'` en `next.config.ts` — necesario para el multi-stage build.
- `server.js` escucha en `0.0.0.0:3000` (variable `HOST`).
