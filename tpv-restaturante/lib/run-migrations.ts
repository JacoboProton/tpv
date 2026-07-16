import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { getDb } from './drizzle';
import { join } from 'path';

const MIGRATIONS_DIR = join(__dirname, '..', 'db', 'migrations');

export async function runPendingMigrations() {
  const db = getDb();
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
}
