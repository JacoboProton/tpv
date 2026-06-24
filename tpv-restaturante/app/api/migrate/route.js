import { NextResponse } from 'next/server';
import { runMigrations } from '../../../lib/migrate';

export async function POST() {
  try {
    await runMigrations();
    return NextResponse.json({ ok: true, message: 'Migraciones ejecutadas correctamente' });
  } catch (err) {
    console.error('Error en migración:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
