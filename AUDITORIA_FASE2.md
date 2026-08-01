# Auditoría del Proyecto TPV - Fase 2

**Fecha:** 31 de julio de 2026  
**Estado:** ⚠️ PROBLEMAS DETECTADOS

## Resumen Ejecutivo

La Fase 2 ha avanzado significativamente con la integración del application layer en `@tpv/core`, pero se han detectado varios problemas que requieren atención inmediata. La compilación de todos los proyectos es exitosa, pero hay inconsistencias en la estructura del paquete compartido.

## Estado de Compilación

| Proyecto | Estado | Comando | Resultado |
|----------|--------|---------|-----------|
| @tpv/core | ✅ OK | `npm run typecheck` | Sin errores |
| @tpv/core | ✅ OK | `npm run build` | Compilado exitosamente |
| tpv-restaturante (web) | ✅ OK | `npx tsc --noEmit` | Sin errores |
| mobile | ✅ OK | `npx tsc --noEmit` | Sin errores |

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

---

#### 3. Archivo `login.ts` faltante
**Archivos afectados:**
- `packages/core/src/application/index.ts` (línea 9) - referencia `login.ts`
- `packages/core/src/index.ts` - NO referencia login

**Problema:** `application/index.ts` comenta la exportación de `login.ts`, pero el archivo no existe en el directorio `application/auth/`.

**Recomendación:** 
- Opción A: Crear `application/auth/login.ts` si se necesita
- Opción B: Eliminar la referencia de `application/index.ts`

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

---

#### 5. `invoice-html.ts` exportado con posibles dependencias web
**Archivo:** `packages/core/src/domain/invoice/invoice-html.ts`
**Exportado en:** `src/index.ts` (línea 13)

**Problema:** En la Fase 1 se excluyó `invoice-html.ts` por dependencias web (`@/components/constants`), pero ahora está exportado en `src/index.ts`.

**Recomendación:** Verificar si `invoice-html.ts` tiene dependencias web. Si las tiene, excluirlo del export o refactorizar.

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
- `SaleItem` ahora importado desde `@tpv/core`
- Resto de tipos mantenidos localmente por incompatibilidades

**Estado:** ✅ Estrategia correcta

---

## Estructura del Paquete @tpv/core

### Archivos TypeScript (43 archivos)

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

**Application (8 archivos):**
- `AddItemsToOrder/` - add-items-to-order
- `ApplyPersonalDiscount/` - apply-personal-discount
- `CancelTable/` - cancel-table
- `CloseOrder/` - close-order
- `OrderItemOperations/` - order-item-operations
- `TableStatus/` - toggle-table-status
- `auth/` - clockin, logout (login.ts faltante)
- `sales/` - sales-queue

**Infrastructure (1 archivo):**
- `database/` - catalog-repository

**Utils (1 archivo):**
- `lib/utils.ts` - euros, round2, clone

**Tests (7 archivos):**
- employee-operations.test.ts
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
  "version": "0.1.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "clean": "rm -rf dist",
    "prepublishOnly": "npm run build"
  }
}
```

**Estado:** ✅ Configuración correcta

---

### Web App (tsconfig.json)
```json
{
  "paths": {
    "@/*": ["./*"],
    "@/domain/*": ["../packages/core/src/domain/*", "./domain/*"],
    "@/application/*": ["../packages/core/src/application/*", "./application/*"],
    "@/infrastructure/database/catalog-repository": ["../packages/core/src/infrastructure/database/catalog-repository.ts", "./infrastructure/database/catalog-repository.ts"]
  }
}
```

**Estado:** ✅ Paths configurados para fallback a local

---

### Mobile App (tsconfig.json)
```json
{
  "paths": {
    "@/*": ["./*"],
    "@tpv/core": ["../../packages/core/src"],
    "@tpv/core/*": ["../../packages/core/src/*"]
  },
  "include": ["../../packages/core/src/**/*.ts", "../../packages/core/src/**/*.tsx"]
}
```

**Estado:** ✅ Configuración correcta para source directo

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

7. **Agregar más tests**
   - Actualmente 7 tests
   - Objetivo: cobertura >80% para domain layer

---

## Conclusión

La Fase 2 ha logrado integrar exitosamente el application layer en `@tpv/core`, con todos los proyectos compilando sin errores. Sin embargo, hay problemas de calidad de código que deben resolverse:

**Logros:**
- ✅ Application layer integrado en @tpv/core
- ✅ Todos los proyectos compilan sin errores
- ✅ Configuración TypeScript mejorada
- ✅ Tests presentes y funcionales

**Problemas:**
- 🔴 Duplicación de exports
- 🔴 Funciones utilitarias duplicadas
- 🔴 Archivo login.ts faltante
- ⚠️ Inconsistencia en estrategia de exports
- ⚠️ invoice-html.ts potencialmente con dependencias web

**Estado General:** ⚠️ FUNCIONAL PERO REQUIERE LIMPIEZA

Se recomienda abordar los problemas críticos antes de continuar con la Fase 3.
