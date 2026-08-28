import 'dotenv/config';
import { Client } from 'pg';

// Reset determinístico del estado de las mesas para la suite E2E.
// Los runs interrumpidos pueden dejar las mesas en 'ocupada', lo que hace
// que no aparezca el botón "Usar" (solo se muestra en mesas libres) y
// rompe el flujo completo desde la primera interacción.
export default async function globalSetup() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn('E2E: DATABASE_URL no definido, se omite reset de mesas.');
    return;
  }
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    const res = await client.query(
      "UPDATE tables SET status='libre', order_id=null, reserved='null'::jsonb, order_ids='[]'::jsonb, reserved_for=null, is_fiado=false"
    );
    console.log(`E2E: mesas reiniciadas a 'libre' (${res.rowCount})`);
  } catch (e) {
    console.warn('E2E: no se pudo resetear las mesas:', (e as Error)?.message);
  } finally {
    await client.end().catch(() => {});
  }
}
