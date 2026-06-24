import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

// GET /api/debug → muestra las columnas de cada tabla en Neon
export async function GET() {
  try {
    const rows = await sql`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('categories','products','tables','orders','sales','employees','access_logs')
      ORDER BY table_name, ordinal_position
    `;

    const byTable = {};
    for (const r of rows) {
      if (!byTable[r.table_name]) byTable[r.table_name] = [];
      byTable[r.table_name].push(`${r.column_name} (${r.data_type})`);
    }

    return NextResponse.json(byTable);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
