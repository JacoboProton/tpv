tpv-restaturante
├── AGENTS.md
├── CLAUDE.md
├── README.md
├── __tests__
│   └── constants.test.js
├── app
│   ├── api
│   │   ├── access-logs
│   │   │   └── route.js
│   │   ├── add-stock
│   │   │   └── route.js
│   │   ├── albaranes
│   │   │   └── route.js
│   │   ├── auto-order-settings
│   │   │   └── route.js
│   │   ├── backup
│   │   ├── backup-cron
│   │   │   ├── route.js
│   │   │   └── route.js
│   │   ├── buffet
│   │   │   └── route.js
│   │   ├── cancelled
│   │   │   └── route.js
│   │   ├── catalog
│   │   │   ├── csv
│   │   │   │   └── route.js
│   │   │   └── route.js
│   │   ├── clockin
│   │   ├── clockin-corrections
│   │   │   ├── route.js
│   │   │   └── route.js
│   │   ├── combos
│   │   │   └── route.js
│   │   ├── debug
│   │   │   └── route.js
│   │   ├── delivery
│   │   ├── delivery-zones
│   │   │   ├── route.js
│   │   │   ├── orders
│   │   │   │   └── route.js
│   │   │   ├── runners
│   │   │   │   └── route.js
│   │   │   └── tracking
│   │   │       └── route.js
│   │   ├── employees
│   │   │   └── route.js
│   │   ├── export
│   │   │   └── sales
│   │   │       └── route.js
│   │   ├── floor
│   │   │   └── route.js
│   │   ├── food-cost
│   │   │   └── route.js
│   │   ├── gestoria
│   │   │   └── route.js
│   │   ├── kds
│   │   │   ├── audit
│   │   │   │   └── route.js
│   │   │   └── route.js
│   │   ├── meal-menus
│   │   │   └── route.js
│   │   ├── migrate
│   │   │   └── route.js
│   │   ├── modifiers
│   │   │   └── route.js
│   │   ├── move-stock
│   │   │   └── route.js
│   │   ├── offers
│   │   │   └── route.js
│   │   ├── price-rules
│   │   │   └── route.js
│   │   ├── production
│   │   │   └── route.js
│   │   ├── purchase-orders
│   │   │   └── route.js
│   │   ├── qr
│   │   ├── qr-calls
│   │   │   └── route.js
│   │   ├── qr-order
│   │   │   ├── route.js
│   │   │   └── route.js
│   │   ├── recipes
│   │   │   └── route.js
│   │   ├── reservations
│   │   │   └── route.js
│   │   ├── reset-orders
│   │   │   └── route.js
│   │   ├── sales
│   │   │   ├── refund
│   │   │   │   └── route.js
│   │   │   └── route.js
│   │   ├── seed-products
│   │   │   └── route.js
│   │   ├── settings
│   │   │   └── route.js
│   │   ├── shifts
│   │   │   └── route.js
│   │   ├── split-stock
│   │   │   └── route.js
│   │   ├── stock-log
│   │   │   └── route.js
│   │   ├── stripe
│   │   │   └── payment-intent
│   │   │       └── route.js
│   │   ├── supplier-catalog
│   │   │   └── route.js
│   │   ├── supplier-price-history
│   │   │   └── route.js
│   │   ├── suppliers
│   │   │   └── route.js
│   │   ├── time-off-requests
│   │   │   └── route.js
│   │   ├── turns
│   │   │   └── route.js
│   │   ├── upload
│   │   │   └── route.js
│   │   ├── verifactu
│   │   │   ├── delete-test
│   │   │   │   └── route.js
│   │   │   ├── route.js
│   │   │   ├── setup
│   │   │   │   └── route.js
│   │   │   └── verify
│   │   │       └── route.js
│   │   └── waitlist
│   │       └── route.js
│   ├── buffet
│   │   └── tv
│   │       └── page.jsx
│   ├── favicon.ico
│   ├── fichar
│   │   ├── [employeeId]
│   │   │   └── page.jsx
│   │   └── page.jsx
│   ├── globals.css
│   ├── kds
│   │   ├── page.jsx
│   │   └── pair
│   │       └── page.jsx
│   ├── layout.tsx
│   ├── manifest.json
│   ├── menu
│   │   ├── layout.jsx
│   │   └── page.jsx
│   ├── middleware.js
│   ├── page.jsx
│   ├── pedir
│   │   ├── page.jsx
│   │   └── track
│   │       └── [orderId]
│   │           └── page.jsx
│   ├── qr
│   │   └── [tableId]
│   │       ├── order
│   │       │   └── [orderId]
│   │       │       └── page.jsx
│   │       └── page.jsx
│   ├── robots.ts
│   ├── sitemap.ts
│   └── waitlist
│       └── page.jsx
├── components
│   ├── AlbaranesView.jsx
│   ├── AlmacenDetalleView.jsx
│   ├── AlmacenMenuView.jsx
│   ├── AuditView.jsx
│   ├── BuffetKioskView.jsx
│   ├── CarruselPanel.jsx
│   ├── CartasView.jsx
│   ├── CocinaView.jsx
│   ├── ComandaDrawer.jsx
│   ├── ComandasAbiertasView.jsx
│   ├── ComboSlotSelector.jsx
│   ├── CombosPanel.jsx
│   ├── CommandPalette.jsx
│   ├── DeliveryView.jsx
│   ├── EmpleadosView.jsx
│   ├── ErrorBoundary.tsx
│   ├── FloorEditor.jsx
│   ├── FoodCostView.jsx
│   ├── GestoriaView.jsx
│   ├── InformesView.jsx
│   ├── InventarioView.jsx
│   ├── KDSView.jsx
│   ├── LoginScreen.jsx
│   ├── MenuDelDiaSelector.jsx
│   ├── MenuPrincipal.jsx
│   ├── MenusDelDiaPanel.jsx
│   ├── ModifierSelector.jsx
│   ├── OfertasPanel.jsx
│   ├── OnlineOrdersView.jsx
│   ├── PairingPanel.jsx
│   ├── PaymentModal.jsx
│   ├── PedidosCompraView.jsx
│   ├── PedidosView.jsx
│   ├── PreciosPanel.jsx
│   ├── ProduccionView.jsx
│   ├── QRCodeModal.jsx
│   ├── RegistroHorarioView.jsx
│   ├── ReservaSettingsView.jsx
│   ├── ReservasView.jsx
│   ├── SalonView.jsx
│   ├── SolicitudesView.jsx
│   ├── StripeModal.jsx
│   ├── StripePaymentForm.jsx
│   ├── TicketThermal.jsx
│   ├── TurnosView.jsx
│   ├── VerifactuBadge.jsx
│   ├── VerifactuPanel.jsx
│   ├── WaitlistView.jsx
│   └── constants.js
├── eslint.config.mjs
├── lib
│   ├── api.js
│   ├── db.js
│   ├── fiskaly.js
│   ├── migrate.js
│   ├── modifiers.js
│   ├── offline.js
│   ├── sound.js
│   ├── thermal-printer.js
│   └── verifactu.js
├── next-env.d.ts
├── next.config.ts

├── public
│   ├── file.svg
│   ├── globe.svg
│   ├── icon-192.svg
│   ├── icon-512.svg
│   ├── next.svg
│   ├── sw.js
│   ├── uploads
│   │   ├── agua.webp
│   │   ├── arroz-negro.svg
│   │   ├── cafe-con-leche.svg
│   │   ├── cafe-solo.svg
│   │   ├── calamares.webp
│   │   ├── caña.webp
│   │   ├── cerveza-botellin.svg
│   │   ├── copa-vino.webp
│   │   ├── crema-catalana.svg
│   │   ├── croquetas.webp
│   │   ├── ensaladilla-rusa.svg
│   │   ├── entrecot.webp
│   │   ├── flan.webp
│   │   ├── gambas-ajillo.svg
│   │   ├── hamburgesa.webp
│   │   ├── helado-vainilla.svg
│   │   ├── jamon-iberico.webp
│   │   ├── lasana.svg
│   │   ├── merluza-plancha.svg
│   │   ├── paella-racion.webp
│   │   ├── patatas-bravas.webp
│   │   ├── pimientos-de padron.webp
│   │   ├── pollo-asado.svg
│   │   ├── pulpo-gallega.svg
│   │   ├── refresco.webp
│   │   ├── tarta-queso.webp
│   │   ├── tinto-verano.webp
│   │   ├── tortilla-patatas.svg
│   │   ├── vermut.webp
│   │   └── zumo-naranja.svg
│   ├── vercel.svg
│   └── window.svg
├── tmp
├── tsconfig.json
├── vercel.json
└── vitest.config.ts# La Comanda — TPV Restaurante

Sistema de TPV profesional para bares y restaurantes con facturación electrónica (Verifactu AEAT), adaptado a Canarias (IGIC 7%).

## Stack

- **Next.js 16** (App Router, Turbopack)
- **PostgreSQL Neon** (serverless)
- **React 19**, Tailwind 4, Recharts
- **Fiskaly SIGN ES** (Verifactu REST API sin SDK)
- **Stripe** (pagos con tarjeta)
- **ESC/POS** (impresión térmica 80mm + WebUSB)

## Funcionalidades

| Área | Descripción |
|---|---|
| **Salón** | Mesas/barra/para llevar/domicilio, comandas por cursos, modificadores |
| **Cocina** | Vista de tickets pendientes agrupados por curso, temporizador, urgencia |
| **TPV** | División de cuenta por artículos, propinas, descuentos, múltiples métodos |
| **Verifactu** | Facturación electrónica AEAT con cadena de huellas SHA-256, QR validable |
| **Offline** | Cache en localStorage, cola de mutaciones, sincronización automática |
| **Impresión** | Ticket térmico vía `window.print()` + WebUSB ESC/POS directo, apertura cajón |
| **Inventario** | Control de stock por ubicación (Bar, Cocina, Almacén), alertas stock bajo |
| **Informes** | Extracto anual, desglose mensual, top productos, exportación CSV |
| **Turnos** | Control de entrada/salida de empleados |
| **Temas** | Claro/oscuro |

## Requisitos

- Node.js 20+
- Cuenta Neon (PostgreSQL serverless)
- Cuenta Fiskaly (modo test o live)
- Cuenta Stripe (opcional, solo para pagos con tarjeta)

## Configuración

```bash
cp .env.example .env.local
# Editar .env.local con tus credenciales
npm install
npm run dev
```

Las migraciones de base de datos se ejecutan automáticamente al iniciar la app. Si es la primera vez, se crean las tablas y se insertan datos de ejemplo (16 productos, 12 mesas, 3 empleados).

## Variables de entorno

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Conexión PostgreSQL (Neon) |
| `FISKALY_ENVIRONMENT` | `TEST` o `LIVE` |
| `FISKALY_API_KEY` | API key de Fiskaly |
| `FISKALY_API_SECRET` | API secret de Fiskaly |
| `FISKALY_TAXPAYER_NIF` | NIF del contribuyente |
| `FISKALY_TERRITORY` | `CANARY_ISLANDS` (por defecto) |
| `STRIPE_SECRET_KEY` | Secret key de Stripe |
| `TPV_API_KEY` | Clave para proteger las rutas `/api/*` |
| `NEXT_PUBLIC_TPV_API_KEY` | Misma clave, expuesta al cliente |

## Imágenes de productos

Cada producto puede tener una foto. Para añadirla:

1. Ve a **Inventario** en la app
2. Pasa el ratón sobre el icono de producto y haz clic en el botón 📷
3. Selecciona una imagen (JPG, PNG, WebP, GIF o SVG, máx 2MB)
4. La imagen se sube a `public/uploads/` y se asigna al producto

También se pueden asignar imágenes por API incluyendo el campo `image` (URL o data URL) en `PUT /api/catalog`.

## Estructura

```
app/
  page.jsx                # Página principal (orquestación)
  layout.tsx              # Layout raíz con fuentes
  middleware.js           # Protección de APIs con API key
  globals.css             # Estilos globales
  api/                    # 15 endpoints REST
components/
  SalonView, CocinaView, ComandaDrawer, PaymentModal, ...
  constants.js            # Temas, seed data, utilidades
lib/
  db.js                   # Conexión Neon
  api.js                  # Cliente HTTP con cache offline
  migrate.js              # Migraciones SQL
  fiskaly.js              # API REST Fiskaly (sin SDK)
  verifactu.js            # Generación XML + cadena SHA-256
  thermal-printer.js      # ESC/POS encoder + WebUSB
  offline.js              # Cache + cola mutaciones
  modifiers.js            # Seed de grupos y opciones
__tests__/
  constants.test.js       # Tests unitarios
```

## Desarrollo

```bash
npm run dev        # Servidor de desarrollo (puerto 3000)
npm run build      # Build producción
npm run lint       # ESLint
npm run test       # Vitest
```

## Verifactu (AEAT)

Implementación directa contra la API REST de Fiskaly (sin SDK):

1. Registro automático de cada venta como invoice
2. Cadena de huellas SHA-256 encadenando registros
3. Número de serie `VERI-YYYY-NNNNNN` con reset anual
4. QR que la AEAT valida (HTTP 200)
5. Certificado FNMT-RCM embebido

En modo test: estado `ISSUED` con `PENDING` de transmisión.

## Offline

- Cache persistente en `localStorage` con prefijo `tpv:cache:`
- Las lecturas (`GET`) caen a cache si no hay red
- Las escrituras (`PUT/POST`) se encolan si no hay red
- Reintento cada 10s + al reconectar
- Barra roja con contador de mutaciones pendientes

## Licencia

Uso interno.
