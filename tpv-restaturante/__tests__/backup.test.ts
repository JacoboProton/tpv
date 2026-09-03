import { describe, it, expect, vi, beforeEach } from 'vitest';

const executedSql: unknown[] = [];

vi.mock('@/lib/drizzle', () => ({
  getDb: () => ({
    execute: (q: unknown) => {
      executedSql.push(q);
      return Promise.resolve({ rows: [] });
    },
  }),
}));

import { backupAll } from '../lib/backup';

beforeEach(() => {
  executedSql.length = 0;
});

function sqlText(q: unknown): string {
  const anyQ = q as { queryChunks?: unknown[] };
  const chunks = anyQ.queryChunks ?? [];
  return chunks
    .map((c) => (c && typeof c === 'object' ? JSON.stringify(c) : String(c)))
    .join('');
}

describe('lib/backup backupAll(tenantId)', () => {
  it('filtra las tablas con tenant_id por el tenant pasado', async () => {
    await backupAll('tenant-A');

    const statements = executedSql.map(sqlText);

    for (const identidad of ['sales', 'orders', 'products', 'employees', 'categories']) {
      const stmt = statements.find((s) => s.includes(`FROM ${identidad} `));
      expect(stmt, `${identidad} debería incluirse en el backup`).toBeDefined();
      expect(stmt!.toLowerCase()).toContain('where tenant_id =');
    }
  });

  it('incluye la tabla de backups filtrada por tenant', async () => {
    await backupAll('tenant-B');
    const stmt = sqlText(executedSql.find((q) => sqlText(q).includes('FROM backups')) as unknown);
    expect(stmt.toLowerCase()).toContain('where tenant_id =');
  });

  it('incluye la fila del tenant en la tabla tenants', async () => {
    await backupAll('tenant-C');
    const stmt = sqlText(executedSql.find((q) => sqlText(q).includes('FROM tenants')) as unknown);
    expect(stmt.toLowerCase()).toContain('where id =');
  });

  it('no filtra las tablas singletons/globales sin tenant_id', async () => {
    await backupAll('tenant-D');
    const stmt = sqlText(executedSql.find((q) => sqlText(q).includes('FROM fiskaly_config')) as unknown);
    expect(stmt.toLowerCase()).toContain('from fiskaly_config');
    expect(stmt.toLowerCase()).not.toContain('where tenant_id');
  });
});
