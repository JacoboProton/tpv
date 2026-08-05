# Plan de refactor: de SPA (`app/page.tsx` + `ViewRouter`) a rutas reales de Next.js 16

> **Nota**: el informe 4.5/5 referencia un monolito `app/page.jsx` de 2400+ líneas.
> Ese monolito **ya no existe**: el arranque es `app/page.tsx` (324 líneas) y las
> vistas viven separadas en `modules/*` y `components/*`, montadas por
> `modules/core/ViewRouter.tsx` (157 líneas, switch de ~30 vistas).
> Este plan cubre el siguiente paso: pasar del patrón SPA a App Router real.

## Estado actual (verificado)

- `app/page.tsx` → shell `"use client"` que:
  - es el **dueño del estado global** (floor, catalog, sales, settings, empleados, stock, turnos, etc),
  - inyecta estado y handlers a `ViewRouter` por props (`prop-drilling`).
- `modules/core/ViewRouter.tsx` → `{view === 'x' && <XView ... />}` para ~30 vistas
  (salon, cocina, barra, kds, inventario, almacén, informes, pedidos, empleados,
  gestoría, reservas, waitlist, tickets, pagos, etc.).
- Hub non-nos datos globales ya existe (`modules/core/app-contexts` → `AppProviders`),
  pero muchas vistas siguen recibiendo estado/callbacks por props.

## 2. Objetivo

Reducir el ratio **estado compartido / acoplamiento** y activar **code-splitting
real** por ruta, de forma incremental y sin regresión funcional. No se busca
"rutas server-side puras" de golpe: la comanda es inherentemente interactiva
(Salon/kitch/realtime), así que se mantienen componentes cliente donde hace falta.

## 3. Decisiones previas

- **Mantener el estado compartido fuera del componente de página**, en teams
  `AppProviders` + hooks específicos (`useFloor`, `useCatalog`, `useSales`…),
  para eliminar el prop-drilling del router.
- **Rutas reales de App Router** por dominio (no una sola `page.tsx + view`),
  con el `LoginGuard`/`Sidebar`/`TopBar` como layout compartido.
- **Split progresivo**: no mover las 30 vistas de golpe; migrar por grupos
  con riesgo bajo y env-far cada vez.

## 4. Fases

### Fase 0 — Consolidar estado (prerrequisito) ✅
- Trasladar el estado de `page.tsx` a `AppProviders`/contextos (highest)
- Exponer hooks tipados (useFloor, useCatalog, useTurnos, useCierre…).
- **Aceptación**: `ViewRouter` deja la mayoría de `as unknown as ...Props`
  y las vistas leen contexto en vez de props.

### Fase 1 — Layout compartido de autenticación/UI
- Crear `app/(taller)/layout.tsx` (server) que monta `LoginGuard` + `AppProviders`
  + `Sidebar` + `TopBar`.
- `app/(taller)/page.tsx` conserva el SPA actual como **migración por defensa**
  (fallback) mientras se mueven las rutas.

### Fase 2 — Migración por dominio (incremental)
Para cada dominio se abre una ruta real; primero a nivel "cliente" (componente
`"use client"` reutilizado, sin cambiar lógica):

| Ruta | Vistas | Prioridad landing |
|--------|--------|-------------------|
| `/admin/salon` | SalonView | P1 (productiva) |
| `/admin/cocina` | CocinaView, BarraView, KDSView | P1 |
| `/admin/informes` … | InformesView, VentasDashboardView, Cierre | P2 |
| `/admin/gestoria` | GestoriaView + tabs (Documents/Payrolls/…) | P2 |
| `/admin/almacen` | Almacen*, InventarioView, Albaranes, News | P2 |
| `/admin/empleados` | EmpleadosView, Turnos, Registro, Solicitudes | P3 |
| `/admin/clients` … | Reservas, Waitlist, Pedidos, Fiados, Tickets | P3 |

Cada ruta:
- lee el estado que necesita del **contexto** (no de props)
- carga sólo su módulo → sub-bundle propio.

### Fase 3 — Code-splitting y mejora de perf
- `next/dynamic` para vistas pesadas (sólo donde no retrase la interacción).
- Sacar de `page.tsx` lo que no requiera shell: `buffet/tv`, `kds`, `pedir`,
  `qr/[tableId]`, `fichar` ya son rutas independientes — consolidar/reforzar ese patrón.

### Fase 4 — (Opcional) mix server/client
- Convertir secciones de solo presentación a Server Components.
- Mantener `"use client"` en salon/coci/informes (estado, realtime, formularios).

## 5. Riesgos y mitigación

- **Regresión de estado compartido** → Fase 0 como prerrequisito + test de
  humo por ruta (Playwright) en cada migración.
- **Cambios de bundle** → medir con `@next/bundle-analyzer` (script
  `analyze:bundles`) antes/después de cada fase.
- **Autenticación** → `requireRole` ya protege `/api`; el `LoginGuard` en layout
  cubre las páginas. Verificar estado de sesión en cada ruta nueva.

## 6. Aceptación final
- `app/page.tsx` deja de montar las 30 vistas (solo ruta por defecto `/app`).
- Ninguna vista depende de prop-drilling cruzado (todo vía contexto).
- Cada ruta emite su propio JS (code-split) y el analyzer muestra reducción en
  el bundle inicial.
- `tsc` 0 errores, `eslint` 0 errores, suite de tests verde (381+).