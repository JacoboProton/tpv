# Gap-list real (estado actual del código, 2026-08)

Documento de brechas verificado contra el código del repo (no contra snapshots
ni informes externos). Cada item tiene ruta/línea, por qué importa y la
consecuencia de dejarlo o de aplicarlo mal.

Prioridades: **P0** seguridad · **P1** estabilidad/rendimiento · **P2** calidad/deuda · **P3** limpieza.

**Estado (2026-08-18):** P0 #1, P1 #2-4, P2 #5/#7/#8 → **CERRADOS** ✅. Véase
`git diff` del mismo día. El resto sigue abierto. Además se descubrió un bug de
bootstrap real (ver abajo).

---

## P0 — Seguridad

### 1. XSS por falta de escape en facturas y tickets (vía real) ✅

Había **3** implementaciones, con alcance distinto. **CERRADO:**

| Ruta | Antes | Ahora |
|---|---|---|
| `@tpv/core/src/domain/invoice/invoice-html.ts` → `buildInvoiceHtml` | solo `<` y `>` | helper `esc()` con `& < > " '` en todos los campos interpolados + **5 tests nuevos** (`src/__tests__/invoice-html.test.ts`) |
| `lib/ticket-template.ts` `buildTicketHtml` (ticket térmico) | **nada** | `esc()` en items, modifiers, alergenos, settings, cliente, footer y `logoUrl` (atributo) |
| `hooks/useOrders.ts` `handlePrintInvoice` | solo `<` | **eliminado** (código muerto) |

**Recordatorio:** el fix vive en `@tpv/core`, compartido con la app móvil →
al publicar requiere **bump de versión del paquete + rebuild de Web y Mobile**.

---

## P1 — Estabilidad / rendimiento

### 2. Cadena `showToast → tryRestoreSession → loadAll` + useEffects ✅

**Corrección del informe del 18/08:** NO existe doble carga en mount. Los dos
useEffect de `useAppInit` (`[]` y `[tenantId]` con guard `if (loading) return`)
hacen exactamente **una** carga en mount — el efecto B se salta porque `loading`
empieza en `true`. Los 2 warnings de `exhaustive-deps` eran el problema real
(riesgo de refactor futuro), no un bug presente.

**CERRADO con preservación de comportamiento:**
- `showToast` → `useCallback([])` en `layout.tsx` (era función plana re-creada
  cada render, que desestabilizaba `tryRestoreSession` en `useEmployees:146` y
  por tanto `loadAll`).
- Effects de `useAppInit` sin warnings: ref `loadAllRef` sincronizada en un
  `useEffect` (el `react-hooks/refs` NO permite asignar ref durante el render)
  + efecto de mount `[]` + efecto de tenant con guard `prevTenantRef` comparando
  el tenant anterior con el actual.

**No se usó `[loadAll]` como dep** (la "solución" del informe): provocaría
refetch completo + flash de skeleton en cada login/logout porque `loadAll`
cambia de identidad al cambiar `currentUser`.

### 3. Polling sin `AbortController` ✅

`useRealtimeSync.ts`: añadidos `AbortController` para ambos intervalos
(`floor` 10s, `sales` 15s), abortados en el cleanup del `useEffect` (antes el
desmontaje dejaba timers vivos). Los `AbortError` se ignoran.
Se mantiene `JSON.stringify` como firma de cambio: es O(n) pero los datasets
son pequeños; sustituirlo por un hash manual añade riesgo sin beneficio real.

### 4. Loop de `window.location.reload()` sin ruta de salida ✅

`useAppInit.ts`: cuando el tenant activo no existe en `/api/tenants` hacía
`window.location.reload()`, que relee el MISMO `localStorage` stale → **bucle
infinito** si la API seguía vacía. **CERRADO:** ahora `removeItem('tpv:tenant')`
+ `setTenantId('default')` (nuevo prop) y `return`; `loadAll` se re-dispara por
el cambio de tenant. Sin `location.reload()`, sin ruta inexistente.

---

## P2 — Calidad / deuda

### 5. `window.__TPV_API_KEY` era un tipo muerto ✅

Declarado en `layout.tsx:22` pero nunca asignado. **ELIMINADO.** Cualquier
"fix" que reutilice esa propiedad no compila y no tiene efecto.

### 6. `as unknown as` → ~121 ocurrencias en 50 archivos

Concentradas en `useAppInit.ts` seeds (77-100) y `app-contexts`. La auditoría
decía ~15; son ~8x. **No abordar en bloque:** tipar con Zod los contratos de
respuesta y degradar casts uno a uno (boy-scout rule).

### 7. Basura versionada en git ✅

`err.txt`, `mobile/err.txt`, `scratch_err.txt`, `tsc_out.txt` y
`packages/core/err.txt` → **`git rm` hechos** + añadidos al `.gitignore` de
raíz y del app. Ningún script los genera (verificado con grep). `*.tsbuildinfo`
ya estaba ignorado.

### 8. `catch` sin reportar a Sentry en `useAppInit` ✅

El `catch` de `loadAll` solo hacía `console.error`. Añadido
`captureException(err)` (`@sentry/nextjs`, ya usado vía `lib/logger.ts`).
Aditivo, sin consecuencias negativas.

---

## ⚠️ BUG REAL descubierto (NO era de los informes): bootstrap en dispositivo nuevo

En un terminal con `localStorage` vacío (primera puesta), `loadAll` hace
early-return por el guard `hasSession` (`useAppInit:43`) **antes de poblar
`employees`**, y nada re-dispara `loadAll` tras el login (los efectos dependen
de `[]`/`[tenantId]`, no de `currentUser`). Resultado: el menú de login se
muestra con **`employees=[]` → no hay botones de usuario → imposible loguear**
en un terminal nuevo.

El flujo real de trabajo asume que el terminal ya tiene sesión persistida y la
DB viene presemillada. **Acción propuesta (fuera del scope cerrado):** tras un
login exitoso, disparar `loadAll` (o reintentar el seed de `employees`) — p.ej.
dependiendo el efecto de `currentUser`, o llamando `loadAll()` desde
`executeLogin` cuando no hay datos.

---

## P3 — Limpieza / higiene

- `vitest.config.ts` usa sintaxis ESM cargado como CommonJS
  (`configLoader: 'native'`); cosmético, no bloquea tests.
- `rate-limit.ts:38-46` memStore fallback no aguanta multi-instancia (Docker
  con replicas); aceptable por ahora, documentar como límite conocido.

---

## Lo que NO es gap (verificado, no tocar)

- `fetch('/api/...')` directo sin `apiHeaders()` (AutoTab, OrdersTab,
  PedidosCompraView…): la identidad la re-escribe el proxy desde las claims JWT
  (cookie), no desde headers cliente → **autenticado correctamente**.
- `drizzle-kit` en dependencies: lo ejecuta `docker-entrypoint.sh:20` en runtime.
- `/api/qr-calls` tras `dismissQrCalls` sin headers de auth: es ruta pública
  (`proxy.ts` PUBLIC_PATHS) → el "fix" era innecesario.
- Falta `*.tsbuildinfo` en `.gitignore`: **ya está**.