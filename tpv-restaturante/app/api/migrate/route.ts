import { NextResponse } from 'next/server';
import { runPendingMigrations } from '../../../lib/run-migrations';

export async function POST() {
  try {
    await runPendingMigrations();
    return NextResponse.json({ ok: true, message: 'Migraciones ejecutadas correctamente' });
  } catch (err) {
    console.error('Error en migración:', err);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
