import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/drizzle';

export async function GET() {
  const checks: Record<string, string> = {};
  let ok = true;

  try {
    const db = getDb();
    await db.execute('SELECT 1');
    checks.database = 'ok';
  } catch (e) {
    checks.database = (e as Error).message;
    ok = false;
  }

  return NextResponse.json({
    status: ok ? 'ok' : 'degraded',
    uptime: Math.floor(process.uptime()),
    timestamp: Date.now(),
    checks,
  }, { status: ok ? 200 : 503 });
}
