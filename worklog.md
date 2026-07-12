# Worklog — Proyecto TPV (La Comanda)

Bitácora compartida por los agentes que trabajan en `/home/z/my-project/tpv/tpv-restaturante/`.
Cada agente añade su sección al final, indicando ID, rol, alcance y hallazgos.

---

## Task 1-d — Explore · Integraciones de terceros del TPV

**Agente:** Explore sub-agent
**Ámbito:** `/home/z/my-project/tpv/tpv-restaturante/` — integraciones externas y APIs de terceros
**Trabajo realizado:** Lectura exhaustiva (sin modificar código) de las rutas, librerías, componentes y tests que implementan las integraciones del TPV con servicios externos: Stripe Terminal, Verifactu/Fiskaly, Supabase Realtime, webhooks Glovo/UberEats, impresión térmica ESC/POS, pedidos online + QR, reservas, waitlist, buffet, delivery propio, facturas PDF, backup y multi-tenant.

**Archivos inspeccionados (selección):**
- Stripe: `app/api/stripe/{payment-intent,terminal-connection-token,terminal-payment-intent,webhook,webhook-events,reconciliation}/route.js`, `components/{StripeModal,StripePaymentForm}.jsx`, `lib/payment-logger.js`, `__tests__/terminal-connection-token.test.js`
- Verifactu/Fiskaly: `lib/{verifactu,fiskaly,gestoriaSchemas}.ts`, `app/api/verifactu/*`, `components/{VerifactuPanel,VerifactuBadge,GestoriaView}.jsx`, `app/api/gestoria/route.js`, `__tests__/{verifactu,gestoriaSchemas}.test.*`
- Realtime: `lib/realtime.js`, `mobile/lib/realtime.ts`, `app/page.jsx`, `app/kds/page.jsx`, `app/api/floor/route.js`
- Webhooks: `app/api/webhooks/{glovo,ubereats}/route.js`
- Impresión: `lib/thermal-printer.js`, `components/TicketThermal.jsx`, `__tests__/thermal-printer.test.js`
- Pedidos online/QR: `app/pedir/page.jsx`, `app/pedir/track/[orderId]/page.jsx`, `app/qr/[tableId]/*`, `app/api/{qr,qr-order,qr-calls}/route.js`
- Reservas/Waitlist: `app/api/{reservations,reservations/availability,waitlist}/route.js`, `app/{reservar,waitlist}/page.jsx`
- Buffet: `app/api/buffet/route.js`, `app/buffet/tv/page.jsx`, `components/BuffetKioskView.jsx`
- Delivery: `app/api/delivery/{orders,runners,tracking,combined-orders}/route.js`, `app/api/delivery-zones/route.js`, `components/{DeliveryView,OnlineOrdersView}.jsx`como 
- Invoices: `app/api/invoice/{pdf,send}/route.js`
- Backup: `app/api/{backup,backup-cron}/route.js`
- Multi-tenant: `app/api/tenants/route.js`, `lib/tenant.{js,ts}`, `lib/migrate.js`, `app/middleware.js`

**Resumen de hallazgos clave:**
1. **Stripe Terminal** está muy pulido: idempotencia real vía `idempotencyKey` (ventana 5 min), rate limit por IP, logging a `payment_logs`, webhook con tracking idempotente en `webhook_events`, reconciliación Stripe↔BD (huérfanos, descuadres, devoluciones no registradas, chargebacks). Doble canal: PaymentIntent normal (con `automatic_payment_methods`) y Terminal PI (NFC `card_present`). Detección de chargebacks con `dispute_status` + `dispute_data`.
2. **Verifactu/Fiskaly** con doble modo: real (Fiskaly LIVE/test) y simulación local (cadena SHA-256 + XML AEAT con IGIC Canarias 7%). Fallback automático a `simulado` si Fiskaly falla, retry de simulados y regeneración completa de la cadena. Bug histórico detectado y mitigado: `fecha_hora_firma` no se persistía y se backfilló en migraciones (clave porque entra en el hash).
3. **Realtime** usa Supabase Broadcast sobre WebSocket (`floor-sync` channel). Eventos: `floor:updated` (sincroniza POS/KDS/móvil) y `ready:notification` (plato listo → toast + Notification API). Hay broadcast tanto desde el cliente (`broadcastFloorUpdate`) como desde el server (`broadcastFloorUpdateServer` tras PUT/PATCH `/api/floor`). Respaldo por polling 4-5s en `app/page.jsx`.
4. **Webhooks Glovo/UberEats** sin verificación de firma (sólo `x-forwarded-for` logueado) — **riesgo de seguridad**. Sólo soportan crear pedido; no manejan cancelaciones ni actualizaciones de estado. Inserción directa en `delivery_orders` con `source='glovo'/'ubereats'` y `platform_order_id`.
5. **Multi-tenant** es parcial: hay `tenant_id` en ~30 tablas y `getTenantId()` se aplica solo en 7 rutas (floor, sales, catalog, employees, settings, payments, catalog/csv). **El resto de rutas (Verifactu, Stripe webhook, reservations, waitlist, qr-order, buffet, delivery, etc.) no filtran por `tenant_id`** → aislamiento incompleto. PKs son simples (id TEXT), no compuestas, lo que puede generar colisiones entre tenants.
6. **Impresión térmica**: doble vía — WebUSB ESC/POS puro (conexión, transferOut, abrir cajón) y `window.print()` con CSS `#thermal-ticket`. Generador ESC/POS de tickets cubierto por tests (16 tests). Sin embargo, `lib/thermal-printer.js` llama `new TextEncoder('windows-1252')` que **no es estándar** (TextEncoder solo soporta UTF-8) — lanzará TypeError en producción.
7. **Invoices** genera PDF con jsPDF + autotable. Cálculo de IGIC 7% incrustado (Canarias). Envío por SMTP vía nodemailer si `SMTP_HOST`+`SMTP_USER` configurados, si no, modo "download".
8. **Backup**: `GET /api/backup` vuelca 16 tablas a JSON; `GET /api/backup-cron` ejecuta `backupAll()` (50+ tablas) y guarda en tabla `backups` reteniendo 30 últimos. Protegido por `CRON_SECRET` bearer.

**Riesgos principales identificados:**
- Webhooks Glovo/UberEats sin verificación criptográfica de origen.
- Multi-tenant con aislamiento incompleto (muchas rutas ignoran `tenant_id`).
- `TextEncoder('windows-1252')` inválido en `thermal-printer.js`.
- Verifactu: el NIF emisor por defecto `B12345678` (env var `FISKALY_TAXPAYER_NIF`) si no se configura → facturas inválidas.
- `regenerate` de Verifactu hace `DELETE FROM verifactu_registros` sin confirmación → borra cadena histórica.
- Stripe webhook inserta ventas "stub" con `id = 'stub_' + pi.id` si no hay venta local — puede generar conflictos si el POS ya insertó la venta.
- `lib/realtime.js` es singleton global → en serverless cada cold start crea un nuevo canal sin persistencia; `broadcastFloorUpdateServer` abre y cierra una conexión por llamada (ineficiente).
- Rutas públicas (`/api/qr-order`, `/api/qr-calls`, `/api/webhooks/*`) exentas de `x-tpv-key` (vía middleware skip) — `qr-calls` no tiene rate limit ni CAPTCHA → riesgo de spam.

**Puntos fuertes:**
- Logging estructurado de pagos (`payment_logs`) con `event_id`, `payment_intent_id`, `operation`, `status`, `error`, `stripe_response`.
- Reconciliación Stripe muy completa (huérfanos, descuadres, devoluciones, disputas, ventas no en Stripe).
- Esquemas Zod en gestoría con tests de validación.
- Sistema de buffet robusto: sesiones, rondas, cooldowns, overrides por sesión, desperdicios, pausa global, batch close.
- Tracking de pedidos QR con stepper visual y polling.

**Siguiente acción recomendada:** el reporte completo se entrega en la respuesta al usuario. Otros agentes deberían considerar: (a) añadir verificación HMAC a webhooks Glovo/UberEats, (b) extender `tenant_id` a todas las rutas que aún no lo filtran, (c) arreglar `TextEncoder` en thermal-printer, (d) cubrir con tests la cadena Verifactu en modo Fiskaly real (sólo se testea simulación local).

---

## Task 1-b — Explore · API + Base de Datos del TPV

**Agente:** Explore sub-agent
**Ámbito:** `/home/z/my-project/tpv/tpv-restaturante/` — capa API REST (Next.js Route Handlers) y base de datos PostgreSQL (Neon serverless), incluyendo migraciones, multi-tenant, sesiones, rate limiting, offline, realtime, schemas, utilities, tests, config y contenedorización.
**Trabajo realizado:** Lectura exhaustiva (sin modificar código) de `lib/{db,migrate,tenant,session,api,rate-limit,offline,realtime,gestoriaSchemas,floor,modifiers,thermal-printer,payment-logger,sound,verifactu,fiskaly}.js`, `lib/schemas/floorSchema.ts`, `lib/tenant.ts`, `app/middleware.js`, las **76 rutas** `app/api/*/route.js`, los 6 tests en `__tests__/`, `package.json`, `Dockerfile`, `docker-compose.yml`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`, `.env.example`, `server.js`, `AGENTS.md`.

**Resumen ejecutivo:** El TPV es un monolito Next.js 16 (App Router) que usa `@neondatabase/serverless` con SQL crudo (sin ORM), migraciones idempotentes ejecutadas vía `POST /api/migrate`, multi-tenant por cabecera `x-tenant-id` (parcialmente aplicado), auth por API key estática `x-tpv-key` (sin roles verificados server-side), sesiones de empleado por `device_id` para detectar logines duplicados, rate limiting in-memory sólo en 4 rutas Stripe, cache y cola offline en `localStorage`, sincronización en tiempo real vía Supabase Broadcast, e integración de facturación electrónica Verifactu con Fiskaly + fallback a simulación local SHA-256.

### Modelo de datos (tablas, agrupadas por dominio)
- **Multi-tenant:** `tenants` (id, name, slug, logo_url, address, phone, email, nif, active, config jsonb, created_at). `tenant_id TEXT NOT NULL DEFAULT 'default'` se añade a 30+ tablas core: products, categories, tables, orders, sales, employees, offers, combos, meal_menus, settings, delivery_orders, delivery_runners, delivery_zones, stock_log, cancelled_orders, employee_turns, access_logs, verifactu_registros, qr_orders, reservations, waitlist, purchase_orders, albaranes, suppliers, supplier_catalog, productions, recipes, buffet_sessions, buffet_config, clockin_logs, employee_shifts, modifier_groups, combo_slots/items, product_price_rules, product_stock, purchase_order_lines, albaran_lines, production_ingredients, recipe_ingredients.
- **Catálogo (ventas):** `categories`, `products` (price, stock, low_stock, ubicacion, course, allergens[], image, description, featured, active, show_tpv, show_qr, agotado, carousel_sort, type, inventariable, discount), `product_stock` (por producto+location), `product_price_rules` (reglas horarias/diarias), `offers` (menú del día, happy hour), `meal_menus` + `meal_menu_courses` + `meal_menu_course_items` + `meal_menu_schedules`, `combos` + `combo_slots` + `combo_slot_items` + `combo_items`.
- **Floor / comandas:** `tables` (pos_x/y, width/height/radius, shape, rotation, seats, zone, layer, color, order_ids jsonb, reserved_for, is_fiado, type), `orders` (items jsonb, table_id, source, employee_name), `floor_plan` (singleton id=1 con zones+background).
- **Ventas / tickets:** `sales` (subtotal, discount, total, tip, total_with_tip, payments jsonb, payment_method, is_fiado, is_debt_payment, employee_id/name, closed_at, invoice_*, refunds jsonb, payment_intent_id, stripe_confirmed, dispute_status/data, ticket_number), `cancelled_orders`, `closures` (cierres de caja con cuadratura), `access_logs`.
- **Inventario / compras:** `stock_log` (audit trail de movimientos), `suppliers`, `supplier_catalog` (precio/pack por proveedor+producto, con `is_preferred` único por producto vía partial unique index), `supplier_price_history`, `purchase_orders` + `purchase_order_lines` (estados draft→sent→partial→received), `albaranes` + `albaran_lines` (con IVA, recargo equiv., portes, descuentos), `product_batches` (lotes con caducidad y remaining_quantity), `recipes` + `recipe_ingredients` (escandallos con yield_qty), `modifier_recipes` + `modifier_recipe_ingredients`, `productions` + `production_ingredients` (consumo de recetas, genera batches), `auto_order_settings`.
- **Empleados / RRHH:** `employees` (pin TEXT en claro, role, position, work_type/pct, dni, monthly_limit/used/month, whatsapp_code/linked), `employee_turns` (cambios de turno), `clockin_logs` (entrada/salida/pausa/vuelta con edited_by/edit_reason/signature), `clockin_corrections` (solicitudes de corrección), `employee_shifts` + `shift_objectives` (planificación semanal), `time_off_requests`, `sessions` (tenant_id+employee_id+device_id único, controla logines duplicados).
- **Modificadores:** `modifier_groups` (single/multiple, required), `modifier_options` (price_delta, is_default, sort_order, stock_deduct, stock_article_id, stock_quantity), `product_modifiers` (asociación producto↔grupo).
- **Delivery / QR / reservas:** `delivery_runners`, `delivery_orders` + `delivery_tracking` (geolocalización), `delivery_zones`, `qr_orders` (pedidos desde QR con modality dinein/pickup/delivery), `qr_calls` (avisos desde mesa), `reservations` + `reservation_recurring` (status pendiente→confirmada→sentada→noshow/cancelada, deposit tracking, source manual/online/qr), `waitlist` (cola con position, called_count, status).
- **Buffet:** `buffet_config` (singleton), `buffet_sessions` (adult/child/senior count, round, cooldown_until, override_*, waste_amount, cover_price_snapshot), `buffet_rounds`, `buffet_waste`.
- **Gestoría / fiscal:** `gestoria_settings`, `gestoria_documents` + `gestoria_document_lines` (gasto/ingreso con zone spain/eu/outside_eu, type good/service, withholding), `gestoria_payrolls`, `gestoria_tax_models` (modelos 303/111/115/130/349/347/390/190/180 por año+trimestre), `gestoria_authorization` (singleton).
- **Facturación electrónica (Verifactu):** `verifactu_registros` (sale_id único, num_serie único, fecha_expedicion, importe_total, base_imponible, cuota_iva, huella_anterior, huella, xml_registro, qr_url, estado pendiente/registrado/simulado, fiskaly_invoice_id, verification_url, fecha_hora_firma, payment_intent_id), `fiskaly_config` (kv store), `payment_logs` (event_id, payment_intent_id, operation, amount_cents, status, error, stripe_response).
- **Infra:** `backups` (kv JSON con 30 retenidos), `webhook_events` (event_id único → idempotencia de Stripe webhook), `kds_pairings` (códigos de emparejamiento KDS de 6 chars, 10 min expiración), `kds_audit_log`, `settings` (kv con PK compuesta tenant_id+key).

**Patrón multi-tenant:** todas las tablas core tienen `tenant_id TEXT NOT NULL DEFAULT 'default'` (añadido idempotentemente en `lib/migrate.js:43-46`), con índice `idx_<table>_tenant`. Sin embargo, sólo 8 tablas tienen PK compuesta `(tenant_id, id)`: `tables, orders, products, employees, offers, combos, categories` + `settings (tenant_id, key)`. El resto mantiene PK simple `id`, lo que permite colisiones entre tenants y aislamiento imperfecto.

### API REST (76 rutas)
Ver reporte completo entregado al usuario. Resumen de grupos:
- **Catálogo y floor (tenant-aware):** `/api/catalog` (GET/PUT/PATCH), `/api/catalog/csv` (GET/POST), `/api/floor` (GET/PUT/PATCH con diff y Supabase broadcast), `/api/products` implícito en catalog.
- **Ventas y caja:** `/api/sales` (GET/POST/PATCH), `/api/sales/refund` (PUT, Stripe refund), `/api/closures` (GET/POST, cierres de caja), `/api/payments` (GET con filtros), `/api/export/sales` (GET xlsx), `/api/cancelled` (GET/POST), `/api/stock-log` (GET/POST), `/api/access-logs` (GET/POST).
- **Empleados / RRHH:** `/api/employees` (GET/PUT/POST con verify-pin, link-whatsapp, generate-codes), `/api/session` (POST login/logout/keepalive), `/api/clockin` (GET/POST/PUT con edit-record, close-open, correction-request, resolve-correction), `/api/clockin-corrections` (GET), `/api/shifts` (GET/POST/DELETE con copy-week, save-objective, delete-objective), `/api/turns` (GET/POST), `/api/time-off-requests` (GET/POST).
- **Inventario / compras:** `/api/suppliers` (GET/POST), `/api/supplier-catalog` (GET/POST save/delete con auto-promote preferred), `/api/supplier-price-history` (GET/POST), `/api/purchase-orders` (GET/POST con create/update-status/update-lines/receive/auto-preview/auto-generate), `/api/albaranes` (GET/POST con create/update/delete/void/confirm), `/api/recipes` (GET/POST save/delete), `/api/production` (GET/POST create/void), `/api/food-cost` (GET con filtros), `/api/auto-order-settings` (GET/POST), `/api/add-stock`, `/api/move-stock`, `/api/split-stock`, `/api/seed-products`.
- **Modificadores / combos / menús / ofertas:** `/api/modifiers` (GET/PUT con validación stock_deduct), `/api/combos` (GET/PUT), `/api/meal-menus` (GET/PUT), `/api/offers` (GET/PUT), `/api/price-rules` (GET/PUT).
- **Delivery / QR / online:** `/api/qr` (GET, QR SVG), `/api/qr-order` (POST/GET/PUT, flujo dinein/pickup/delivery), `/api/qr-calls` (GET/POST/PUT con cache 3s), `/api/delivery/orders` (GET/POST/PUT), `/api/delivery/runners` (GET/PUT/DELETE), `/api/delivery/tracking` (GET/POST), `/api/delivery/combined-orders` (GET), `/api/delivery-zones` (CRUD), `/api/webhooks/glovo` (GET/POST), `/api/webhooks/ubereats` (GET/POST con challenge verification).
- **Reservas / waitlist / buffet:** `/api/reservations` (GET/POST/DELETE con recurring), `/api/reservations/availability` (GET), `/api/waitlist` (GET/POST join/call/seat/cancel/noshow/reorder), `/api/buffet` (GET con scope config/sessions/table_session/rounds + POST open/pause/resume/close/void/adjust_guests/override/add_waste/batch/create_round/deliver_round/call_customer/update_config).
- **Stripe:** `/api/stripe/payment-intent` (POST, rate-limited 10/min), `/api/stripe/terminal-payment-intent` (POST NFC), `/api/stripe/terminal-connection-token` (POST, rate-limited 20/min), `/api/stripe/webhook` (POST, firma Stripe + idempotencia BD), `/api/stripe/webhook-events` (GET/POST, rate-limited), `/api/stripe/reconciliation` (GET, 365 días máx).
- **Verifactu / fiscal:** `/api/verifactu` (GET/POST), `/api/verifactu/verify` (POST, recalcular hash), `/api/verifactu/regenerate` (POST, regenera toda la cadena), `/api/verifactu/retry` (POST, reintenta simulados), `/api/verifactu/setup` (GET/POST Fiskaly), `/api/verifactu/delete-test` (DELETE), `/api/gestoria` (GET/POST/PUT/DELETE con documents/payrolls/calculate/settings/confirm/status/authorization/operations).
- **Sistema:** `/api/migrate` (POST), `/api/keep-alive` (GET), `/api/debug` (GET), `/api/backup` (GET, 16 tablas), `/api/backup-cron` (GET con CRON_SECRET, 50+ tablas), `/api/upload` (POST imágenes), `/api/reset-orders` (POST, DROP+CREATE), `/api/invoice/pdf` (POST), `/api/invoice/send` (POST SMTP), `/api/kds` (GET/POST/DELETE pairings), `/api/kds/audit` (GET/POST), `/api/tenants` (GET/POST/PUT/DELETE), `/api/settings` (GET/PUT).
- **Rutas tenant-aware (8):** `/api/catalog`, `/api/catalog/csv`, `/api/floor`, `/api/sales`, `/api/employees`, `/api/settings`, `/api/payments`, (parcial) `/api/closures` (sólo `tenant_id='default'` hardcoded). **Resto no filtran por tenant_id.**

### Auth y seguridad
- **Middleware** (`app/middleware.js`): matcher `/api/:path*`. Skip explícito para `OPTIONS` y `/api/webhooks/*`. Compara `req.headers.get('x-tpv-key')` contra `process.env.TPV_API_KEY`. Si la env var no está definida, **la API queda abierta** (sólo loguea si `expected && key !== expected`).
- **Roles:** existen en DB (`employees.role` con valores admin/camarero/cocina/etc.) y se persisten en `sessions.role`, pero **ningún endpoint verifica el rol del solicitante** — son puramente informativos para el front. Un empleado "camarero" podría llamar a `/api/verifactu/regenerate` o `/api/reset-orders` si conoce la API key.
- **Sesiones (`lib/session.js` + `/api/session`):** controlan logines duplicados. Si un empleado no-admin intenta logarse en otro dispositivo y ya hay sesión activa, devuelve `conflict: true`. Admin puede forzar. Keepalive cada 30s; si la sesión fue invalidada en otro terminal, devuelve `invalidated: true` y el front desloguea. Generación de `device_id` client-side (`web_<random>_<timestamp>`) persistida en `localStorage`.
- **Rate limiting (`lib/rate-limit.js`):** implementación in-memory con `Map<key, timestamp[]>`, ventana deslizante, cleanup cada 60s. Aplicado SÓLO en 4 rutas Stripe (`payment-intent`, `terminal-payment-intent`, `terminal-connection-token`, `webhook-events`). **El resto de la API no tiene rate limit.**
- **PIN:** los empleados tienen `pin TEXT` en claro en BD. Verificación vía `/api/employees` action `verify` y `/api/clockin` POST con `body.pin`. No hay hash/bcrypt. El PIN se devuelve en `GET /api/employees` (campo `pin`) — **fuga de PINs** a cualquier cliente con API key.
- **CORS:** `next.config.ts` abre `Access-Control-Allow-Origin: *` para `/api/*` — accesible desde cualquier origen si se conoce la API key.
- **Webhooks Glovo/UberEats:** exentos de `x-tpv-key` por middleware, sin verificación de firma HMAC → riesgo de falsificación de pedidos.
- **CRON_SECRET:** `/api/backup-cron` valida `Bearer <CRON_SECRET>`, correcto.
- **Upload:** `/api/upload` valida extensión (jpg/png/webp/gif/svg) y tamaño máx 2MB, pero guarda en `public/uploads/` con nombre saneado — aceptable, aunque servir SVG permite XSS si se inline.

### Migraciones (`lib/migrate.js`, 1557 líneas)
- **Patrón:** `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ADD COLUMN IF NOT EXISTS` repetido en cada ejecución. **Idempotente por diseño**, ejecutado vía `POST /api/migrate` (llamado desde el front al iniciar). `closures/route.js` incluso llama `runMigrations()` antes de cada GET/POST como ensureTable.
- **Seeds:** tenants default ('La Comanda'), settings (40+ claves: restaurantName, companyCif, reservas, QR, online, clockin, waitlist, plataformas Glovo/UberEats), offers (menú del día), modifier_groups (4 grupos seed), buffet_config, gestoria_settings (taxRegime, criterionOfCash), auto_order_settings, gestoria_authorization (singleton id=1), floor_plan (singleton id=1).
- **Backfill:** detecta registros Verifactu sin `fecha_hora_firma` y los rellena con `${fecha_expedicion}T${formatHora(created_at)}` (mitigación del bug histórico donde no se persistía la hora exacta de firma, necesaria para verificar la cadena SHA-256).
- **Conversión de PKs a compuestas:** para `tables, orders, products, employees, offers, combos, categories` se hace `DROP CONSTRAINT pkey + ADD PRIMARY KEY (tenant_id, id)` envuelto en try/catch; si falla, añade UNIQUE (tenant_id, id) como respaldo. Para `settings` se hace `DROP pkey + ADD PRIMARY KEY (tenant_id, key)`.
- **Helpers exportados:** `logStock`, `logCancelled`, `logTurn`, `fetchCancelledOrders`, `fetchStockLog`, `fetchTurns`, `backupAll` (vuelca 50+ tablas con `Promise.all` de SELECTs).
- **Riesgo:** ejecutar `runMigrations()` en cada request de closures es costoso. El patrón `ALTER TABLE ADD COLUMN IF NOT EXISTS` puede fallar si la columna existe pero con tipo distinto (no se hace ALTER TYPE). Las conversiones de PK pueden fallar silenciosamente y dejar la BD en estado intermedio (sólo loguean `console.warn`).

### Realtime (`lib/realtime.js`)
- Supabase Broadcast sobre WebSocket (`wss://<supabase-url>/realtime/v1`). Canal único `floor-sync`.
- **Eventos:** `floor:updated` (payload `{ floor }`) y `ready:notification` (payload `{ tableName, itemNames, waiterName, time }`).
- **Cliente:** `connectRealtime()` (singleton), `broadcastFloorUpdate(floor)`, `onFloorUpdate(callback)`, `broadcastReadyNotification`, `disconnectRealtime`.
- **Server:** `broadcastFloorUpdateServer(floor)` — abre nueva conexión, subscribe, broadcast, `setTimeout(100ms)` para unsubscribe+disconnect. **Ineficiente en serverless** (cold start por llamada). Se invoca desde `app/api/floor/route.js` PUT/PATCH.
- **Requiere** `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Si faltan, `connectRealtime` devuelve `null` silenciosamente (degradación elegante, sin error).
- Respaldo por polling 4-5s en `app/page.jsx`.

### Offline (`lib/offline.js` + `lib/api.js`)
- **Cache GET:** `localStorage['tpv:cache:<key>']` con JSON. Helpers `cacheGet/cacheSet`. `apiFetchWithCache(url, cacheKey)` intenta fetch, cachea si ok, devuelve cache si falla.
- **Cola de mutaciones:** `localStorage['tpv:mutations']` = array de `{ key, payload, method, createdAt }`. Helpers `enqueueMutation` (FIFO), `dequeueMutation`, `clearMutations`. **No hay procesador automático en `lib/offline.js`** — el front debe poll cada 10s y en `online` event (lógica que vive en `app/page.jsx`).
- **Network status:** `isOnline()` lee `navigator.onLine`. `onNetworkChange(fn)` subscribe a eventos `online`/`offline` del `window`.
- **Claves de cache usadas:** `catalog, floor, sales, employees, modifiers, combos, mealMenus, priceRules` (`KEYS` en `components/constants.js`).
- **apiFetch:** envía `x-tpv-key` (de `NEXT_PUBLIC_TPV_API_KEY` o `window.__TPV_API_KEY`) y `x-tenant-id` (de `localStorage['tpv:tenant']`) en cada request. Content-Type JSON. Si `!res.ok`, lanza Error con método, URL, status y body.

### Schemas (Zod)
- **`lib/schemas/floorSchema.ts`:** `TableSchema`, `OrderSchema`, `FloorPlanSchema`, `FloorPutBodySchema`. Usado en `app/api/floor/route.js` PUT para `parseAsync`. **No se valida PATCH ni GET.**
- **`lib/gestoriaSchemas.ts`:** `DocumentSchema`, `DocumentLineSchema`, `PayrollSchema`, `CalculateSchema` (modelCode enum 303/111/115/130/349/347/390/190/180), `SettingsSchema` (catchall string), `ConfirmSchema`, `StatusSchema`, `AuthorizationSchema`. Función `validateRequest(body)` despacha por `action`. **Sólo aplicado en `/api/gestoria`** (POST/PUT/DELETE) — el resto de rutas no validan entrada.

### Utilities
- **`lib/floor.ts`:** helpers TS para upserts masivos (`upsertTableQueries`, `upsertOrderQueries`, `upsertFloorPlanQuery`) y `fetchFullFloor(tenantId)` — usado por `/api/floor`. Construye queries con `ON CONFLICT (tenant_id, id) DO UPDATE`.
- **`lib/modifiers.js`:** seed de 4 modifier groups (Punto de carne, Acompañamiento, Extras, Tamaño) y mapeo `DEFAULT_PRODUCT_MODIFIERS` para p12/p13/p14. Seed ejecutado en `lib/migrate.js:284-312` si la tabla está vacía.
- **`lib/thermal-printer.js`:** generadores ESC/POS (init, center, bold, doubleHeight, cut, separator, openDrawer) + `generateTicketData` (compone ticket completo). Conexión WebUSB (`navigator.usb.requestDevice`, `claimInterface(0)`, `transferOut(1, data)`). **Bug:** `escposText` usa `new TextEncoder('windows-1252')` que **NO es estándar** — TextEncoder sólo soporta UTF-8, lanzará TypeError en producción. Mismo bug en `escposSeparator` y `generateTicketData`. Cubierto por tests pero éstos mockean TextEncoder implícitamente.
- **`lib/payment-logger.js`:** `logPayment({eventId, paymentIntentId, operation, amountCents, currency, status, tableId, tableName, employeeName, source, error, stripeResponse})` → INSERT en `payment_logs`. `stripeResponse` truncado a 2000 chars. Try/catch para no romper el flujo si el log falla.
- **`lib/sound.js`:** Web Audio API. `playBeep(freq, duration)`, `playKitchenAlert` (arpegio C-E-G-C), `showKitchenNotification(count)` (Notification API), `requestNotificationPermission`.
- **`lib/verifactu.js`:** cadena SHA-256 (NIF+numSerie+fecha+tipoFactura+cuota+importe+huellaAnterior+fechaHoraFirma), XML RegFactuSistemaFacturacion con IGIC 7% (Canarias), QR URL a `prewww2.aeat.es`. **NIF emisor por defecto `B12345678`** si no hay env var → facturas inválidas en producción.
- **`lib/fiskaly.js`:** cliente REST Fiskaly (auth bearer cacheado, taxpayer/signers/clients/invoices/agreement). `registerSaleInFiskaly(sale, numSerie)` crea factura SIMPLIFIED con IGIC 7%. Cachea `client_id`/`signer_id` en tabla `fiskaly_config`.

### Testing (`__tests__/`, Vitest 4 + jsdom)
- **6 archivos, ~86 tests:**
  1. `constants.test.js` — funciones de `components/constants.js` (euros, round2, clone, seedCatalog, seedFloor, seedEmployees, getDailyMenu, THEMES, KEYS, ALLERGENS). 25 tests.
  2. `gestoriaSchemas.test.ts` — validación Zod de gestoría (document, payroll, calculate, settings, confirm, status, authorization). 12 tests.
  3. `offline.test.js` — cacheGet/Set, mutation queue (enqueue/dequeue/clear), isOnline, onNetworkChange. 18 tests.
  4. `thermal-printer.test.js` — comandos ESC/POS y generateTicketData. 19 tests.
  5. `verifactu.test.js` — formatFecha/Hora, computeHash, buildQRUrl, generateRegistroFactura. 17 tests.
  6. `terminal-connection-token.test.js` — mockea Stripe + db, valida POST del route handler. 4 tests.
- **Config:** `vitest.config.ts` con environment jsdom y alias `@`. ESLint 9 flat config. `tsconfig.json` strict, `moduleResolution: bundler`, exclude `mobile`.
- **Gaps de cobertura:** no hay tests para `lib/api.js`, `lib/tenant.js`, `lib/session.js`, `lib/rate-limit.js`, `lib/realtime.js`, `lib/migrate.js` (crítico: 1557 líneas sin tests), ni para ninguna de las 76 rutas API (excepto `terminal-connection-token`). No hay tests de integración con BD. No hay tests de la cadena Verifactu en modo Fiskaly real (sólo simulación local). No hay tests de idempotencia de Stripe webhook. No hay tests de multi-tenant (que `tenant_id` filtre correctamente).

### Configuración y contenedorización
- **`package.json`:** Next.js 16.2.9, React 19.2.4, `@neondatabase/serverless` 1.1.0, `@supabase/supabase-js` 2.108.2, `stripe` 17.7.0, `zod` 4.4.3, `jspdf` 4.2.1, `xlsx` 0.18.5, `qrcode`, `nodemailer` 9, `openai` 6.45, `pdf-lib`, `node-forge`, `@signpdf/*`, `recharts`, `lucide-react`. Scripts: `dev` (Windows-only: `set NODE_OPTIONS=...`), `build`, `start`, `lint`, `test`.
- **`Dockerfile`:** multi-stage Node 20-alpine (deps → builder → runner), `output: 'standalone'`, usuario no-root `nextjs:1001`, expone 3000, CMD `node server.js`.
- **`docker-compose.yml`:** PostgreSQL 16-alpine (user tpv, pass tpv_local_dev, db tpv_restaurant) con healthcheck + volumen `pgdata`. Servicio `app` build local, puerto 3000, envs `DATABASE_URL`, `TPV_API_KEY`, `NEXT_PUBLIC_TPV_API_KEY`, `CRON_SECRET`. **Faltan envs de Stripe, Fiskaly, Supabase, SMTP** — deben añadirse si se usan esas integraciones.
- **`next.config.ts`:** `output: 'standalone'`, CORS `*` para `/api/*` con métodos y headers explícitos (incluyendo `x-tpv-key` y `x-tenant-id`).
- **`server.js`:** custom server HTTP, escucha `0.0.0.0:${PORT:-3000}`.
- **`.env.example`:** 18 variables documentadas: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL/PUBLISHABLE_KEY`, `FISKALY_ENVIRONMENT/API_KEY/API_SECRET/TAXPAYER_NIF/TERRITORY`, `STRIPE_SECRET_KEY/NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY/STRIPE_WEBHOOK_SECRET`, `STRIPE_LOCATION_*` (6 vars), `TPV_API_KEY/NEXT_PUBLIC_TPV_API_KEY`, `CRON_SECRET`, `SMTP_HOST/PORT/USER/PASS`.
- **Scripts npm:** `dev` (Next dev con 4GB heap), `build`, `start`, `lint` (ESLint 9), `test` (Vitest run).

### Hallazgos (riesgos, code smells, puntos fuertes, oportunidades)
**Riesgos de seguridad:**
1. **SQL injection en `sales/route.js:18` y `payments/route.js:24-29`:** `tenantId` y `employee` se interpolan en strings JS y luego se inyectan vía `sql.unsafe(conditions.join(' AND '))`. `tenantId` viene de header `x-tenant-id`, `employee` de query string. Un atacante con API key podría inyectar SQL. Ej: `?employee='; DROP TABLE sales; --` o `x-tenant-id: ' OR 1=1; --`.
2. **SQL injection en `catalog/route.js:188,194,200`:** `sql\`UPDATE products SET ${sql(field)} = ${value}\`` donde `field` viene del body PATCH `toggle-product/toggle-category/update-product`. `sql(field)` con string plano es interpretado como raw SQL por Neon.
3. **API abierta si `TPV_API_KEY` no configurada:** middleware sólo bloquea si `expected` está definido.
4. **PINs en claro en BD y devueltos en `GET /api/employees`.** No hay bcrypt ni hashing.
5. **Sin RBAC server-side:** roles (admin/camarero/cocina) sólo informativos. Cualquier cliente con API key puede llamar a endpoints admin (`/api/verifactu/regenerate`, `/api/reset-orders`, `/api/tenants` DELETE, etc.).
6. **Webhooks Glovo/UberEats sin verificación de firma.**
7. **CORS `*` en `/api/*`** combinado con API key expuesta en `NEXT_PUBLIC_TPV_API_KEY` (visible en bundle del navegador).
8. **`/api/reset-orders` hace `DROP TABLE IF EXISTS orders` + `CREATE`** — destructivo, sin confirmación, sin auth adicional.
9. **`/api/verifactu/regenerate` hace `DELETE FROM verifactu_registros`** y regenera toda la cadena — destructivo, sin soft delete ni backup previo.
10. **`/api/verifactu/delete-test`** borrado por patrón `sale_id LIKE 'test-%'` — puede borrar registros legítimos si el ID empieza por 'test-'.

**Code smells:**
1. **`closures/route.js`** llama `runMigrations()` en cada request (GET y POST) — overhead innecesario, ya debería estar migrado al arrancar.
2. **`lib/realtime.js`** es singleton global → no funciona bien en serverless (cada cold start pierde el canal). `broadcastFloorUpdateServer` abre/cierra conexión por llamada.
3. **`lib/thermal-printer.js`** usa `new TextEncoder('windows-1252')` que lanza TypeError en producción (sólo UTF8 soportado).
4. **Patrón "delete-all + reinsert"** en `combos/PUT`, `meal-menus/PUT`, `offers/PUT`, `modifiers/PUT`, `price-rules/PUT` — no transaccional (no usa `sql.transaction`), si falla a mitad quedan datos inconsistentes.
5. **`floor/route.js` PATCH** no valida body con Zod (sólo PUT lo hace).
6. **`lib/migrate.js`** tiene 1557 líneas monolíticas sin tests, sin versionado de migraciones, sin rollback. Las conversiones de PK compuesta pueden fallar silenciosamente.
7. **Mix de `lib/tenant.js` y `lib/tenant.ts`** — archivos duplicados (JS y TS) con la misma API. El TS tiene tipos pero ambos exportan `getTenantId`/`withTenant`/`DEFAULT_TENANT`.
8. **`payments/route.js`** re-implementa `getTenantId` localmente en lugar de importar de `lib/tenant`.
9. **`__tests__/terminal-connection-token.test.js`** mockea `stripe` y `db` — si la implementación real cambia, el test no lo detecta.
10. **Falta de índices** en tablas grandes: `sales.closed_at`, `clockin_logs.employee_id+clockin_date`, `stock_log.product_id+created_at`, `verifactu_registros.sale_id` (ya tiene UNIQUE implícito). Algunos sí existen (`idx_closures_date`, `idx_batches_*`, `idx_shifts_*`).
11. **`/api/backup`** vuelca sólo 16 tablas, mientras que `/api/backup-cron` vuelca 50+ — inconsistencia.
12. **`sales/route.js` POST** calcula `ticket_number` con `SELECT MAX(ticket_number)+1` — race condition si dos ventas se cierran concurrentemente.
13. **`lib/migrate.js:1307`** hace `ALTER TABLE settings DROP CONSTRAINT settings_pkey` sin IF EXISTS — falla si la constraint no existe (envuelto en try/catch, pero ruidoso).
14. **`buffet/route.js` POST** tiene 10 acciones en un solo handler de 350 líneas — difícil de mantener, sin tests.
15. **`gestoria/route.js`** calcula modelos fiscales (303, 130, 111, 115, 349, 347, 390, 190, 180) con simplificaciones hardcodeadas (ej: `salesVat = salesTotal * 0.21` aunque el IGIC real es 7%) — los resultados no son precisos para presentación real.

**Puntos fuertes:**
1. **Migraciones idempotentes** que no rompen BDs existentes (CREATE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS).
2. **Webhook Stripe** con idempotencia real vía tabla `webhook_events` (INSERT ON CONFLICT DO UPDATE + status processing/processed/failed).
3. **Reconciliación Stripe** muy completa (huérfanos, descuadres, devoluciones no registradas, chargebacks, ventas no en Stripe).
4. **`payment_logs`** audit trail detallado de todas las operaciones de pago.
5. **Sistema de buffet** robusto: sesiones, rondas, cooldowns, overrides por sesión, desperdicios, pausa global, batch close, integración con TPV orders y KDS.
6. **Cadena Verifactu** bien pensada: `fecha_hora_firma` persistida explícitamente, backfill de registros viejos, retry de simulados, regeneración completa, verify que recalcula hash con datos persistidos.
7. **Sesiones de empleado** con detección de logines duplicados y keepalive.
8. **Esquemas Zod** en gestoría y floor con tests de validación.
9. **Offline cache + mutation queue** elegante con fallback transparente.
10. **Diff de floor** en `lib/api.js` (`computeFloorDiff`) que decide entre PUT completo o PATCH parcial para optimizar bandwidth.
11. **Multi-tenant en las tablas core** con PK compuesta (tenant_id, id) para soportar `ON CONFLICT` correcto.

**Oportunidades de mejora:**
1. **Migrar a sistema de migraciones versionado** (ej: drizzle-kit, prisma migrate, o un tabla `_migrations` con timestamps) en lugar del monolito idempotente.
2. **Hash PINs con bcrypt** y nunca devolverlos en `GET /api/employees`.
3. **Implementar RBAC server-side:** middleware que lea `x-employee-id` + `x-device-id` + valide sesión activa en `sessions` + rol permitido para la ruta.
4. **Parameterizar SQL dinámico** en sales/payments/catalog en lugar de `sql.unsafe` con strings interpolados.
5. **Añadir rate limiting** a rutas críticas (login, verify-pin, qr-order, webhooks).
6. **Verificación HMAC** en webhooks Glovo/UberEats (usar `glovoWebhookSecret`/`ubereatsWebhookSecret` ya en settings).
7. **Extender `tenant_id`** a TODAS las rutas que aún no lo filtran (verifactu, stripe webhook, reservations, waitlist, qr-order, buffet, delivery, gestoria, albaranes, productions, etc.).
8. **Hacer `combos/PUT`, `meal-menus/PUT`, etc. transaccionales** con `sql.transaction`.
9. **Arreglar `TextEncoder('windows-1252')`** en thermal-printer (usar `TextEncoder` sin args + manejar CP1252 manualmente, o usar `iconv-lite`).
10. **Añadir tests** para `lib/migrate.js`, rutas API críticas (sales, verifactu, stripe webhook), multi-tenant isolation, idempotencia.
11. **Índices faltantes** en `sales(closed_at)`, `clockin_logs(employee_id, clockin_date)`, `stock_log(product_id, created_at)`.
12. **Usar `SELECT ... FOR UPDATE` o secuencias** para `ticket_number` en lugar de `MAX+1`.
13. **Reemplazar el script `dev` Windows-only** (`set NODE_OPTIONS=...`) por cross-env o un script portable.
14. **Añadir envs de Stripe/Fiskaly/Supabase/SMTP** a `docker-compose.yml` para que el contenedor sea funcional sin edits manuales.
15. **Documentar el modelo de datos** con un diagrama ER (actualmente sólo legible desde `migrate.js`).

**Siguiente acción recomendada:** el reporte completo se entrega en la respuesta al usuario. Otros agentes deberían priorizar: (a) **arreglar SQL injection en sales/payments/catalog** (crítico), (b) **hash PINs**, (c) **añadir RBAC server-side**, (d) **extender tenant_id a todas las rutas**, (e) **añadir tests de migraciones y rutas críticas**.

---
Task ID: 3-4-5
Agent: Main agent (Super Z)
Task: Consolidar hallazgos, generar informe tecnico .docx y entregar al usuario

Work Log:
- Cargados los 4 reportes de exploracion de subagentes (1-a, 1-b, 1-c, 1-d)
- Cargado el skill docx y leidos los archivos referenciados (routes/create.md, references/design-system.md, references/common-rules.md, references/docx-js-core.md, scenes/report.md)
- Establecido outline de 12 secciones (Portada, TOC, Resumen Ejecutivo, Vision General, Arquitectura, Frontend Web, Backend API+DB, Movil, Integraciones, Diagnostico, Conclusiones, Apendices)
- Escrito generador docx modular: generate_informe.js (helpers + cover R1 + TOC), content_part1.js, content_part2.js, content_part3.js, content_part4.js, run_informe.js
- Ejecutado generador: 84 KB iniciales, 96 headings, 1177 parrafos
- Corrido postcheck.py: 1 error TOC (TOC_OUTLINE_MISSING)
- Corrido add_toc_placeholders.py --auto: 96 headings extraidos, 96 bookmarks anadidos, outlineLvl fijado en headings 1-6, updateFields=true en settings.xml
- Corrido postcheck.py de nuevo: 0 errores, 2 warnings menores (line-spacing esperado por headings, Consolas font fallback benigno)
- Documento final: 90.6 KB, formato Microsoft Word 2007+

Stage Summary:
- Deliverable: /home/z/my-project/download/Informe_Tecnico_TPV_La_Comanda.docx
- 12 secciones, 96 headings (H1-H3), 7 tablas de datos, 1 diagrama textual
- Cobertura end-to-end: POS web, API+DB, app movil, integraciones de terceros
- Hallazgos criticos documentados: SQL injection en 3 rutas, PINs en claro, sin RBAC server-side, webhooks sin HMAC, multi-tenant incompleto, TextEncoder bug, etc.
- 35 recomendaciones priorizadas en 4 horizontes (inmediato, corto plazo, medio plazo, estrategico)
- Apendices con tabla de 53 archivos y sus lineas, 27 variables de entorno, glosario de 20 terminos
- Idioma: espanol (consistente con preferencia del usuario)
