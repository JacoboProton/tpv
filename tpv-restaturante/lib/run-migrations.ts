import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { sql } from './db';

const MIGRATIONS_TABLE = '_drizzle_migrations';
const MIGRATIONS_DIR = join(__dirname, '..', 'db', 'migrations');

export async function runPendingMigrations() {
  await sql`
    CREATE TABLE IF NOT EXISTS ${sql.unsafe(MIGRATIONS_TABLE)} (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at BIGINT NOT NULL
    )
  `;

  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (file === '0000_serious_betty_ross.sql') continue;

    const existing = await sql`
      SELECT 1 FROM ${sql.unsafe(MIGRATIONS_TABLE)} WHERE name = ${file}
    `;
    if ((existing as any[]).length > 0) continue;

    const migrationSql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');

    try {
      await sql.unsafe(migrationSql);
      await sql`
        INSERT INTO ${sql.unsafe(MIGRATIONS_TABLE)} (name, applied_at)
        VALUES (${file}, ${Date.now()})
      `;
    } catch (err) {
      console.error(`Migration ${file} failed:`, (err as Error).message);
      throw err;
    }
  }
}
