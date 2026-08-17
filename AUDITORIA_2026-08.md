# Auditoría Competente — La Comanda TPV Restaurante

**Fecha:** 11 de agosto de 2026
**Versión del proyecto:** V.39 (commit `bc20d0f`), rama `main`
**Método:** Revisión estática línea a línea + ejecución de tests/lint/typecheck/npm audit. Sin modificación de código.

---

## Resumen ejecutivo

El proyecto es técnicamente ambicioso y está bien organizado, pero la auditoría revela **problemas graves de seguridad que hacen al sistema no apto para producción multi-tenant en su estado actual**. El más crítico: **el login no verifica el PIN en servidor y acepta el rol declarado por el cliente**, lo que permite escalar a admin con una sola petición HTTP. Combinado con un aislamiento de tenant basado en una cabecera `x-tenant-id` que el cliente puede falsificar, cualquier persona puede leer y modificar datos de cualquier restaurante.

La buena noticia: la base del proyecto es sólida — 487 tests en verde, TypeScript strict limpio, clean architecture real en domain/application, migración completa a Drizzle y App Router bien ejecutada. Los problemas son **corregibles** y en su mayoría localizados.

**Calificación: 4.5/10** (funcional y bien estructurado, pero con fallos de seguridad críticos explotables).

| Verificación | Resultado |
|---|---|
| Tests | 487 passed / 1 skipped (45 ficheros) ✅ |
| `tsc --noEmit` | 0 errores ✅ |
| ESLint | 0 errores, 756 warnings ⚠️ |
| npm audit | 6 vulnerabilidades moderadas (esbuild, uuid en exceljs) ⚠️ |
| Adecuación a producción multi-tenant | NO ❌ |

---

## CRÍTICOS (arreglar de inmediato, requieren quitar la app de producción mientras tanto)

### S-1. Escalada a administrador sin PIN — el login acepta el rol del cliente
`app/api/session/route.ts:21-75` — el action `login` NO verifica el PIN contra la tabla `employees`, NO comprueba que el empleado exista, y toma `employeeRole` **del cuerpo de la petición** (líneas 60-64) para guardarlo en `sessions` y firmarlo en el JWT (69-74). El comentario de las líneas 24-25 ("we validate the employee exists via PIN verification before reaching here") describe una verificación que solo ocurre en el cliente — el servidor nunca la encadena.

```bash
curl -X POST https://<host>/api/session -H 'Content-Type: application/json' \
  -H 'x-tenant-id: default' \
  -d '{"action":"login","employeeId":"cualquiera","employeeRole":"admin","deviceId":"x"}'
# -> { ok: true, token: "<JWT role=admin>" }
```
Con ese JWT (Bearer) o cookie, `requireRole(['admin'])` pasa (lee de la fila `sessions`, `lib/rbac.ts:57`) → en cliente: `/api/settings` PUT, `/api/employees` PUT (reescribe PINs), `/api/catalog`, `/api/demo-seed`, `/api/backup` (dump completo). **No se necesita ni la API key.** El rate-limit de 10/min no ayuda: basta una llamada. `GET /api/employees` sin auth (`app/api/employees/route.ts:26-28`) además filtra los IDs de empleados, facilitando el ataque con un id real.

### S-2. Aislamiento multi-tenant roto: el tenant lo decide el cliente
`lib/tenant.ts:10-15` — `getTenantId(req)` devuelve la cabecera `x-tenant-id` (o query param `tenantId`) **sin verificar nada**. El proxy usa ese mismo valor como tenant de la API key (`proxy.ts:111`). Cualquier endpoint público (por ejemplo `GET /api/qr-order` con `x-tenant-id: <tenant_víctima>`) opera sobre el tenant ajeno. `validateTenantOwnership()` existe en `lib/rbac.ts:68-80` pero **no se llama en ninguna parte** (0 usos).

### S-3. `GET /api/settings` sin autenticación devuelve credenciales de Twilio
`app/api/settings/route.ts:12-25` — el GET no llama a `requireRole`. Devuelve **todas las filas `settings`** del tenant (controlado por `x-tenant-id`, S-2). La app guarda ahí `waitlistTwilioSid`, `waitlistTwilioToken`, `waitlistTwilioPhone`, `waitlistWhatsApp`. Un anónimo puede leer el AuthToken de Twilio y enviar SMS/WhatsApp en nombre del restaurante (spam/phishing), además de ver configuración Stripe/Fiskaly, si se guardara.

### S-4. Endpoint KDS público con fuga de todos los códigos de emparejamiento
`app/api/kds/route.ts:61-78` — el action `verify` está en `PUBLIC_PATHS` (`proxy.ts:57`) y **no exige auth ni rate-limit**. Si el código es inválido, la respuesta 400 incluye `_debug.allCodes` con **todos los códigos de emparejamiento de TODOS los tenants** (líneas 68-70, la query no filtra por tenant). Explotación en 2 peticiones: (1) lees la lista de códigos, (2) verifícas con uno válido → tu `deviceId` queda emparejado como KDS. Además el código de emparejamiento se genera con `Math.random()` (línea 14), no criptográfico.

### O-1. Cierre de comanda sin red pierde la venta para siempre
`application/sales/sales-queue.ts:36-51` — el POS encola la venta en memoria y tras **dos fallos seguidos hace `queue.shift()` y descarta la venta** ("No se pudo guardar"). No persiste la venta en la cola de localStorage (`tpv:mutations`) ni hay `syncCachedSales` en el web (solo el móvil la tiene, `mobile/lib/api.ts:260-292`). `useAppInit.ts:98-105` solo fusiona la caché en el estado local, nunca la reenvía a la API.

**Escenario reproduccible:** sin red, cierras una comanda de 45 € en efectivo. Al volver la red: la venta no existe en la BD, no hay ticket, no hay entrada en caja ni Verifactu. El cuadre de caja queda descuadrado y nadie percibe el error.

### O-2. Conflicto offlínico sin merge: Last-Write-Wins ciego sobre TODO el piso
`lib/floor-sync.ts:17-61` decide aceptar/rechazar por **relojes de vector de todo el piso**, no por mesa/pedido/item. Dos dispositivos modificando **mesas distintas** offline: al reconectar, el segundo PATCH recibe 409 y `hooks/useOfflineSync.ts:69-72` **elimina la mutación de la cola sin re-merge**. Los cambios del segundo dispositivo desaparecen en silencio.

Agravantes verificados:
- El `catch` de `persistFloor` es código muerto: `infrastructure/database/floor-repository.ts:15-22` traga todas las excepciones («offline — cache handles it»), por lo que el floor **nunca se encola** en la cola de mutaciones.
- El móvil envía PATCH de floor **sin `vectorClock`** (`mobile/lib/api.ts:132-153`); tras un solo guardado del POS el servidor responde `{}` vs `{POS:n}` → **409 permanente** en el móvil (`app/api/floor/route.ts:78-79`). Los cambios hechos desde el móvil solo existen en pantalla.

### O-3. Doble reembolso en Stripe (doble clic + carrera TOCTOU)
`hooks/useSalesActions.ts:25-29` — cada emisión de `payment:refunded` genera un `idempotencyKey` con `Date.now()` → dos pulsaciones = dos claves distintas = dos `stripe.refunds.create`. Y `lib/idempotency.ts:81-90` tiene TOCTOU: SELECT → handler → INSERT sin lock, así que dos requests concurrentes pasan ambos el check. **Dinero real duplicado en el reembolso** (`app/api/sales/refund/route.ts:50-55`).

### R-1. Canales Realtime (Supabase) públicos y sin validación de canal
`lib/realtime.ts:47-56` crea el cliente Realtime **sin modo private/RLS** usando la clave anónima. Cualquiera con `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (está en el bundle del navegador) puede suscribirse y **emitir** en `floor-sync:<tenant>`. El JWT firmado en `app/api/realtime/token/route.ts` incluye `tenant_id` pero **nada lo valida contra el canal** — es decorativo. Un atacante puede emitir un `floor:updated` con `isFullSync:true` y un piso malicioso: todos los POS/KDS/móviles **reemplazan su piso** (`lib/realtime.ts:109-112` no comprueba versión/reloj).

---

## ALTOS

### Seguridad
- **A-1. JWT con secreto por defecto hardcodeado** (`lib/auth/jwt.ts:34`): `process.env.JWT_SECRET || 'dev-insecure-secret-change-me'`. Mismo patrón en `/api/realtime` (`fallback_secret_key`). Si el entorno no lo define, cualquiera forja sesiones admin.
- **A-2. Cabeceras de empleado forjadas sobreviven en el path de JWT inválido** (`proxy.ts:84-101`): con `Authorization: Bearer basura` + cabeceras `x-employee-id/x-device-id` fabricadas, el proxy devuelve `auth:null` pero **deja las cabeceras intactas** a `requireRole()`. Juntas a una fila `sessions` creada vía S-1, da impersonación de cualquier empleado. Los paths de API key sí limpian (`proxy.ts:106-107`) pero el path de JWT-inválido no.
- **A-3. API key real embebida en el bundle del cliente**: `NEXT_PUBLIC_TPV_API_KEY` se compila dentro del JS del navegador. `.env:7` tiene el valor real `tpv_pos_...`. `demo-seed` la inserta como hash en `api_keys` por tenant. Combinada con S-1/S-2 da control total. Aunque sea un known-tradeoff del offline, no se documenta ni se mitiga (rotación, scoping).
- **A-4. Rate limiting evitable por spoofing de `X-Forwarded-For`** (`lib/rate-limit.ts:95-101`): confía en `x-forwarded-for`/`x-real-ip`. `server.js` es un servidor HTTP directo (no detrás de un proxy que resetee XFF), así que el atacante rota la IP y anula todos los rate-limits (PIN, login, QR, stripe).
- **A-5. PIN de 4 dígitos con lockout únicamente en cliente** (`mobile/hooks/usePinLockout.ts`): el lockout se guarda en AsyncStorage → se burla borrando la clave o desde otro dispositivo.
- **A-6. IDORs cross-tenant en updates por `id` sin `tenant_id`**: `app/api/clockin/route.ts:152-162,208-216` (edita `clockin_logs` de otro tenant), `app/api/sales/route.ts:154-174` (PATCH de `sales.payments` por id solo), `app/api/sales/refund/route.ts:34-70` (reembolso real en Stripe de la venta de otro tenant).
- **A-7. Subida de SVG sin validación de contenido** (`app/api/upload/route.ts:15-33`): valida extensión pero no magic-bytes; un SVG con `<script>` servido `/uploads/...svg` ejecuta JS same-origin.

### Datos / Offline / Móvil
- **D-1. `backupAll()` mezcla todos los tenants en un dump global** (`lib/backup.ts:41-115`): hace `SELECT *` **sin filtro de tenant** y guarda todo en una fila `backups`. Accesible vía `/api/backup-cron` (CRON_SECRET) y `/api/migrate`. Si el env del cron se filtra, es exfiltración total de todos los restaurantes.
- **D-2. `sales` y `productStock` no tienen tenant en la PK** (`db/schema.ts:67-68,1348-1362`): el upsert de stock de un tenant puede sobrescribir stock ajeno; `floorPlan` no tiene `tenant_id` (global).
- **D-3. Ventas descartadas y huecos de numeración fiscal**: el móvil reintenta `POST /api/sales` **sin `x-idempotency-key`** (`mobile/lib/api.ts:204-221`); `app/api/sales/route.ts:100-106` incrementa `ticketCounters` por POST, y el insert usa `onConflictDoNothing` → cada reintento quema un número de ticket aunque la venta no se inserte. Y si el `id` cliente (8 chars `Math.random`.toString(36)) colisiona, la venta se pierde en silencio.
- **D-4. Los `3600` pesos: `InformesView.tsx` de 1.701 líneas y Mobiles**: `InformesView` (1701 líneas), `SalonView` + `FloorEditor` (835). Sin `React.memo` en toda `modules/` y `components/` → la rejilla de mesas se re-renderiza entera ante cualquier cambio de estado global (hay polling de floor/QR cada 10-15 s que emite `setFloor`, y el layout re-crea los 5 context-values con handlers nuevos en cada render: `(taller)/layout.tsx:260-261`).
- **D-5. El layout es un god-component** (`app/(taller)/layout.tsx`, 333 líneas): 22 useState + 13 hooks + 5 modales + routing + realtime + persistencia. `AppProviders` recibe data/handlers por props → prop-drilling disfrazado, la Fase 0 del plan REFACTOR_PAGE_JSX está incompleta.
- **D-6. `node_modules` móvil de ~5.8 GB duplicado**: el `mobile/` **no es un workspace** del monorepo raíz (`F:\tpv\package.json:4-7` solo lista `packages/*` y `tpv-restaturante`) → `npm ci` de la raíz no gestiona el móvil y hay 3-4 instalaciones de TypeScript distintas (5.9/6.0/7.0) entre workspace y workspace.

### Frontend
- **F-1. CSS: el monolito `page.jsx` ya no existe** (bien), pero el catch-all `[...view]` sigue siendo la puerta de `/accesos` y `/kds` sin página dedicada.
- **F-2. Las 36 páginas dedicadas hacen import estático** de sus vistas → el code-splitting de `ViewRouter` con `dynamic()` solo aplica al catch-all; entrar en `/informes` carga las 1701 líneas en el chunk de la página. `SalonView` importa `FloorEditor` (835 líneas) estáticamente aunque solo se renderiza con un flag.
- **F-3. a11y**: 0 `aria-*`, 0 `<label>` con htmlFor, 0 `role="dialog"` en toda la app; modales sin focus-trap, sin Escape, sin restaurar foco. Para un sistema que se opera 12 h/día en iPads/PC esta es una deuda real (WAI-ARIA y convenio 156/UE de accesibilidad).

---

## MEDIOS y BAJOS (muestra)
- **Cache GET sin TTL ni tamaño** (`lib/offline.ts:6-17`): ante un 500 persistente del catálogo, el POS sirve datos de hace días; `clearMutations` no se llama en producción. Cache y cola crecen sin límite.
- **`cleanupExpiredIdempotency` nunca se agenda** → `idempotency_keys` crece sin límite (TTL 24 h, webhook_events 7 días).
- **`prod: push --force` en Docker** (`scripts/docker-entrypoint.sh:20`): en producción, `drizzle-kit push --force` puede borrar columnas. Debe usarse `migrate`.
- **Documentación desactualizada**: `AGENTS.md` describe `app/page.jsx` (ya no existe) y `components/constants.js`; el README declara 382 tests pero hay 487, y ~1371 warnings de lint cuando son 756. Dos fuentes de verdad de colores `C` mutables (`lib/theme.ts` y `components/constants.tsx`), 3 paletas hardcodeadas que ignoran el tema (DeliveryView, BuffetKiosk, QRCodeModal).
- **`.gitignore`/repo en orden**: no hay `.env` versionado; 735 ficheros, los únicos binarios son `acuerdo.pdf` e `Informe_Tecnico_TPV_La_Comanda.docx` (contrato y doc, defensible).
- **npm audit**: 6 moderadas (esbuild dev, uuid en exceljs) — sin parche limpio sin cambios breaking.
- **`console.log` en producción** en webhooks/image/verifactu/floor-routes.

---

## No hallado (lo que SÍ está razonablemente bien)
- **SQL injection**: no se encontró interpolación de input en queries. Todo pasa por placeholders parametrizados de Drizzle (`sql`...``). El único `sql.raw` es estático.
- **XSS**: no hay `dangerouslySetInnerHTML` en toda la app; contenido de menú/carrusel se escapa por React. Única superficie: el SVG subido (A-7).
- **CORS**: correcto — sin `*` en producción, cookie `httpOnly + SameSite=Lax + secure`.
- **Seed de catálogo/empleados** worldbuilding correcto y aislado del código de negocio.
- **Capa de dominio**: `application/*` clona antes de mutar de forma consistente; `OrderItemOperations`, `AddItemsToOrder`, `CloseOrder` son código limpio unit-testeado.
- **Event bus**: tipado, single-ignore de subscribers, integración Verifactu async.
- **RBAC de fugas de endpoint**: la mayoría de rutas operacionales SÍ llaman `requireRole`; webhooks validan HMAC/Stripe correctamente.

---

## Plan de remediación priorizado

| Prioridad | Acción | Esfuerzo |
|---|---|---|
| **P0 (hoy)** | Login server-side: verificar empleado + PIN contra BD, derivar rol de `employees`, nunca del body. Añadir `requireRole` al login y encadenar `verify`. | ½ día |
| **P0 (hoy)** | Atar el tenant al JWT verificado / al API key del tenant; prohibir `x-tenant-id` del cliente en rutas autenticadas; endpoints públicos deben derivar tenant del host/subdominio. Crear atributo de `validateTenantOwnership()` en rutas sensibles. | 1-2 días |
| **P0 (hoy)** | `GET /api/settings`: exigir rol + filtrar claves secretas; mover secrets de Twilio a env. | ½ día |
| **P0 (hoy)** | KDS verify: quitar `_debug.allCodes`, rate-limit, entropía criptográfica, y de-scope por tenant. | ½ día |
| **P0 (hoy)** | Rechazar 401 en rutas protegidas sin identidad válida en `proxy.ts` (no pasar con headers limpios) y limpiar headers en el path de JWT inválido. | ½ día |
| **P1 (semana 1)** | Rotar credencial BD + JWT_SECRET + API key real (están en .env en disco). Validar env al arranque. | 1 día |
| **P1** | Persistir en `tpv:mutations` los ciertos de comanda y ventas; reintentar cola FIFO con idempotency-key; no descartar tras 2 fail. | 1-2 días |
| **P1** | Merge por mesa/pedido en floor-sync (no LWW sobre todo el piso); añadir `vectorClock` al PATCH del móvil. | 2-3 días |
| **P1** | Doble refund: idempotencyKey estable (saleId+amount) y `INSERT ... ON CONFLICT` en vez de SELECT→handler→INSERT. | ½ día |
| **P1** | Realtime: canales privados con RLS o firma por tenant; validar claims vs canal; `applyFloorDiff` con check de reloj. | 1 día |
| **P2 (mes)** | Rate-limit por IP real (socket) o proxy de confianza; disable cleartext en `app.json`; `requireAdminPin`/PIN hashing con sale por empleado; `makeId`/`generateCode` criptográficos. | 1-2 días |
| **P2** | Chat para migrar de `drizzle-kit push --force` a `migrate`; tenant en PK de `sales`/`productStock`/`floorPlan`. | 1 día |
| **P2** | Móvil como workspace del monorepo; unificar TS a una versión; reducir `node_modules`. | ½ día |
| **P3** | a11y (labels, roles, focus-trap); `React.memo` en `MesaCard`/listados y `useMemo` en context-values; lazy import de FloorEditor/InformesTab; paginación/virtualización en informes e inventario. | continuo |

---

## Conclusión

El código base es **bueno**: arquitectura limpia, 487 tests verdes, Drizzle bien asimilado, event bus tipado, soldado a GitHub con V.39. Pero la **autenticación y el modelo de confianza del tenant están rotos por diseño** (S-1 y S-2), y el offline-first **pierde datos de venta de forma silenciosa** en producción (O-1, O-2). Ninguna de las dos cosas es aceptable en un TPV que gestiona dinero y fiscalidad española (Verifactu).

La prioridad absoluta es cerrar S-1 — S-4 (seguridad) antes de cualquier otra cosa, porque son explotables hoy, de forma trivial y remota. Después, el trabajo offline (P1). Lo demás (frontend, a11y, monorepo) es deuda técnica manejable.

**Recomendación inmediata:** o la app deja de estar expuesta hasta cerrar los P0, o se acepta el riesgo con un plan fechado. Los test de integración deberían empezar por reproducir S-1/S-2 (curl al `POST /api/session` sin PIN) para fijar la regresión.

---

## Estado de remediación

Actualizado tras la implementación de los P0 de seguridad. Suite hoy: **490 tests pasan / 1 skip**, `tsc --noEmit` limpio, ESLint 0 errores.

### P0

- **S-1 — CERRADO.** El login ya no acepta rol del cliente. Flujo seguro en dos pasos:
  1. `POST /api/employees` (action `verify`) valida PIN contra `employees.pinHash` en el servidor y devuelve un **`loginTicket`** firmado (JWT, expiración 3 min, claims `sub`/`tenantId`/`deviceId`) — `app/api/employees/route.ts:123-152`, `lib/auth/jwt.ts:98-133`.
  2. `POST /api/session` (action `login`) **exige** el ticket, deriva `tenantId` del ticket (nunca del header) y el **rol de la BD** (`employees`), ignorando `employeeRole` del body — `app/api/session/route.ts`. Un `curl` sin ticket devuelve 401.
  - App web y móvil actualizadas (`application/auth/login.ts`, `lib/session.ts`, `mobile/lib/session.ts`, `mobile/app/index.tsx`).
  - Tests de regresión reescritos: `__tests__/integration/session.test.ts` (15 casos, incluye "rol derivado de BD ignorando el body").
- **S-2 — ABIERTO (pendiente de decisión).** `x-tenant-id` sigue tomándose de la cabecera sin verificar. Requiere atar el tenant al JWT verificado / al host en rutas públicas y usar `validateTenantOwnership()`.
- **S-3 — CERRADO (parcial).** `GET /api/settings` continúa sin `requireRole` pero redacta toda clave sensible (`SECRET_KEY_RE`: sid/token/secret/password/credential/api-key/auth) salvo para admin real — `app/api/settings/route.ts`. Pendiente: mover secretos de Twilio a env.
- **S-4 — CERRADO.** Eliminado `_debug.allCodes` (ya no se filtran códigos de ningún tenant), rate-limit `kds-verify:<ip>` 20/min, y `generateCode()`/`makeId()` usan `randomBytes` (crypto) — `app/api/kds/route.ts`.

### Mitigaciones parciales

- **A-1 — CERRADO.** Eliminado el secreto JWT hardcodeado: `secretBytes()` lanza error en producción si falta `JWT_SECRET` (`lib/auth/jwt.ts:35`); el fallback literal `'fallback_secret_key'` de `/api/realtime/token` también se eliminó (exige `SUPABASE_JWT_SECRET` o `JWT_SECRET`). Combinado con `validateEnv()` en el proxy, no hay forma de firmar con un secreto conocido.
- **A-2 — CERRADO.** El proxy ahora responde **401** cuando el cliente presenta un Bearer inválido/expirado o un `deviceId` en conflicto con el JWT, en lugar de reenviar sin identidad (`proxy.ts`). Las cookies obsoletas se dejan pasar para que la ruta las invalide con gracia (keepalive → logout). Identidad de cabecera forjada sigue siendo eliminada (`stripIdentity`).

### Pendientes clave (no iniciados)

- **S-2** (aislamiento de tenant), **O-1/O-2/O-3**, **D-1**, **A-3/A-4/A-5/A-6/A-7**, **R-1** — sin cambios desde la auditoría.
- `GET /api/employees` sigue devolviendo la lista mínima (`id`, `name`, `role`, `hasPin`) a portadores de API key (necesario para el selector de PIN); ahora con rate-limit 30/min por IP (`app/api/employees/route.ts`) para frenar la enumeración. Endurecimiento total requiere la decisión de S-2/A-3.

### Notas de implementación

- `employeeRole` del body se sigue enviando por compatibilidad de contrato pero el servidor lo ignora.
- La biometría móvil ya no abre sesión sin PIN: restaura el token persistido solo si el empleado coincide y el keepalive no lo invalida.
- Los cambios no requieren migración de BD.