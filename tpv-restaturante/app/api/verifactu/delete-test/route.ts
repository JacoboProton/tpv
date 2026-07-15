import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { getTenantId } from '../../../../lib/tenant';
import { requireAdminPin } from '../../../../lib/rbac';

// DELETE /api/verifactu/delete-test
// Borra todos los registros de prueba (sale_id empieza por 'test-' seguido de UUID)
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const adminCheck = await requireAdminPin(req, body.adminPin);
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const tenantId = getTenantId(req);

    // Backup before deleting
    const toDelete = await sql`
      SELECT * FROM verifactu_registros
      WHERE sale_id LIKE 'test-%-%' AND tenant_id = ${tenantId}
    `;
    if (toDelete.length > 0) {
      const backupId = 'backup_verifactu_test_' + Date.now();
      await sql`
        INSERT INTO backups (id, data, created_at)
        VALUES (${backupId}, ${JSON.stringify(toDelete)}, ${Date.now()})
        ON CONFLICT (id) DO NOTHING
      `;
    }

    const deleted = await sql`
      DELETE FROM verifactu_registros
      WHERE sale_id LIKE 'test-%-%' AND tenant_id = ${tenantId}
      RETURNING id, sale_id, num_serie
    `;
    return NextResponse.json({ ok: true, deleted: deleted.length });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
