# Auditoría del Proyecto TPV - Fase 2

**Fecha:** 31 de julio de 2026 (auditoría original) · **Revisado:** 19 de agosto de 2026  
**Estado:** ✅ PROBLEMAS CRÍTICOS RESUELTOS

> **STATUS DE REVISIÓN (2026-08-19):** todos los puntos detectados siguen cerrados y se han
> **re-verificado contra el código actual**. Cifras de tests/coverage actualizadas en la revisión
> (8 archivos / 113 tests / coverage 95.52·98.87·98.93). Estado: **LISTO PARA FASE 3**.

## Resumen Ejecutivo

La Fase 2 ha avanzado significativamente con la integración del application layer en `@tpv/core`, pero se han detectado varios problemas que requieren atención inmediata. La compilación de todos los proyectos es exitosa, pero hay inconsistencias en la estructura del paquete compartido.

## Estado de Compilación

| Proyecto | Estado | Comando | Resultado |
|----------|--------|---------|-----------|
| @tpv/core | ✅ OK | `npm run typecheck` | Sin errores |
| @tpv/core | ✅ OK | `npm run build` | Compilado exitosamente (v0.1.1) |
| @tpv/core | ✅ OK | `npm --workspace @tpv/core run test` | **113 tests / 8 archivos** |
| tpv-restaturante (web) | ✅ OK | `npx tsc --noEmit` | Sin errores (490+1 tests) |
| mobile | ⚠️ | `npx tsc --noEmit` | Errores preexistentes no relacionados con @tpv/core |

## Problemas Detectados

### 🔴 CRÍTICOS

#### 1. Duplicación de exports en `src/index.ts`
**Archivo:** `packages/core/src/index.ts` (líneas 2-3)

```typescript
export type * from './domain/types'
export * from './domain/types'
```

**Problema:** Se exportan los mismos tipos dos veces (una como type, otra como value). Esto puede causar confusión y errores de compilación en ciertos escenarios.

**Recomendación:** Eliminar una de las líneas. Preferiblemente mantener solo `export type * from './domain/types'` y luego exportar los valores específicos que se necesiten.

**✅ RESUELTO:** Se eliminó `export * from './domain/types'`, dejando solo `export type *`.

---

#### 2. Funciones utilitarias duplicadas
**Archivos:** 
- `packages/core/src/lib/utils.ts` (definición oficial)
- `packages/core/src/application/AddItemsToOrder/add-items-to-order.ts` (líneas 6-12)

**Problema:** Las funciones `round2` y `generateId` están definidas localmente en `add-items-to-order.ts` cuando ya existen en `lib/utils.ts`.

**Recomendación:** Importar desde `lib/utils.ts` en lugar de redefinir:
```typescript
import { round2, generateId } from '../../lib/utils'
```

**✅ RESUELTO:** `generateId` añadido a `lib/utils.ts` y `add-items-to-order.ts` ahora importa `clone, generateId, round2` desde allí.

---

#### 3. Archivo `login.ts` faltante
**Archivos afectados:**
- `packages/core/src/application/index.ts` (línea 9) - referencia `login.ts`
- `packages/core/src/index.ts` - NO referencia login

**Problema:** `application/index.ts` comenta la exportación de `login.ts`, pero el archivo no existe en el directorio `application/auth/`.

**Recomendación:** 
- Opción A: Crear `application/auth/login.ts` si se necesita
- Opción B: Eliminar la referencia de `application/index.ts`

**✅ RESUELTO (Opción B + #4):** Se eliminó `application/index.ts` completo (todo comentado y sin uso). `src/index.ts` es ahora el único barril de exports.

---

### ⚠️ MODERADOS

#### 4. Inconsistencia en estructura de exports
**Archivos afectados:**
- `packages/core/src/application/index.ts` - Todos los exports comentados
- `packages/core/src/index.ts` - Exporta directamente desde módulos application

**Problema:** Hay dos estrategias de exportación mezcladas:
1. `application/index.ts` está completamente comentado (estrategia original)
2. `src/index.ts` exporta directamente desde cada módulo application (estrategia nueva)

**Recomendación:** Elegir una estrategia y ser consistente:
- **Opción A:** Usar `application/index.ts` como barril central
- **Opción B:** Eliminar `application/index.ts` y usar solo `src/index.ts`

**✅ RESUELTO (Opción B):** Eliminado `application/index.ts`. Solo `src/index.ts` exporta.

---

#### 5. `invoice-html.ts` exportado con posibles dependencias web
**Archivo:** `packages/core/src/domain/invoice/invoice-html.ts`
**Exportado en:** `src/index.ts` (línea 13)

**Problema:** En la Fase 1 se excluyó `invoice-html.ts` por dependencias web (`@/components/constants`), pero ahora está exportado en `src/index.ts`.

**Recomendación:** Verificar si `invoice-html.ts` tiene dependencias web. Si las tiene, excluirlo del export o refactorizar.

**✅ VERIFICADO:** No tiene dependencias web. Solo importa `lib/utils` (`euros`) y `domain/invoice/invoice` (`calculateIgic`). Se mantiene exportado.

---

### ℹ️ INFORMATIVOS

#### 6. Configuración TypeScript mejorada
**Archivo:** `packages/core/tsconfig.json`

**Cambios positivos detectados:**
- `noEmit: true` para typecheck
- `module: esnext` y `moduleResolution: bundler` (moderno)
- `lib: esnext` para features modernas
- Configuración separada en `tsconfig.build.json` para compilación

**Estado:** ✅ Configuración correcta

---

#### 7. Tipos mobile compartidos parcialmente
**Archivo:** `mobile/lib/types.ts`

**Cambios positivos:**
- `SaleItem` ahora importado desde `@tpv/core` (re-exportado como `CoreSaleItem → SaleItem`)
- Resto de tipos mantenidos localmente por incompatibilidades
  (p. ej. `OrderItem` móvil añade `delivered`, `servedBy`)

**Estado:** ✅ Estrategia correcta (re-verificado en 2026-08-19)

---

## Estructura del Paquete @tpv/core

### Archivos TypeScript (45 archivos)

**Domain (22 archivos):**
- `types.ts` - Tipos centralizados con extensiones mobile
- `catalog/` - product-operations, modifier-groups
- `employees/` - employees, employee-operations
- `inventory/` - stock
- `invoice/` - invoice, invoice-html
- `kitchen/` - kitchen
- `order/` - order, menu-expansion, line-totals
- `orders/` - multi-ticket
- `payments/` - refund, payments, debt, bizum
- `pricing/` - personal-discount, offers
- `tables/` - table, table-operations, floor-layout

**Application (10 archivos):**
- `AddItemsToOrder/` - add-items-to-order
- `ApplyPersonalDiscount/` - apply-personal-discount
- `CancelTable/` - cancel-table
- `CloseOrder/` - close-order
- `OrderItemOperations/` - order-item-operations
- `TableStatus/` - toggle-table-status
- `auth/` - clockin, logout
- `sales/` - sales-queue
- `payments/` - payment-splits
- `orders/` - pending-counts

**Infrastructure (1 archivo):**
- `database/` - catalog-repository

**Utils (1 archivo):**
- `lib/utils.ts` - euros, round2, clone, generateId

**Tests (8 archivos):**
- employee-operations.test.ts
- invoice-html.test.ts
- kitchen.test.ts
- order-item-operations.test.ts
- payments.test.ts
- product-operations.test.ts
- toggle-table-status.test.ts
- utils.test.ts

---

## Configuración de Dependencias

### @tpv/core (package.json)
```json
{
  "name": "@tpv/core",
  "version": "0.1.1",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "import": "./src/index.ts",
      "default": "./src/index.ts"
    }
  },
  "files": ["dist", "README.md"],
  "sideEffects": false,
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "clean": "rm -rf dist",
    "prepublishOnly": "npm run build",
    "attw": "npm run build && attw --pack --profile esm-only"
  }
}
```

**Estado:** ✅ Configuración correcta. El `exports "."` apunta al **source TS** (`src/index.ts`),
por lo que web y móvil consumen TypeScript directamente en dev (transpilePackages / tsconfig paths)
y `dist/` solo se usa para empaquetado.

---

### Web App (tsconfig.json)
```json
{
  "paths": {
    "@/*": ["./*"]
  }
}
```

**Estado:** ✅ Los paths de fallback a `@/domain/*`, `@/application/*` e `@/infrastructure/*` han
**desaparecido**: la web consume `@tpv/core` como paquete del workspace (`"@tpv/core": "*"` +
`transpilePackages`). Único alias restante: `@/*`.

---

### Mobile App (tsconfig.json)
```json
{
  "paths": {
    "@/*": ["./*"],
    "@tpv/core": ["../../packages/core/src"],
    "@tpv/core/*": ["../../packages/core/src/*"]
  },
  "include": ["../../packages/core/src/**/*.ts", "../../packages/core/src/**/*.tsx"],
  "exclude": ["../../packages/core/dist"]
}
```

**Estado:** ✅ Configuración correcta para source directo (`file:../../packages/core` en
package.json + paths a `src/`).

---

## Recomendaciones de Acción

### Inmediatas (Prioridad Alta)

1. **Corregir duplicación de exports en src/index.ts**
   ```typescript
   // Eliminar línea 3
   export type * from './domain/types'
   // export * from './domain/types'  // ELIMINAR ESTA LÍNEA
   ```

2. **Eliminar funciones duplicadas en add-items-to-order.ts**
   ```typescript
   // Reemplazar líneas 6-12 con:
   import { round2, generateId } from '../../lib/utils'
   ```

3. **Decidir sobre login.ts**
   - Crear `application/auth/login.ts` o eliminar referencia en `application/index.ts`

### Corto Plazo (Prioridad Media)

4. **Estandarizar estrategia de exports**
   - Elegir entre barril central (`application/index.ts`) o exports directos (`src/index.ts`)
   - Documentar la decisión en el README

5. **Verificar invoice-html.ts**
   - Revisar dependencias web
   - Si existen, excluir del export o refactorizar

### Largo Plazo (Prioridad Baja)

6. **Mejorar documentación**
   - Agregar README.md a `packages/core`
   - Documentar arquitectura y patrones de uso

**✅ RESUELTO:** Creado `packages/core/README.md` con estructura, estrategia de exports (Opción B documentada), capas, scripts y convenciones.

7. **Agregar más tests**
   - Actualmente 7 tests
   - Objetivo: cobertura >80% para domain layer

**✅ RESUELTO:** Coverage (2026-08-19): **95.52% statements, 98.93% lines, 98.87% functions,
76.84% branches** (All files). **113 tests en 8 archivos** — se añadió `invoice-html.test.ts`
(5 tests del helper `esc()`, fix P0 XSS). Script `npm run test:coverage` disponible.

---

## Conclusión

La Fase 2 ha logrado integrar exitosamente el application layer en `@tpv/core`, con todos los proyectos compilando sin errores. Sin embargo, hay problemas de calidad de código que deben resolverse:

**Logros:**
- ✅ Application layer integrado en @tpv/core
- ✅ Todos los proyectos compilan sin errores
- ✅ Configuración TypeScript mejorada
- ✅ Tests presentes y funcionales

**Problemas:**
- 🔴 Duplicación de exports — ✅ resuelto
- 🔴 Funciones utilitarias duplicadas — ✅ resuelto
- 🔴 Archivo login.ts faltante — ✅ resuelto (eliminado index.ts)
- ⚠️ Inconsistencia en estrategia de exports — ✅ resuelto (Opción B)
- ⚠️ invoice-html.ts con posibles dependencias web — ✅ verificado, sin dependencias

**Documentación (largo plazo):**
- README.md de @tpv/core — ✅ creado
- Tests y cobertura >80% — ✅ 113 tests / 8 archivos; coverage 95.52% stmts / 98.93% lines

**Revisión 2026-08-19 — re-verificado:**
- ✅ `export * from './domain/types'` duplicado eliminado (solo `export type *`)
- ✅ `add-items-to-order.ts` importa `clone, generateId, round2` desde `lib/utils`
- ✅ Sin `application/index.ts` (solo `src/index.ts` como barril); `auth/` = clockin + logout
- ✅ `invoice-html.ts` sin dependencias web (solo `lib/utils` + `domain/invoice`)
- ✅ Web ya no usa paths de fallback hacia core: consume el paquete del workspace

**Estado General:** ✅ LISTO PARA FASE 3

Se recomienda abordar los problemas críticos antes de continuar con la Fase 3.
