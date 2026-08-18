# Fase 1 - Shared Package @tpv/core - Estado de Implementación

**Fecha:** 22 de julio de 2026 (creación) · **Revisado:** 19 de agosto de 2026  
**Estado:** ✅ COMPLETADO

## Resumen

Se ha creado el paquete compartido `@tpv/core` con la lógica de dominio pura y los use cases de
aplicación agnósticos a la plataforma. La web app y la mobile app consumen el paquete correctamente.
Incluye además el helper `esc()` de escape HTML (fix P0 de XSS aplicable tanto a la web como al móvil)
y `euros()`/`round2()`/`clone()` extraídos de la web.

## Estructura Actual

```
tpv/
├── packages/
│   └── core/                    # Paquete compartido (v0.1.1)
│       ├── package.json         # exports "." → src/index.ts (TypeScript source)
│       ├── tsconfig.json / tsconfig.build.json
│       ├── src/
│       │   ├── domain/          # Lógica de negocio pura (sin infra web)
│       │   │   ├── types.ts     # Tipos centralizados
│       │   │   ├── catalog/     # product-operations, modifier-groups
│       │   │   ├── employees/   # employees, employee-operations
│       │   │   ├── inventory/   # stock
│       │   │   ├── invoice/     # invoice + invoice-html (buildInvoiceHtml con esc())
│       │   │   ├── kitchen/     # Estados de cocina
│       │   │   ├── order/       # order, menu-expansion, line-totals
│       │   │   ├── orders/      # multi-ticket
│       │   │   ├── payments/    # payments, refund, bizum, debt
│       │   │   ├── pricing/     # offers, personal-discount
│       │   │   └── tables/      # table, table-operations, floor-layout
│       │   ├── application/     # Use cases (activados, agnósticos a plataforma)
│       │   │   ├── AddItemsToOrder/        # addNormalItem, addMenuItems, addComboItems, editItemModifiers
│       │   │   ├── ApplyPersonalDiscount/  # applyPersonalDiscount, removePersonalDiscount
│       │   │   ├── CancelTable/            # cancelTable, voidTable
│       │   │   ├── CloseOrder/             # executeCloseOrder
│       │   │   ├── OrderItemOperations/    # changeItemQuantity, updateItemNotes, removeItemFromOrder, sendToKitchenCourse, markItemsReady, voidOrderItem, discounts, override price…
│       │   │   ├── TableStatus/            # toggleCuentaStatus
│       │   │   ├── auth/                   # login? logout, clockin
│       │   │   ├── sales/                  # sales-queue (SalesQueueDeps)
│       │   │   ├── payments/               # payment-splits
│       │   │   ├── orders/                 # pending-counts
│       │   │   └── deps.ts                 # interfaces de efectos secundarios (Deps)
│       │   ├── infrastructure/  # catalog-repository (CatalogProduct, findProduct)
│       │   ├── lib/utils.ts     # euros(), round2(), clone()
│       │   ├── __tests__/       # 8 archivos, 113 tests
│       │   └── index.ts         # Export principal (domain + application + utils + infra types)
│       └── dist/               # TypeScript compilado (build:core)
├── tpv-restaturante/            # Web app
│   ├── package.json             # ✅ "@tpv/core": "*" (workspace)
│   └── tsconfig.json            # ✅ transpilePackages para source TS
└── tpv-restaturante/mobile/     # Mobile app
    ├── package.json             # ✅ "@tpv/core": "file:../../packages/core"
    └── tsconfig.json            # ✅ Configurado para ignorar dist/ (uses src/ vía exports)
```

## Lo que se ha logrado

### ✅ Completado

1. **Paquete @tpv/core creado (v0.1.1)**
   - package.json con `exports "."` apuntando al source TS (`src/index.ts`) — no requiere build para consumir en dev.
   - `npm run build:core` produce `dist/` para empaquetado; `tsc --noEmit` sin errores.
   - Scripts: `build`, `typecheck`, `test`, `test:watch`, `test:coverage`, `clean`, `prepublishOnly`, `attw`.

2. **Domain compartido**
   - `types.ts` con los tipos de dominio.
   - Lógica de catálogo, empleados, inventario, cocina, órdenes, pagos, pricing, tablas e factura.
   - 22+ archivos de lógica de negocio pura migrados (sin dependencias web).
   - **`invoice-html.ts` incluido**: `buildInvoiceHtml()` con `esc()` (escape de `& < > " '`) — corregido el XSS P0; 5 tests dedicados.

3. **Application layer activado**
   - Use cases ya NO están comentados ni excluidos: CloseOrder, AddItemsToOrder, CancelTable, OrderItemOperations, TableStatus, auth (logout, clockin), sales-queue, payment-splits, pending-counts, applyPersonalDiscount.
   - Dependencias de plataforma (event-bus, fetch, thermal-printer, constants) extraídas a interfaces `*Deps` (`ClockinDeps`, `SalesQueueDeps`, `ApplyPersonalDiscountDeps`) — los use cases son agnósticos.

4. **Shared utilities extraídas**
   - `euros()`, `round2()`, `clone()` movidos a `src/lib/utils.ts` y exportados desde el índice.

5. **Web app configurada**
   - Dependencia `@tpv/core` en el workspace; `transpilePackages` para consumir el source TS.
   - `tsc --noEmit` clean ✅; la factura A4 y el ticket usan `esc()` de core o local.

6. **Mobile app configurada**
   - Dependencia `@tpv/core` (`file:../../packages/core`); tsconfig ignora `dist/` (consume source).
   - Mantiene `lib/types.ts` separados para extensiones mobile-specific.

7. **Testing en el paquete**
   - 8 archivos de test en `src/__tests__/`: payments, product-operations, toggle-table-status, order-item-operations, employee-operations, kitchen, invoice-html (esc), utils.
   - **113 tests passed** (`npm --workspace @tpv/core run test`).

### ⚠️ Limitaciones

1. **Tipos mobile separados**
   - Mobile tiene extensiones/varianzas no alineadas con el dominio compartido
     (p. ej. campos mobile-specific en `Table`/`OrderItem`/`Employee`).
   - Decisión vigente: mantener tipos mobile separados «por ahora»; usar funciones puras de
     `@tpv/core` donde sean compatibles.
   - Camino: `Omit`/`extends` sobre los tipos compartidos en lugar de duplicar.

2. **Empaquetado/publicación pendiente**
   - `publishConfig` apunta a registry GitHub Packages y `prepublishOnly` corre el build — nunca se ha
     publicado; el consumo es local (file:/workspace). No publicar hasta decidir flujo (npm o fuente).

## Estado de Compilación

| Proyecto | Estado | Errores |
|----------|--------|---------|
| @tpv/core (build:core) | ✅ Clean | 0 |
| @tpv/core (typecheck) | ✅ Clean | 0 |
| @tpv/core (vitest) | ✅ 8 archivos | 113 passed |
| tpv-restaturante (web) | ✅ Clean | 0 (490+1 tests) |
| mobile | ⚠️ Preexistente | errores previos no relacionados con @tpv/core |

## Próximos Pasos

1. **Unificar tipos mobile** con `domain/`
   - Alinear extensiones mobile-specific (`Omit`/`extends` sobre tipos compartidos).
2. **Bump de versión de @tpv/core** y rebuild de Web/Mobile en despliegue
   - El fix XSS (`esc()` en `invoice-html`) vive en este paquete; hay que propagarlo con un rebuild.
3. **Ampliar cobertura** de tests de use cases de application layer.
4. *(Opcional)* Decidir publicación del paquete (GitHub Packages vs consumo por fuente).

## Beneficios Inmediatos

1. **Lógica de dominio centralizada**: cambios en reglas de negocio afectan a ambas plataformas.
2. **Fix XSS compartido**: `esc()` cubre factura A4 tanto en web como en móvil.
3. **TypeScript tipado**: dominio y use cases completamente tipados y compilados.
4. **Base para extensión**: estructura lista para añadir más código compartido.
5. **Separación de concerns**: dominio y aplicación puros sin dependencias de infraestructura web.

## Conclusión

La Fase 1 está completa: el dominio, los use cases (con interfaces de dependencias), las utilidades
compartidas y los tests viven en `@tpv/core`, consumido por web y móvil. La única deuda conocida es la
no-unificación de los tipos mobile, documentada como siguiente paso, y la publicación del paquete, que
sigue siendo local por decisión.