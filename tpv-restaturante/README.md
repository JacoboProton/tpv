# La Comanda — TPV Restaurante

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
