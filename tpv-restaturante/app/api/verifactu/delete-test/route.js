import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

// DELETE /api/verifactu/delete-test
// Borra todos los registros de prueba (sale_id empieza por 'test-')
export async function DELETE() {
  try {
    const deleted = await sql`
      DELETE FROM verifactu_registros
      WHERE sale_id LIKE 'test-%'
      RETURNING id, sale_id, num_serie
    `;
    return NextResponse.json({ ok: true, deleted });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
