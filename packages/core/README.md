# @tpv/core

Paquete compartido de dominio y aplicación para el proyecto TPV La Comanda. Contiene la lógica de negocio reutilizable entre la web (`tpv-restaturante`), la app móvil y el módulo KDS.

## Estructura

```
src/
├── index.ts              # Único barril de exports público del paquete
├── domain/               # Capa de dominio: tipos y lógica de negocio pura
│   ├── types.ts          # Tipos centrales (Floor, Table, Order, Product, Sale…)
│   ├── catalog/          # product-operations, modifier-groups
│   ├── employees/        # employees, employee-operations
│   ├── inventory/        # stock
│   ├── invoice/          # invoice, invoice-html
│   ├── kitchen/          # kitchen
│   ├── order/            # order, menu-expansion, line-totals
│   ├── orders/           # multi-ticket
│   ├── payments/         # refund, payments, debt, bizum
│   ├── pricing/          # personal-discount, offers
│   └── tables/           # table, table-operations, floor-layout
├── application/          # Casos de uso (capa de aplicación)
│   ├── AddItemsToOrder/  # add-normal-item, menús y combos, editar modificadores
│   ├── ApplyPersonalDiscount/
│   ├── CancelTable/
│   ├── CloseOrder/
│   ├── OrderItemOperations/
│   ├── TableStatus/
│   ├── auth/             # clockin, logout
│   └── sales/            # sales-queue
├── infrastructure/       # Adaptadores de infraestructura
│   └── database/         # catalog-repository
└── lib/
    └── utils.ts          # euros, round2, generateId, clone
```

## Estrategia de exports

`src/index.ts` es el **único barril** de exports. Cada submódulo se exporta directamente desde `src/index.ts` (no hay barriles intermedios como `domain/index.ts` o `application/index.ts` en la API pública).

- Los **tipos** se exportan con `export type *`.
- Los **valores** (funciones, clases) se exportan con `export *` o exports nombrados.
- Los consumidores importan solo desde `@tpv/core`, nunca desde rutas internas.

```typescript
import { addNormalItem, round2 } from '@tpv/core'
import type { Floor, OrderItem } from '@tpv/core'
```

> **Nota:** `domain/invoice/invoice-html.ts` se mantiene fuera del barril intermedio `domain/index.ts` por dependencias web, pero sí está exportado en `src/index.ts` (solo depende de `lib/utils` e `invoice`).

## Capas

### Domain

Tipos y funciones puras sin efectos secundarios. No dependen de la web, del móvil ni de la base de datos.

```typescript
import { orderTotals } from '@tpv/core'
```

### Application

Casos de uso que orquestan operaciones de dominio. Toman el estado (ej. `Floor`) como entrada y devuelven un nuevo estado inmutable (uso de `clone`):

```typescript
import { addNormalItem } from '@tpv/core'

const result = addNormalItem(floor, tableId, catalog, {
  product,
  modifiers: [],
  employeeName: 'Ana',
})
// result.floor  → nuevo estado con el ítem añadido
// result.orderId, result.isNewOrder, result.itemId
```

### Infrastructure

Adaptadores concretos (base de datos, APIs externas). Actualmente solo `catalog-repository`.

### Utils (`lib/utils.ts`)

- `euros(n)` — formatea como moneda ES (`1.234,56 €`)
- `round2(n)` — redondea a 2 decimales
- `generateId(prefix)` — genera `prefix_<timestamp><random>`
- `clone<T>(obj)` — copia profunda vía JSON

## Scripts

```bash
npm run build       # Compila a dist/ (tsconfig.build.json)
npm run typecheck   # tsc --noEmit
npm run test        # Vitest (105 tests, 7 archivos)
npm run test:watch  # Vitest watch
npm run clean       # Elimina dist/
```

## Consumo desde otros proyectos

- **Web (`tpv-restaturante`)**: la tarea `build` corre `build:core` + `copy:core` (`scripts/copy-core.js`), que copia el `dist` compilado a `node_modules/@tpv/core`.
- **Móvil**: el `tsconfig.json` apunta a `../../packages/core/src` para consumir el source directamente (`@tpv/core` → `packages/core/src`).

## Convenciones

- Funciones de dominio y aplicación son **puras**: no mutan la entrada, devuelven un clon.
- Un solo barril público (`src/index.ts`).
- Tests con Vitest junto a su módulo en `src/__tests__/`.
