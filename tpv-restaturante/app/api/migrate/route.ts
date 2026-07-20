import { NextResponse } from 'next/server';
import { runPendingMigrations } from '../../../lib/run-migrations';

export async function POST() {
  try {
    await runPendingMigrations();
    return NextResponse.json({ ok: true, message: 'Migraciones ejecutadas correctamente' });
  } catch (err) {
    console.error('Error en migración:', err);
    const msg = (err as Error).message;
    const cause = (err as Error).cause;
    return NextResponse.json({ ok: false, error: cause ? `${msg}: ${cause}` : msg }, { status: 500 });
  }
}
