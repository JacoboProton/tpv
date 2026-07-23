import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';

let _db: ReturnType<typeof drizzle> | undefined;

function buildConnectionString(): string {
  // Priority: DATABASE_URL_POOLER -> DATABASE_URL with replaced port -> DATABASE_URL
  const pooler = process.env.DATABASE_URL_POOLER;
  if (pooler) return pooler;
  const base = process.env.DATABASE_URL;
  if (!base) return '';
  try {
    const u = new URL(base);
    // If a POOLER_PORT is provided or common Supabase pooler port exists, prefer it
    const poolerPort = process.env.DB_POOLER_PORT || '6543';
    // Replace only if original port is 5432 or not set
    if (!u.port || u.port === '5432') u.port = poolerPort;
    return u.toString();
  } catch (err) {
    return base; // fallback to original
  }
}

export function getDb() {
  if (_db) return _db;

  const connectionString = buildConnectionString();
  if (!connectionString) {
    throw new Error('DATABASE_URL (or DATABASE_URL_POOLER) is not defined');
  }

  // Reuse global pool/drizzle instances in serverless environments
  const globalAny: any = globalThis as any;
  if (globalAny.__drizzleDb) return globalAny.__drizzleDb;

  const pool = globalAny.__pgPool || new Pool({
    connectionString,
    max: Number(process.env.DB_POOL_MAX || process.env.PGPOOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_MS || 10000),
    connectionTimeoutMillis: Number(process.env.DB_CONN_TIMEOUT_MS || 5000),
  });

  globalAny.__pgPool = pool;
  const db = drizzle(pool, { schema });
  globalAny.__drizzleDb = db;
  _db = db;
  return db;
}
