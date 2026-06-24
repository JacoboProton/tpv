import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

// POST /api/access-logs → registra una entrada
export async function POST(req) {
  try {
    const { employeeId, employeeName, role, entryPoint } = await req.json();
    await sql`
      INSERT INTO access_logs (employee_id, employee_name, role, entry_point, logged_at)
      VALUES (${employeeId}, ${employeeName}, ${role}, ${entryPoint}, ${Date.now()})
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error guardando registro de entrada:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/access-logs → devuelve los registros (más recientes primero)
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '200'), 500);

    const rows = await sql`
      SELECT id, employee_id AS "employeeId", employee_name AS "employeeName",
             role, entry_point AS "entryPoint", logged_at AS "loggedAt"
      FROM access_logs
      ORDER BY logged_at DESC
      LIMIT ${limit}
    `;
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
