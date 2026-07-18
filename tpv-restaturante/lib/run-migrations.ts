import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { getDb } from './drizzle';
import { join } from 'path';
import { existsSync } from 'fs';

let MIGRATIONS_DIR: string;
try {
  MIGRATIONS_DIR = join(process.cwd(), 'db', 'migrations');
} catch {
  MIGRATIONS_DIR = join(__dirname, '..', 'db', 'migrations');
}

function isAlreadyExistsError(err: unknown): boolean {
  const e = err as { code?: string; message?: string; cause?: { code?: string; message?: string } };
  const code = e?.code || e?.cause?.code;
  const message = e?.message || e?.cause?.message || '';
  return code === '42710' || code === '42P07' || /already exists/i.test(message);
}

export async function runPendingMigrations() {
  if (!existsSync(MIGRATIONS_DIR)) return;
  const db = getDb();
  try {
    await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  } catch (err) {
    if (isAlreadyExistsError(err)) {
      console.warn('Migración omitida: objeto ya existente en la base de datos.', (err as Error).message);
      return;
    }
    throw err;
  }
}
