import { NextRequest } from 'next/server';
import { and, eq, sql, not, inArray } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { employees } from '../../../db/schema';
import { apiOk, apiError, apiBadRequest, apiNotFound } from '../../../lib/infrastructure/response';
import { requireRole } from '../../../lib/rbac';
import { rateLimit, getClientIp, getBlockMillis, setBlock } from '../../../lib/rate-limit';
import { withIdempotency } from '../../../lib/idempotency';
import { signLoginTicket } from '../../../lib/auth/jwt';
import { EmployeePostBody, EmployeePutBody } from '@/lib/schemas/api-schemas';

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

const VERIFY_MAX_FAILURES = 4;
const VERIFY_LOCK_MS = 5 * 60 * 1000;

function formatLockout(ms: number): string {
  const s = Math.max(1, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export async function GET(req: NextRequest) {
  const rl = await rateLimit(`employees:list:${getClientIp(req)}`, 30, 60_000);
  if (!rl.allowed) return apiError(new Error('Demasiadas solicitudes'), 429);
  const auth = await requireRole(['admin', 'camarero', 'cocina'])(req);
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);

    // Pagination params
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)));
    const offset = (page - 1) * pageSize;

    // Total count for pagination metadata
    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(employees)
      .where(eq(employees.tenantId, tenantId));

    const rows = await db.select().from(employees)
      .where(eq(employees.tenantId, tenantId))
      .limit(pageSize)
      .offset(offset);

    if (!auth.authorized) {
      return apiOk({
        data: rows.map((r) => ({
          id: r.id, name: r.name, role: r.role, hasPin: !!r.pinHash,
        })),
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize), hasNext: page < Math.ceil(total / pageSize), hasPrev: page > 1 }
      });
    }
    return apiOk({
      data: rows.map((r) => ({
        id: r.id, name: r.name, role: r.role,
        personalDiscountEnabled: r.personalDiscountEnabled,
        monthlyLimit: Number(r.monthlyLimit || 0),
        monthlyUsed: Number(r.monthlyUsed || 0),
        monthlyUsedMonth: r.monthlyUsedMonth,
        position: r.position, workType: r.workType,
        workPct: Number(r.workPct || 100), dni: r.dni,
        notes: r.notes, whatsappCode: r.whatsappCode,
        whatsappLinked: r.whatsappLinked, createdAt: r.createdAt,
        hasPin: !!r.pinHash,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize), hasNext: page < Math.ceil(total / pageSize), hasPrev: page > 1 }
    });
  } catch (err) { return apiError(err); }
}

export async function PUT(req: NextRequest) {
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  return withIdempotency(req, '/api/employees', async () => {
    try {
      const db = getDb();
      const parsed = EmployeePutBody.safeParse(await req.json());
      if (!parsed.success) return apiBadRequest(parsed.error.message);
      const emps = parsed.data;
      const tenantId = getTenantId(req);
      const ids = emps.map((e) => e.id);
      await db.transaction(async (tx) => {
        for (const e of emps) {
          await tx.insert(employees).values({
            tenantId, id: e.id, name: e.name, pin: '',
            pinHash: e.pin ? bcrypt.hashSync(sha256(e.pin), 10) : (e.pinHash || ''),
            role: e.role || 'camarero', position: e.position || '',
            workType: e.workType || '', workPct: String(e.workPct ?? 100), dni: e.dni || '',
            notes: e.notes || '',
            personalDiscountEnabled: e.personalDiscountEnabled || false,
            monthlyLimit: String(e.monthlyLimit ?? 0), monthlyUsed: String(e.monthlyUsed ?? 0),
            monthlyUsedMonth: e.monthlyUsedMonth || '',
            whatsappCode: e.whatsappCode || '', whatsappLinked: e.whatsappLinked || false,
            createdAt: e.createdAt || Date.now(),
          }).onConflictDoUpdate({
            target: [employees.id, employees.tenantId],
            set: {
              name: sql`EXCLUDED.name`, pin: sql`''`, pinHash: sql`EXCLUDED.pin_hash`,
              role: sql`EXCLUDED.role`, position: sql`EXCLUDED.position`,
              workType: sql`EXCLUDED.work_type`, workPct: sql`EXCLUDED.work_pct`,
              dni: sql`EXCLUDED.dni`, notes: sql`EXCLUDED.notes`,
              personalDiscountEnabled: sql`EXCLUDED.personal_discount_enabled`,
              monthlyLimit: sql`EXCLUDED.monthly_limit`,
              monthlyUsed: sql`EXCLUDED.monthly_used`,
              monthlyUsedMonth: sql`EXCLUDED.monthly_used_month`,
              whatsappCode: sql`EXCLUDED.whatsapp_code`,
              whatsappLinked: sql`EXCLUDED.whatsapp_linked`,
            },
          });
        }
        if (ids.length > 0) {
          await tx.delete(employees)
            .where(and(eq(employees.tenantId, tenantId), not(inArray(employees.id, ids))));
        }
      });
      return apiOk();
    } catch (err) { return apiError(err); }
  });
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const parsed = EmployeePostBody.safeParse(await req.json());
    if (!parsed.success) return apiBadRequest(parsed.error.message);
    const body = parsed.data;
    const { action } = body;
    const tenantId = getTenantId(req);

    if (action === 'generate-codes') {
      const auth = await requireRole(['admin'])(req);
      if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
      const emps = await db.select({ id: employees.id, name: employees.name })
        .from(employees)
        .where(and(eq(employees.tenantId, tenantId), eq(employees.whatsappLinked, false)));
      const codes = emps.map((e) => {
        const code = Math.random().toString(36).slice(2, 8).toUpperCase();
        return { employeeId: e.id, name: e.name, code };
      });
      for (const c of codes) {
        await db.update(employees)
          .set({ whatsappCode: c.code })
          .where(and(eq(employees.id, c.employeeId), eq(employees.tenantId, tenantId)));
      }
      return apiOk({ ok: true, codes });
    }

    if (action === 'verify') {
      const ip = getClientIp(req);
      // Bloqueo server-side: persistente y no reiniciable borrando el storage del
      // cliente (la app móvil solo muestra el contador; la autoridad es el server).
      const blockMs = await getBlockMillis(`verify-block:${ip}`);
      if (blockMs > 0) {
        return apiError(new Error(`Demasiados intentos fallidos. Prueba en ${formatLockout(blockMs)}`), 429);
      }
      const burst = await rateLimit(`verify:${ip}`, 10, 60_000);
      if (!burst.allowed) return apiError(new Error('Demasiados intentos'), 429);
      const pin = typeof body.pin === 'string' ? body.pin : undefined;
      const pinHash = typeof body.pinHash === 'string' ? body.pinHash : undefined;
      if (!pin && !pinHash) return apiBadRequest('PIN requerido');
      const emps = await db.select().from(employees)
        .where(eq(employees.tenantId, tenantId));
      const emp = emps.find((r) => {
        const ph = r.pinHash ?? '';
        if (!ph) return false;
        if (pin && bcrypt.compareSync(pin, ph)) return true;
        if (pinHash && bcrypt.compareSync(pinHash, ph)) return true;
        if (pin) {
          const hash = createHash('sha256').update(pin, 'utf8').digest('hex');
          if (bcrypt.compareSync(hash, ph)) return true;
        }
        return false;
      });
      if (!emp) {
        const fail = await rateLimit(`verify-fail:${ip}`, VERIFY_MAX_FAILURES, VERIFY_LOCK_MS);
        if (!fail.allowed) await setBlock(`verify-block:${ip}`, VERIFY_LOCK_MS);
        return apiError(new Error('PIN invalido'), 401);
      }
      const deviceId = typeof body.deviceId === 'string' ? body.deviceId : undefined;
      const loginTicket = await signLoginTicket({ sub: emp.id, tenantId, deviceId });
      return apiOk({
        id: emp.id, name: emp.name, role: emp.role,
        personalDiscountEnabled: emp.personalDiscountEnabled,
        monthlyLimit: Number(emp.monthlyLimit || 0),
        monthlyUsed: Number(emp.monthlyUsed || 0),
        monthlyUsedMonth: emp.monthlyUsedMonth,
        loginTicket,
      });
    }

    if (action === 'link-whatsapp') {
      const code = typeof body.code === 'string' ? body.code : '';
      const [emp] = await db.select({ id: employees.id, name: employees.name })
        .from(employees)
        .where(and(eq(employees.tenantId, tenantId), eq(employees.whatsappCode, code)));
      if (!emp) return apiNotFound('Codigo invalido');
      await db.update(employees)
        .set({ whatsappLinked: true, whatsappCode: '' })
        .where(and(eq(employees.id, emp.id), eq(employees.tenantId, tenantId)));
      return apiOk({ ok: true, employeeId: emp.id, employeeName: emp.name });
    }

    return apiBadRequest('unknown action');
  } catch (err) { return apiError(err); }
}
