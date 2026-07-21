import { NextRequest } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '../../../../lib/drizzle';
import { getTenantId } from '../../../../lib/tenant';
import { requireAdminPin } from '../../../../lib/rbac';
import { verifactuRegistros } from '../../../../db/schema';
import { apiOk, apiError, apiUnauthorized } from '../../../../lib/infrastructure/response';

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const adminCheck = await requireAdminPin(req, body.adminPin);
    if (!adminCheck.authorized) {
      return apiUnauthorized(adminCheck.error);
    }

    const tenantId = getTenantId(req);
    const db = getDb();

    const toDelete = await db.select().from(verifactuRegistros)
      .where(and(
        sql`${verifactuRegistros.saleId} LIKE 'test-%-%'`,
        eq(verifactuRegistros.tenantId, tenantId),
      ));
    if (toDelete.length > 0) {
      const backupId = 'backup_verifactu_test_' + Date.now();
      await db.execute(sql`
        INSERT INTO backups (id, data, created_at)
        VALUES (${backupId}, ${JSON.stringify(toDelete)}, ${Date.now()})
        ON CONFLICT (id) DO NOTHING
      `);
    }

    const deleted = await db.delete(verifactuRegistros)
      .where(and(
        sql`${verifactuRegistros.saleId} LIKE 'test-%-%'`,
        eq(verifactuRegistros.tenantId, tenantId),
      )).returning({ id: verifactuRegistros.id, saleId: verifactuRegistros.saleId, numSerie: verifactuRegistros.numSerie });
    return apiOk({ deleted: deleted.length });
  } catch (err) { return apiError(err); }
}
