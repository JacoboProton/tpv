import { NextRequest } from 'next/server';
import { eq, and, sql, desc } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { clockinLogs, clockinCorrections, employees } from '../../../db/schema';
import { apiOk, apiError, apiBadRequest, apiForbidden } from '../../../lib/infrastructure/response';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (from || to) {
      const conditions: ReturnType<typeof eq>[] = [eq(clockinLogs.tenantId, tenantId)];
      if (employeeId) conditions.push(eq(clockinLogs.employeeId, employeeId));
      if (from) conditions.push(sql`${clockinLogs.clockinDate} >= ${from}`);
      if (to) conditions.push(sql`${clockinLogs.clockinDate} <= ${to}`);

      const rows = await db.select().from(clockinLogs)
        .where(and(...conditions))
        .orderBy(desc(clockinLogs.createdAt))
        .limit(2000);
      return apiOk(rows);
    }

    if (!employeeId) return apiBadRequest('employeeId required');

    const rows = await db.select().from(clockinLogs)
      .where(and(eq(clockinLogs.employeeId, employeeId), eq(clockinLogs.clockinDate, date), eq(clockinLogs.tenantId, tenantId)))
      .orderBy(clockinLogs.createdAt);

    let entrada: typeof rows[0] | null = null;
    let salida: typeof rows[0] | null = null;
    const pausas: any[] = [];
    let totalMinutes = 0;
    let effectiveMinutes = 0;
    let lastPausaStart: any = null;

    for (const r of rows) {
      if (r.action === 'entrada') entrada = r;
      else if (r.action === 'salida') salida = r;
      else if (r.action === 'pausa') { lastPausaStart = r; pausas.push(r); }
      else if (r.action === 'vuelta' && lastPausaStart) {
        pausas[pausas.length - 1] = { ...pausas[pausas.length - 1], vuelta: r };
        lastPausaStart = null;
      }
    }

    if (entrada) {
      const end: any = salida ? new Date(Number(salida.createdAt)) : new Date();
      const start: any = new Date(Number(entrada.createdAt));
      totalMinutes = Math.round((end - start) / 60000);
      let pauseMinutes = 0;
      pausas.forEach(p => {
        if (p.vuelta) pauseMinutes += (Number(p.vuelta.createdAt) - Number(p.createdAt)) / 60000;
      });
      effectiveMinutes = totalMinutes - pauseMinutes;
    }

    const lastAction = rows.length > 0 ? rows[rows.length - 1].action : null;

    return apiOk({
      logs: rows,
      summary: {
        entrada: entrada ? Number(entrada.createdAt) : null,
        salida: salida ? Number(salida.createdAt) : null,
        pausas: pausas.map(p => ({
          start: Number(p.createdAt),
          end: p.vuelta ? Number(p.vuelta.createdAt) : null,
        })),
        totalMinutes: Math.round(totalMinutes),
        effectiveMinutes: Math.round(effectiveMinutes),
        pauseMinutes: Math.round(totalMinutes - effectiveMinutes),
        lastAction,
        isActive: !!entrada && !salida,
        isOnPause: lastAction === 'pausa',
        edited: rows.some(r => r.edited),
      },
    });
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const body = await req.json() as any;
    const today = new Date().toISOString().slice(0, 10);

    if (body.pin) {
      const [emp] = await db.select({ id: employees.id }).from(employees)
        .where(and(eq(employees.id, body.employeeId), eq(employees.pin, body.pin), eq(employees.tenantId, tenantId)));
      if (!emp) return apiForbidden('PIN incorrecto');
    }

    let action = body.action;
    if (!action) {
      const [last] = await db.select({ action: clockinLogs.action }).from(clockinLogs)
        .where(and(eq(clockinLogs.employeeId, body.employeeId), eq(clockinLogs.clockinDate, today), eq(clockinLogs.tenantId, tenantId)))
        .orderBy(desc(clockinLogs.createdAt)).limit(1);
      if (!last) action = 'entrada';
      else if (last.action === 'entrada') action = 'salida';
      else if (last.action === 'pausa') action = 'vuelta';
      else action = 'entrada';
    }

    await db.insert(clockinLogs).values({
      employeeId: body.employeeId, employeeName: body.employeeName || '',
      action, method: body.method || 'tpc', clockinDate: today,
      createdAt: Date.now(), tenantId,
    });

    return apiOk({ ok: true, action });
  } catch (err) { return apiError(err); }
}

export async function PUT(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const body = await req.json() as any;
    const { action: putAction } = body;

    if (putAction === 'edit-record') {
      const { id, createdAt, recordAction: newAction } = body;
      await db.update(clockinLogs).set({
        createdAt, action: newAction,
        edited: true, editedBy: body.editedBy || '', editReason: body.editReason || '',
      }).where(eq(clockinLogs.id, id));
      return apiOk();
    }

    if (putAction === 'close-open') {
      const { date: closeDate, defaultEndTime, editedBy } = body;
      const targetDate = closeDate || new Date().toISOString().slice(0, 10);
      const endTime = defaultEndTime || '23:59';

      const openLogs = (await db.execute(sql`
        SELECT DISTINCT employee_id, employee_name FROM clockin_logs
        WHERE clockin_date = ${targetDate} AND action = 'entrada' AND tenant_id = ${tenantId}
        AND employee_id NOT IN (
          SELECT employee_id FROM clockin_logs
          WHERE clockin_date = ${targetDate} AND action = 'salida' AND tenant_id = ${tenantId}
        )
      `)) as unknown as { employee_id: string; employee_name: string }[];

      const [h, m] = (endTime as string).split(':').map(Number);
      const closeAt = new Date(targetDate + 'T' + endTime);
      for (const emp of openLogs) {
        const e = emp as unknown as { employee_id: string; employee_name: string };
        await db.insert(clockinLogs).values({
          employeeId: e.employee_id, employeeName: e.employee_name,
          action: 'salida', method: 'auto', clockinDate: targetDate,
          createdAt: closeAt.getTime(), edited: true,
          editedBy: editedBy || '', editReason: 'Cierre automático — entrada sin salida',
          tenantId,
        });
      }

      return apiOk({ ok: true, closedCount: openLogs.length });
    }

    if (putAction === 'correction-request') {
      const { id, employeeId, employeeName, requestedAction, reason } = body;
      await db.insert(clockinCorrections).values({
        clockinId: id || 0, employeeId, employeeName: employeeName || '',
        requestedAction: requestedAction || '', reason: reason || '',
        status: 'pending', createdAt: Date.now(),
      });
      return apiOk();
    }

    if (putAction === 'resolve-correction') {
      const { correctionId, status, resolvedBy } = body;
      await db.update(clockinCorrections)
        .set({ status, resolvedBy: resolvedBy || '' })
        .where(eq(clockinCorrections.id, correctionId));
      return apiOk();
    }

    return apiBadRequest('Unknown action');
  } catch (err) { return apiError(err); }
}