import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = (err as Error).message;
    const cause = (err as Error).cause;
    return NextResponse.json({ ok: false, error: cause ? `${msg}: ${cause}` : msg }, { status: 500 });
  }
}
