import { Pool } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';

type Db = NodePgDatabase<typeof schema>;

declare global {
   
  var __drizzleDb: Db | undefined;
   
  var __pgPool: Pool | undefined;
}

let _db: Db | undefined;

function buildConnectionString(): string {
  // Priority: DATABASE_URL_POOLER -> DATABASE_URL with replaced port -> DATABASE_URL
  const pooler = process.env.DATABASE_URL_POOLER;
  if (pooler) return pooler;
  const base = process.env.DATABASE_URL;
  if (!base) return '';
  try {
    const u = new URL(base);
    // Port pooler solo se usa si DB_POOLER_PORT se define explicitamente
    // (p.ej. Supabase). Sin ella, respetamos DATABASE_URL tal cual
    // (clave para Docker local y Postgres gestionado de Render, puerto 5432).
    const poolerPort = process.env.DB_POOLER_PORT;
    if (poolerPort && (!u.port || u.port === '5432')) u.port = poolerPort;
    return u.toString();
  } catch (err) {
    return base; // fallback to original
  }
}

export function getDb(): Db {
  if (_db) return _db;

  const connectionString = buildConnectionString();
  if (!connectionString) {
    throw new Error('DATABASE_URL (or DATABASE_URL_POOLER) is not defined');
  }

  // Reuse global pool/drizzle instances in serverless environments
  if (globalThis.__drizzleDb) return globalThis.__drizzleDb;

  const pool = globalThis.__pgPool || new Pool({
    connectionString,
    max: Number(process.env.DB_POOL_MAX || process.env.PGPOOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_MS || 10000),
    connectionTimeoutMillis: Number(process.env.DB_CONN_TIMEOUT_MS || 5000),
  });

  globalThis.__pgPool = pool;
  const db = drizzle(pool, { schema });
  globalThis.__drizzleDb = db;
  _db = db;
  return db;
}
