import { NextRequest } from 'next/server';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { sessions } from '../../../db/schema';
import { apiOk, apiError, apiBadRequest } from '../../../lib/infrastructure/response';
import { requireRole } from '../../../lib/rbac';

export async function POST(req: NextRequest) {
  try {
    const tid = getTenantId(req);
    const body = await req.json() as any;
    const { action, employeeId, employeeRole, deviceId } = body;
    const db = getDb();

    if (action === 'login') {
      // Login doesn't require session validation (it creates the session)
      // But we validate the employee exists via PIN verification before reaching here
      if (!employeeId || !deviceId) {
        return apiBadRequest('employeeId y deviceId requeridos');
      }

      const existing = await db.select().from(sessions)
        .where(and(
          eq(sessions.tenantId, tid),
          eq(sessions.employeeId, employeeId),
          eq(sessions.active, true),
          sql`${sessions.deviceId} != ${deviceId}`,
        ))
        .orderBy(desc(sessions.lastSeen));

      if (existing.length > 0 && employeeRole !== 'admin' && !body.force) {
        return apiOk({
          conflict: true,
          existingDevice: existing[0].deviceId,
          existingSince: existing[0].createdAt,
          message: `El empleado ya está conectado en otro terminal`,
        });
      }

      await db.update(sessions).set({ active: false })
        .where(and(
          eq(sessions.tenantId, tid),
          eq(sessions.employeeId, employeeId),
          sql`${sessions.deviceId} != ${deviceId}`,
        ));

      const now = Date.now();
      await db.insert(sessions).values({
        tenantId: tid, employeeId, deviceId, role: employeeRole,
        active: true, createdAt: now, lastSeen: now,
      }).onConflictDoUpdate({
        target: [sessions.tenantId, sessions.employeeId, sessions.deviceId],
        set: { active: true, lastSeen: now, role: employeeRole },
      });

      return apiOk();
    }

    if (action === 'logout') {
      const auth = await requireRole(['admin', 'camarero', 'cocina'])(req);
      if (!auth.authorized) return apiError(new Error(auth.error), auth.status);

      if (!employeeId || !deviceId) {
        return apiBadRequest('employeeId y deviceId requeridos');
      }
      await db.update(sessions).set({ active: false })
        .where(and(
          eq(sessions.tenantId, tid),
          eq(sessions.employeeId, employeeId),
          eq(sessions.deviceId, deviceId),
        ));
      return apiOk();
    }

    if (action === 'keepalive') {
      const auth = await requireRole(['admin', 'camarero', 'cocina'])(req);
      if (!auth.authorized) return apiError(new Error(auth.error), auth.status);

      if (!employeeId || !deviceId) {
        return apiBadRequest('employeeId y deviceId requeridos');
      }
      const session = await db.select({ active: sessions.active }).from(sessions)
        .where(and(
          eq(sessions.tenantId, tid),
          eq(sessions.employeeId, employeeId),
          eq(sessions.deviceId, deviceId),
        ));
      if (session.length === 0 || !session[0].active) {
        return apiOk({ invalidated: true, message: 'Sesión cerrada en otro terminal' });
      }
      await db.update(sessions).set({ lastSeen: Date.now() })
        .where(and(
          eq(sessions.tenantId, tid),
          eq(sessions.employeeId, employeeId),
          eq(sessions.deviceId, deviceId),
        ));
      return apiOk();
    }

    return apiBadRequest('Acción no válida');
  } catch (err) { return apiError(err); }
}
