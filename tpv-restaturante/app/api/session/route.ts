import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { sessions, employees, accessLogs } from '../../../db/schema';
import { apiOk, apiError, apiBadRequest } from '../../../lib/infrastructure/response';
import { requireRole } from '../../../lib/rbac';
import { rateLimit, getClientIp } from '../../../lib/rate-limit';
import { SessionBody } from '@/lib/schemas/api-schemas';
import { signSessionToken, cookieOptions, JWT_COOKIE } from '../../../lib/auth/jwt';

export async function POST(req: NextRequest) {
  try {
    const tid = getTenantId(req);
    const parsed = SessionBody.safeParse(await req.json());
    if (!parsed.success) return apiBadRequest(parsed.error.message);
    const body = parsed.data;
    const { action, employeeId, employeeRole, deviceId } = body;
    const db = getDb();

    if (action === 'login') {
      const rl = await rateLimit(`login:${getClientIp(req)}`, 10, 60_000);
      if (!rl.allowed) return apiError(new Error('Demasiados intentos'), 429);
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

      await markOpenAccessExits(db, tid, employeeId, deviceId);

      await db.insert(sessions).values({
        tenantId: tid, employeeId, deviceId, role: employeeRole ?? '',
        active: true, createdAt: now, lastSeen: now,
      }).onConflictDoUpdate({
        target: [sessions.tenantId, sessions.employeeId, sessions.deviceId],
        set: { active: true, lastSeen: now, role: employeeRole ?? '' },
      });

      await recordAccessLogin(db, tid, employeeId, employeeRole, deviceId, now);

      const token = await signSessionToken({
        sub: employeeId, role: employeeRole ?? '', tenantId: tid, deviceId,
      });
      const res = NextResponse.json({ ok: true, token });
      res.cookies.set(JWT_COOKIE, token, cookieOptions());
      return res;
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
      await markOpenAccessExits(db, tid, employeeId, deviceId);
      const res = NextResponse.json({ ok: true });
      res.cookies.set(JWT_COOKIE, '', { ...cookieOptions(), maxAge: 0 });
      return res;
    }

    if (action === 'keepalive') {
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

async function recordAccessLogin(db: ReturnType<typeof getDb>, tenantId: string, employeeId: string, employeeRole: string | undefined, deviceId: string, now: number) {
  try {
    const rows = await db.select({ name: employees.name }).from(employees)
      .where(eq(employees.id, employeeId)).limit(1);
    await db.insert(accessLogs).values({
      employeeId,
      employeeName: rows[0]?.name || employeeId,
      role: employeeRole ?? '',
      entryPoint: deviceId,
      deviceId,
      loggedAt: now,
      tenantId,
    });
  } catch (err) { console.error('Error registrando acceso:', err); }
}

async function markOpenAccessExits(db: ReturnType<typeof getDb>, tenantId: string, employeeId: string, deviceId: string) {
  try {
    await db.update(accessLogs).set({ exitAt: Date.now() })
      .where(and(
        eq(accessLogs.tenantId, tenantId),
        eq(accessLogs.employeeId, employeeId),
        eq(accessLogs.deviceId, deviceId),
        isNull(accessLogs.exitAt),
      ));
  } catch (err) { console.error('Error cerrando registro de acceso:', err); }
}
