import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { sessions } from '../../../db/schema';

export async function POST(req: NextRequest) {
  try {
    const tid = getTenantId(req);
    const body = await req.json() as any;
    const { action, employeeId, employeeRole, deviceId } = body;
    const db = getDb();

    if (action === 'login') {
      if (!employeeId || !deviceId) {
        return NextResponse.json({ error: 'employeeId y deviceId requeridos' }, { status: 400 });
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
        return NextResponse.json({
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

      return NextResponse.json({ ok: true });
    }

    if (action === 'logout') {
      if (!employeeId || !deviceId) {
        return NextResponse.json({ error: 'employeeId y deviceId requeridos' }, { status: 400 });
      }
      await db.update(sessions).set({ active: false })
        .where(and(
          eq(sessions.tenantId, tid),
          eq(sessions.employeeId, employeeId),
          eq(sessions.deviceId, deviceId),
        ));
      return NextResponse.json({ ok: true });
    }

    if (action === 'keepalive') {
      if (!employeeId || !deviceId) {
        return NextResponse.json({ error: 'employeeId y deviceId requeridos' }, { status: 400 });
      }
      const session = await db.select({ active: sessions.active }).from(sessions)
        .where(and(
          eq(sessions.tenantId, tid),
          eq(sessions.employeeId, employeeId),
          eq(sessions.deviceId, deviceId),
        ));
      if (session.length === 0 || !session[0].active) {
        return NextResponse.json({ invalidated: true, message: 'Sesión cerrada en otro terminal' });
      }
      await db.update(sessions).set({ lastSeen: Date.now() })
        .where(and(
          eq(sessions.tenantId, tid),
          eq(sessions.employeeId, employeeId),
          eq(sessions.deviceId, deviceId),
        ));
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (err) {
    const msg = (err as Error).message;
    const cause = (err as Error).cause;
    return NextResponse.json({ error: cause ? `${msg}: ${cause}` : msg }, { status: 500 });
  }
}
