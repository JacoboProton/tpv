import { NextRequest } from 'next/server';
import { sql, eq } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { requireAdminPin } from '../../../lib/rbac';
import { rateLimit } from '../../../lib/rate-limit';
import { orders } from '../../../db/schema';
import { apiOk, apiError, apiBadRequest } from '../../../lib/infrastructure/response';
import { ResetOrdersBody } from '@/lib/schemas/api-schemas';

// SIN requireRole — usa requireAdminPin (autenticación por PIN de administrador)
// porque es una operación peligrosa (borra todos los pedidos activos) que debe
// confirmarse explícitamente con PIN, no solo con sesión. No la protege requireRole
// porque no hay sesión activa: la llama el dueño desde Gestoría → Ajustes.
export async function POST(req: NextRequest) {
  try {
    const parsed = ResetOrdersBody.safeParse(await req.json());
    if (!parsed.success) return apiBadRequest(parsed.error.message);
    const body = parsed.data;
    const tenantId = getTenantId(req);
    const rl = await rateLimit(`reset:${tenantId}`, 20, 60_000);
    if (!rl.allowed) return apiError(new Error('Demasiadas operaciones, intenta de nuevo en unos segundos'), 429);
    const adminCheck = await requireAdminPin(req, body.adminPin);
    if (!adminCheck.authorized) return apiError(new Error('Admin PIN no autorizado'), 403);
    const db = getDb();

    const backup = await db.select().from(orders).where(eq(orders.tenantId, tenantId));
    const backupId = 'backup_orders_' + Date.now();
    await db.execute(sql`
      INSERT INTO backups (id, data, created_at)
      VALUES (${backupId}, ${JSON.stringify(backup)}, ${Date.now()})
      ON CONFLICT (id) DO NOTHING
    `);

    await db.delete(orders).where(eq(orders.tenantId, tenantId));
    return apiOk({ message: `Órdenes del tenant ${tenantId} eliminadas`, backedUp: backup.length });
  } catch (err) { return apiError(err); }
}
