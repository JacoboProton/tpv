import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

// POST /api/reset-orders → elimina y recrea la tabla orders con el esquema correcto
export async function POST() {
  try {
    await sql`DROP TABLE IF EXISTS orders`;
    await sql`
      CREATE TABLE orders (
        id            TEXT   PRIMARY KEY,
        table_id      TEXT   NOT NULL,
        items         JSONB  NOT NULL DEFAULT '[]',
        created_at    BIGINT NOT NULL,
        employee_name TEXT
      )
    `;
    return NextResponse.json({ ok: true, message: 'Tabla orders recreada correctamente' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
