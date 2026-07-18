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

export async function runPendingMigrations() {
  if (!existsSync(MIGRATIONS_DIR)) return;
  const db = getDb();
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
}
