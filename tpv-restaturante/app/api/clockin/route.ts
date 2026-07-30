import { NextRequest } from 'next/server';
import { eq, and, sql, desc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { clockinLogs, clockinCorrections, employees } from '../../../db/schema';
import { apiOk, apiError, apiBadRequest, apiForbidden } from '../../../lib/infrastructure/response';
import { requireRole } from '../../../lib/rbac';
import { ClockinBody } from '@/lib/schemas/api-schemas';
import { z } from 'zod';
import { rateLimit, getClientIp } from '../../../lib/rate-limit';

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero', 'cocina'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
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
        edited: rows.some((r: any) => r.edited),
      },
    });
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero', 'cocina'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const rl = await rateLimit(`clockin:${getClientIp(req)}`, 20, 60_000);
    if (!rl.allowed) return apiError(new Error('Demasiados intentos'), 429);
    const db = getDb();
    const tenantId = getTenantId(req);
    const parsed = ClockinBody.extend({ action: z.string().min(1) }).safeParse(await req.json());
    if (!parsed.success) return apiBadRequest(parsed.error.message);
    const body = parsed.data;
    const today = new Date().toISOString().slice(0, 10);

    if (body.pin) {
      const [emp] = await db.select({ id: employees.id, pinHash: employees.pinHash }).from(employees)
        .where(and(eq(employees.id, body.employeeId ?? ''), eq(employees.tenantId, tenantId)));
      if (!emp || !emp.pinHash) return apiForbidden('PIN incorrecto');
      if (!bcrypt.compareSync(body.pin, emp.pinHash) && !bcrypt.compareSync(sha256(body.pin), emp.pinHash)) return apiForbidden('PIN incorrecto');
    }

    let action = body.action;
    if (!action) {
      const [last] = await db.select({ action: clockinLogs.action }).from(clockinLogs)
        .where(and(eq(clockinLogs.employeeId, body.employeeId ?? ''), eq(clockinLogs.clockinDate, today), eq(clockinLogs.tenantId, tenantId)))
        .orderBy(desc(clockinLogs.createdAt)).limit(1);
      if (!last) action = 'entrada';
      else if (last.action === 'entrada') action = 'salida';
      else if (last.action === 'pausa') action = 'vuelta';
      else action = 'entrada';
    }

    await db.insert(clockinLogs).values({
      employeeId: body.employeeId ?? '', employeeName: body.employeeName ?? '',
      action, method: body.method || 'tpc', clockinDate: today,
      createdAt: Date.now(), tenantId,
    });

    return apiOk({ ok: true, action });
  } catch (err) { return apiError(err); }
}

export async function PUT(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero', 'cocina'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const parsed = z.object({ action: z.string().min(1) }).passthrough().safeParse(await req.json());
    if (!parsed.success) return apiBadRequest(parsed.error.message);
    const body = parsed.data as Record<string, unknown>;
    const putAction = body.action as string;

    if (putAction === 'edit-record') {
      const recordAction = body.recordAction as string | undefined;
      const newAction = recordAction;
      const createdAt = Number(body.createdAt) || Date.now();
      const id = Number(body.id);
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
      const id = Number(body.id) || 0;
      const employeeId = String(body.employeeId ?? '');
      const employeeName = String(body.employeeName ?? '');
      const requestedAction = String(body.requestedAction ?? '');
      const reason = String(body.reason ?? '');
      await db.insert(clockinCorrections).values({
        clockinId: id, employeeId, employeeName,
        requestedAction, reason,
        status: 'pending', createdAt: Date.now(),
      });
      return apiOk();
    }

    if (putAction === 'resolve-correction') {
      const correctionId = Number(body.correctionId);
      const status = String(body.status ?? '');
      const resolvedBy = String(body.resolvedBy ?? '');
      await db.update(clockinCorrections)
        .set({ status, resolvedBy })
        .where(eq(clockinCorrections.id, correctionId));
      return apiOk();
    }

    return apiBadRequest('Unknown action');
  } catch (err) { return apiError(err); }
}