# Demo TPV para el hostelero — guía de presentación (10–15 min)

Esta guía es para **la persona que presenta** la demo. Asume que el TPV ya está
desplegado en una URL pública (Render) con datos de ejemplo sembrados al
arrancar. No requiere tocar infraestructura durante la presentación.

## Antes de empezar

- Comprueba que la URL responde en un navegador: `<https://tu-dominio.onrender.com>`.
- Ten a mano el PIN de administrador: **1234**.
- Abre una pestaña de incógnito (o un navegador limpio) para que no haya sesión previa.
- El TPV se abre como **salón**: sin login muestra el menú principal con los
  empleados sembrados. No hay que "instalar" nada en el equipo del cliente: todo
  va por navegador.

## Guion (mínimo viable, 10–15 min)

1. **"Esto es un restaurante entero en un enlace."**
   Abre la URL. Nada que instalar: se abre en cualquier móvil, tablet o PC con navegador.

2. **Salón (sin login).**
   Muestra el plano con las mesas sembradas (9 mesas, 6 barras, 4 de reparto).
   Toca una mesa: se abre la comanda.

3. **La carta (sin login).**
   Abre la carta / menú: categorías (Bebidas, Tapas…), productos, precios.
   Comenta que cada producto puede tener alergenos, curso (primero/segundo/postre),
   y mostrador/impresora.

4. **Login con PIN.**
   Vuelve al menú, elige **Administrador** y pulsa el PIN **1234**.
   (Los camareros de ejemplo: Ana `1111`, Luis `2222`.)

5. **Cerrar una comanda y cobrar.**
   Con sesión abierta, abre una mesa, añade asientos/productos, marca servidos,
   y llega a la cuenta. Puedes enseñar el modo pago: efectivo, TPV/Stripe
   (si se ha configurado la clave de Stripe), o fiado.

6. **Otras vistas que existen** (mencionar, no es necesario recorrerlas todas):
   - Cocina / KDS (comandas en pantalla).
   - Pedidos online (`/pedir`) y menú QR por mesa (`/qr/t1`).
   - Reservas (`/reservar`).
   - Gestión (informes, stock, turnos, albaranes).

7. **Cierre honesto.**
   - Esto es una **demo con datos de ejemplo**, no producción.
   - Al abrirse con una BD vacía, el sistema se siembra solo: empleados,
     carta, salón y la API de tarjeta de la web (`pos`).
   - Pagos con tarjeta (Stripe), facturación Verifactu (Fiskaly) y sincronización
     con la app móvil (Supabase) están **desactivados** en la demo salvo que se
     configuren sus claves: no hagas creer al cliente que ya cobra con tarjeta.

## PINs de la demo

| Empleado       | Rol       | PIN   |
| -------------- | --------- | ----- |
| Administrador  | admin     | 1234  |
| Ana            | camarero  | 1111  |
| Luis           | camarero  | 2222  |

## Rutas útiles

| Ruta                     | Qué es                              |
| ------------------------ | ----------------------------------- |
| `/` → redirige a `/salon`| El TPV completo (entrada principal) |
| `/salon`                 | Plano de mesas                      |
| `/carta`                 | Gestión de carta                    |
| `/kds` o `/cocina-kds`   | Pantalla de cocina                  |
| `/pedir`                 | Pedidos online (cliente final)      |
| `/qr/t1`                 | Menú QR de la mesa 1                |
| `/reservar`              | Reservas online                     |
| `/api/health`            | Comprobación de salud (interno)     |

## Lo que NO debes mostrar en la demo

- Cualquier terminal / sesión de administración de infraestructura.
- Los secretos del entorno (JWT_SECRET, CRON_SECRET, TPV_API_KEY…).
- La pantalla de errores técnica si algo falla: pasa de largo con naturalidad.

## Si algo falla durante la demo

- Recarga la página (F5). La app es tolerante a caídas y cachea en localStorage.
- Si "no hay mesas" o "no hay carta": la BD estaba vacía y el seed no llegó a
  ejecutarse. Eso se resuelve **desde el arranque**, no en la demo: consulta la
  lógica de `scripts/docker-entrypoint.sh` / `render.yaml` y redeploya.
- Si el login devuelve "PIN inválido": el seed de empleados no se aplicó o se
  colisionó con un seed previo del cliente. Idem, revisar el arranque.