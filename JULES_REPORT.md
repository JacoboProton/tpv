# Jules Nightly Report — 2026-07-16

## Project Status: [Drizzle ORM Migration Complete]

## What Was Shipped

| # | Feature | Status |
|---|---------|--------|
| 1 | Convert all 76 API routes from postgres.js raw SQL to Drizzle ORM | ✅ |
| 2 | Convert lib/floor.ts, lib/payment-logger.ts, lib/fiskaly.ts to Drizzle | ✅ |
| 3 | Convert lib/run-migrations.ts to use Drizzle's official migrate() | ✅ |
| 4 | Replace `@neondatabase/serverless` (WebSocket) with `pg` (TCP) driver | ✅ |
| 5 | Extract backupAll() from lib/migrate.ts into lib/backup.ts | ✅ |
| 6 | Convert lib/rbac.ts from postgres.js to Drizzle | ✅ |
| 7 | Delete lib/migrate.ts (1672 lines of legacy DDL) | ✅ |
| 8 | Delete lib/db.ts (postgres.js client, last consumer removed) | ✅ |
| 9 | Generate initial Drizzle migration (0000_perfect_ares.sql, 115 tables) | ✅ |
| 10 | Add db:push/generate/migrate/pull npm scripts | ✅ |
| 11 | Add db/migrations to tsconfig exclude | ✅ |
| 12 | Docker: entrypoint runs drizzle-kit push --force on startup | ✅ |
| 13 | tsc --noEmit clean, 184/187 tests passing | ✅ |

## Feature Completion Breakdown

| Milestone | Status | % Complete | Notes |
|-----------|--------|------------|-------|
| Drizzle ORM integration | ✅ Complete | 100% | All 76 routes + lib files |
| Legacy migrate.ts removal | ✅ Complete | 100% | backupAll extracted, migrate.ts deleted |
| Docker startup automation | ✅ Complete | 100% | Entrypoint runs push automatically |
| Driver replacement | ✅ Complete | 100% | @neondatabase/serverless → pg |

## Test Results

- **TypeScript compilation**: ✅ Zero errors (tsc --noEmit).
- **Unit tests**: 13 test files, 187 tests (184 pass, 3 pre-existing failures needing DATABASE_URL).
- **Docker build**: ✅ Verified end-to-end (fresh DB + api responds).

## Key Wins

1. **Zero dependencies on postgres.js** — every query goes through Drizzle ORM
2. **Proper migration workflow** — `drizzle-kit generate` → `drizzle-kit migrate` / `POST /api/migrate`
3. **Docker ready** — fresh DB auto-initialized via entrypoint
4. **Drizzle Studio** — visual DB explorer at `https://local.drizzle.studio`
5. **116 tables typed** — auto-generated schema from `drizzle-kit pull`

## Next Milestone Target

- Test end-to-end on Render production environment
- Enable Drizzle Studio permanently
- Future schema changes via Drizzle Kit workflow

---

# Estado actual (2026-08-19)

> Snapshot diario de la migración Drizzle (2026-07-16). **Eventual**, no un documento
> vivo — la fuente de verdad del estado actual es `AGENTS.md` y `docs/GAP_LIST.md`.

## Qué sigue siendo válido

- Migración Drizzle: ✅ completa e intacta. `pg` (TCP) + `drizzle-orm/node-postgres`,
  libs convertidas, `lib/migrate.ts` y `lib/db.ts` eliminados, entrypoint Docker con
  `drizzle-kit push --force`.
- Cambios posteriores siguen esta base; nada se ha revertido.

## Números actualizados

| Concepto | Reporte (16-jul) | Hoy |
|---|---|---|
| Tests web | 13 archivos, 187 tests (184 pasan) | **490 passed + 1 skipped en 45 archivos** (27 unit + 10 integration + 8 mobile) + 3 e2e Playwright |
| Tests `@tpv/core` | — (no existía en el reporte) | **113 passed en 8 archivos** |
| Rutas API | 76 | **81** `route.ts` |
| Tablas | 115 (SQL) / 116 (schema pull) | 115 |

## Qué ha cambiado desde el reporte

- **P0 — XSS corregido**: helper `esc()` en `@tpv/core` (`buildInvoiceHtml`) y
  `lib/ticket-template.ts`; dead code `handlePrintInvoice` eliminado.
- **Bootstrap en terminal nuevo**: sin sesión se siembran empleados (admin PIN `1234`);
  sin doble carga en mount (`loadedRef` + guard).
- **Auth/seguridad**: `middleware.ts` → `proxy.ts` (Next 16), JWT verificada con `jose`
  reescribe headers de identidad fabricados, RBAC server-side (`lib/rbac.ts`), API key
  de cliente que solo escala rol cliente.
- **Monorepo**: workspace `@tpv/core` compartido (factura A4, XSS fix) + `dist/` built.
- **Render**: `render.yaml` verificado y alineado con el código; pooler Supabase/Render
  soportado (`DATABASE_URL_POOLER`/`DB_POOLER_PORT`) pero no requerido.
- **Nubes pendientes de escalar/re-verificar** (ver worklog): verificación HMAC en
  webhooks Glovo/UberEats, cobertura `tenant_id`, race en `ticket_number` MAX+1.

## Pendiente (no reportado aún)

- Bump de versión de `@tpv/core` + rebuild Web/Mobile al desplegar (el fix XSS vive en core).
- Validar deploy end-to-end en Render con la versión actual.
- Drizzle Studio "permanente": seguir sin habilitarse.
