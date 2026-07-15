import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { sql } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await sql`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
