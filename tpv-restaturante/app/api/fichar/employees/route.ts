import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '../../../../lib/drizzle';
import { getTenantId } from '../../../../lib/tenant';
import { employees } from '../../../../db/schema';
import { apiOk, apiError } from '../../../../lib/infrastructure/response';

// SIN requireRole — endpoint público del kiosco de fichaje.
// Devuelve SOLO id/name/position (lo que el kiosco necesita para
// seleccionar empleado). NO expone roles, pinHash, sueldos ni datos
// sensibles. El rate limit global del proxy aplica igualmente.
export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const db = getDb();
    const rows = await db.select({
      id: employees.id, name: employees.name, position: employees.position,
    }).from(employees).where(eq(employees.tenantId, tenantId));
    return apiOk(rows.map((r) => ({
      id: r.id, name: r.name, position: r.position || '',
    })));
  } catch (err) { return apiError(err); }
}
