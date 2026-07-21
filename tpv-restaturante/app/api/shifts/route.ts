import { NextRequest } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { employeeShifts } from '../../../db/schema';
import { apiOk, apiError, apiBadRequest, apiNotFound, apiUnauthorized, apiServerError } from '../../../lib/infrastructure/response';

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const objectives = searchParams.get('objectives') === 'true';
    const db = getDb();

    if (objectives) {
      const result = await db.execute(sql`SELECT * FROM shift_objectives WHERE tenant_id = ${tenantId} ORDER BY day_of_week, start_time`);
      return apiOk((result as any).rows);
    }

    let conditions = [eq(employeeShifts.tenantId, tenantId)];
    if (employeeId) conditions.push(eq(employeeShifts.employeeId, employeeId));
    if (from) conditions.push(sql`${employeeShifts.date} >= ${from}`);
    if (to) conditions.push(sql`${employeeShifts.date} <= ${to}`);

    const rows = await db.select().from(employeeShifts)
      .where(and(...conditions))
      .orderBy(employeeShifts.date, employeeShifts.startTime);

    return apiOk(rows.map(r => ({
      id: r.id, employeeId: r.employeeId, employeeName: r.employeeName,
      date: r.date, startTime: r.startTime, endTime: r.endTime,
      position: r.position, notes: r.notes, color: r.color,
      createdAt: r.createdAt,
    })));
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const body = await req.json() as any;
    const { action } = body;
    const db = getDb();

    if (action === 'copy-week') {
      const { fromWeekStart, toWeekStart } = body;
      const fromEnd = new Date(new Date(fromWeekStart).getTime() + 6 * 86400000).toISOString().slice(0, 10);
      const toEnd = new Date(new Date(toWeekStart).getTime() + 6 * 86400000).toISOString().slice(0, 10);

      await db.delete(employeeShifts)
        .where(and(
          sql`${employeeShifts.date} >= ${toWeekStart}`,
          sql`${employeeShifts.date} <= ${toEnd}`,
          eq(employeeShifts.tenantId, tenantId),
        ));

      const sourceShifts = await db.select().from(employeeShifts)
        .where(and(
          sql`${employeeShifts.date} >= ${fromWeekStart}`,
          sql`${employeeShifts.date} <= ${fromEnd}`,
          eq(employeeShifts.tenantId, tenantId),
        ));

      for (const s of sourceShifts) {
        const daysDiff = Math.round(
          (new Date(s.date).getTime() - new Date(fromWeekStart).getTime()) / 86400000
        );
        const targetDate = new Date(new Date(toWeekStart).getTime() + daysDiff * 86400000)
          .toISOString().slice(0, 10);

        await db.insert(employeeShifts).values({
          id: 'shift_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          employeeId: s.employeeId, employeeName: s.employeeName, date: targetDate,
          startTime: s.startTime, endTime: s.endTime, position: s.position,
          notes: s.notes, color: s.color, createdAt: Date.now(), tenantId,
        });
      }

      return apiOk({ ok: true, count: sourceShifts.length });
    }

    if (action === 'save-objective') {
      const { dayOfWeek, startTime, endTime, position, minPeople, maxPeople, id } = body;
      if (id) {
        await db.execute(sql`UPDATE shift_objectives SET day_of_week=${dayOfWeek}, start_time=${startTime}, end_time=${endTime}, position=${position}, min_people=${minPeople}, max_people=${maxPeople} WHERE id=${id} AND tenant_id = ${tenantId}`);
      } else {
        await db.execute(sql`INSERT INTO shift_objectives (day_of_week, start_time, end_time, position, min_people, max_people, tenant_id) VALUES (${dayOfWeek}, ${startTime}, ${endTime}, ${position}, ${minPeople}, ${maxPeople}, ${tenantId})`);
      }
      return apiOk();
    }

    if (action === 'delete-objective') {
      await db.execute(sql`DELETE FROM shift_objectives WHERE id=${body.id} AND tenant_id = ${tenantId}`);
      return apiOk();
    }

    const { id, employeeId, employeeName, date, startTime, endTime, position, notes, color } = body;
    if (id) {
      await db.update(employeeShifts).set({
        employeeId, employeeName, date, startTime, endTime, position, notes, color,
      }).where(and(eq(employeeShifts.id, id), eq(employeeShifts.tenantId, tenantId)));
    } else {
      await db.insert(employeeShifts).values({
        id: 'shift_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        employeeId, employeeName, date, startTime, endTime,
        position, notes, color, createdAt: Date.now(), tenantId,
      });
    }
    return apiOk();
  } catch (err) { return apiError(err); }
}

export async function DELETE(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const { id } = await req.json() as any;
    const db = getDb();
    await db.delete(employeeShifts)
      .where(and(eq(employeeShifts.id, id), eq(employeeShifts.tenantId, tenantId)));
    return apiOk();
  } catch (err) { return apiError(err); }
}
