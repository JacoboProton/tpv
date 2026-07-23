# Fase 1 - Shared Package @tpv/core - Estado de Implementación

**Fecha:** 22 de julio de 2026  
**Estado:** ✅ COMPLETADO (parcialmente)

## Resumen

Se ha creado el paquete compartido `@tpv/core` con la lógica de dominio pura. La web app consume el paquete correctamente y compila sin errores. La mobile app está configurada pero mantiene sus tipos separados debido a incompatibilidades.

## Estructura Creada

```
tpv/
├── packages/
│   └── core/                    # Nuevo paquete compartido
│       ├── package.json         # Configuración del paquete
│       ├── tsconfig.json        # TypeScript config (domain puro)
│       ├── src/
│       │   ├── domain/          # Lógica de negocio pura
│       │   │   ├── types.ts     # Tipos centralizados
│       │   │   ├── catalog/     # Operaciones de catálogo
│       │   │   ├── employees/   # Operaciones de empleados
│       │   │   ├── inventory/   # Gestión de stock
│       │   │   ├── invoice/     # Facturación (sin invoice-html)
│       │   │   ├── kitchen/     # Estados de cocina
│       │   │   ├── order/       # Lógica de órdenes
│       │   │   ├── orders/      # Multi-ticket
│       │   │   ├── payments/    # Pagos, refunds, bizum
│       │   │   ├── pricing/     # Ofertas, descuentos
│       │   │   └── tables/      # Operaciones de mesas
│       │   ├── application/     # Use cases (comentados temporalmente)
│       │   │   ├── AddItemsToOrder/
│       │   │   ├── ApplyPersonalDiscount/
│       │   │   ├── CancelTable/
│       │   │   ├── CloseOrder/
│       │   │   ├── OrderItemOperations/
│       │   │   ├── TableStatus/
│       │   │   ├── auth/
│       │   │   ├── sales/
│       │   │   └── subscribers/
│       │   └── index.ts         # Export principal
│       └── dist/               # TypeScript compilado
│           ├── domain/
│           ├── application/
│           ├── index.js
│           └── index.d.ts
├── tpv-restaturante/            # Web app
│   ├── package.json             # ✅ "@tpv/core": "file:../packages/core"
│   └── tsconfig.json            # ✅ Configurado para ignorar dist/
└── mobile/                     # Mobile app
    ├── package.json             # ✅ "@tpv/core": "file:../../packages/core"
    ├── tsconfig.json            # ✅ Configurado para ignorar dist/
    └── lib/types.ts             # ✅ Tipos separados (incompatibilidad)
```

## Lo que se ha logrado

### ✅ Completado

1. **Paquete @tpv/core creado**
   - package.json con exports configurados
   - tsconfig.json compilando solo domain/ (sin dependencias web)
   - Estructura de directorios domain/ completa
   - Archivos index.ts para exports organizados

2. **Domain compartido**
   - `types.ts` con todos los tipos de dominio
   - Lógica de catálogo, empleados, inventario, cocina, órdenes, pagos, pricing, tablas
   - 22 archivos de lógica de negocio pura migrados
   - Compilación exitosa (tsc sin errores)

3. **Web app configurada**
   - Dependencia `@tpv/core` añadida
   - TypeScript configurado para ignorar dist/
   - `tsc --noEmit` clean ✅

4. **Mobile app configurada**
   - Dependencia `@tpv/core` añadida
   - TypeScript configurado para ignorar dist/
   - Tipos mobile mantenidos separados (por incompatibilidades)

### ⚠️ Limitaciones

1. **Application layer excluido temporalmente**
   - Los archivos en `application/` tienen dependencias web específicas:
     - `@/lib/event-bus` (sistema de eventos web)
     - `@/lib/api` (fetch API)
     - `@/lib/thermal-printer` (WebUSB)
     - `@/components/constants` (euros, clone)
   - Subscribers excluidos (efectos secundarios web)
   - Necesita refactorización para ser agnóstico a la plataforma

2. **Tipos mobile separados**
   - Mobile tiene tipos incompatibles con el dominio compartido:
     - `Table.reserved`: boolean vs objeto complejo
     - `OrderItem.delivered`, `servedBy`, `servedAt` (mobile-specific)
     - `Employee.personalDiscountEnabled`, `monthlyLimit` (mobile-specific)
   - Decisión: mantener tipos mobile separados por ahora
   - Se puede usar `@tpv/core` para funciones puras donde sea compatible

3. **invoice-html excluido**
   - Depende de `@/components/constants` (euros)
   - Necesita refactorización para ser agnóstico

## Estado de Compilación

| Proyecto | Estado | Errores |
|----------|--------|---------|
| @tpv/core | ✅ Clean | 0 |
| tpv-restaturante (web) | ✅ Clean | 0 |
| mobile | ⚠️ Preexistente | 19 (no relacionados con @tpv/core) |

## Próximos Pasos (Fase 2)

Para completar la compartición del núcleo de negocio:

1. **Refactorizar application layer**
   - Extraer dependencias web (event-bus, api, constants)
   - Crear interfaces para efectos secundarios
   - Hacer use cases agnósticos a la plataforma

2. **Unificar tipos**
   - Alinear tipos mobile con domain compartido
   - Usar Omit/extends para extensiones específicas
   - Migrar mobile a usar tipos compartidos donde sea posible

3. **Shared utilities**
   - Extraer `clone()`, `euros()` a paquete compartido
   - Crear abstracción para platform-specific (fetch vs AsyncStorage)

4. **Testing**
   - Mover tests de domain al paquete compartido
   - Crear tests específicos para @tpv/core

## Beneficios Inmediatos

A pesar de las limitaciones, ya tenemos beneficios:

1. **Lógica de dominio centralizada**: Cambios en reglas de negocio afectan a ambas plataformas
2. **TypeScript tipado**: Domain completamente tipado y compilado
3. **Base para extensión**: Estructura lista para añadir más código compartido
4. **Separación de concerns**: Domain puro sin dependencias de infraestructura

## Conclusión

La Fase 1 ha establecido la base técnica para compartir código entre web y mobile. Aunque el application layer aún necesita trabajo, el dominio compartido ya proporciona valor inmediato y una ruta clara para evolucionar hacia un núcleo de negocio unificado.
