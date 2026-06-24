import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

// GET /api/employees → Employee[]
export async function GET() {
  try {
    const rows = await sql`SELECT id, name, pin, role FROM employees ORDER BY role DESC, name`;
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/employees → body: Employee[]  (reemplaza todos)
export async function PUT(req) {
  try {
    const employees = await req.json();
    // Upsert todos
    for (const e of employees) {
      await sql`
        INSERT INTO employees (id, name, pin, role)
        VALUES (${e.id}, ${e.name}, ${e.pin}, ${e.role})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          pin  = EXCLUDED.pin,
          role = EXCLUDED.role
      `;
    }
    // Borrar los que ya no están
    const ids = employees.map(e => e.id);
    if (ids.length > 0) {
      await sql`DELETE FROM employees WHERE id != ALL(${ids})`;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
