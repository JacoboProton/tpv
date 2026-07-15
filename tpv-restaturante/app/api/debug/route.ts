import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';

export async function GET() {
  try {
    const db = getDb();
    const result = await db.execute(sql`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('categories','products','tables','orders','sales','employees','access_logs')
      ORDER BY table_name, ordinal_position
    `);
    const rows = (result as any).rows;
    const byTable: Record<string, any> = {};
    for (const r of rows) {
      if (!byTable[r.table_name]) byTable[r.table_name] = [];
      byTable[r.table_name].push(`${r.column_name} (${r.data_type})`);
    }
    return NextResponse.json(byTable);
  } catch (err: any) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
