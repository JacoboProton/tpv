import { NextRequest, NextResponse } from 'next/server';
import { and, eq, sql, not, inArray } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { employees } from '../../../db/schema';

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const rows = await db.select().from(employees)
      .where(eq(employees.tenantId, tenantId));
    return NextResponse.json(rows.map(r => ({
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
    })));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = getDb();
    const emps = await req.json() as any[];
    const tenantId = getTenantId(req);
    const ids = emps.map((e: any) => e.id);
    await db.transaction(async (tx) => {
      for (const e of emps) {
        await tx.insert(employees).values({
          tenantId, id: e.id, name: e.name, pin: '',
          pinHash: e.pin ? bcrypt.hashSync(sha256(e.pin), 10) : (e.pinHash || ''),
          role: e.role || 'camarero', position: e.position || '',
          workType: e.workType || '', workPct: e.workPct || 100, dni: e.dni || '',
          notes: e.notes || '',
          personalDiscountEnabled: e.personalDiscountEnabled || false,
          monthlyLimit: e.monthlyLimit || 0, monthlyUsed: e.monthlyUsed || 0,
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
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json() as any;
    const { action } = body;
    const tenantId = getTenantId(req);

    if (action === 'generate-codes') {
      const emps = await db.select({ id: employees.id, name: employees.name })
        .from(employees)
        .where(and(eq(employees.tenantId, tenantId), eq(employees.whatsappLinked, false)));
      const codes = emps.map(e => {
        const code = Math.random().toString(36).slice(2, 8).toUpperCase();
        return { employeeId: e.id, name: e.name, code };
      });
      for (const c of codes) {
        await db.update(employees)
          .set({ whatsappCode: c.code })
          .where(and(eq(employees.id, c.employeeId), eq(employees.tenantId, tenantId)));
      }
      return NextResponse.json({ ok: true, codes });
    }

    if (action === 'verify') {
      const { pin, pinHash } = body as Record<string, unknown>;
      if (!pin && !pinHash) return NextResponse.json({ error: 'PIN requerido' }, { status: 400 });
      const emps = await db.select().from(employees)
        .where(eq(employees.tenantId, tenantId));
      const emp = emps.find(r => {
        const ph = r.pinHash ?? '';
        if (pinHash && bcrypt.compareSync(pinHash as string, ph)) return true;
        if (pin && bcrypt.compareSync(pin as string, ph)) {
          const newHash = bcrypt.hashSync(sha256(pin as string), 10);
          db.update(employees).set({ pinHash: newHash })
            .where(eq(employees.id, r.id)).catch(() => {});
          return true;
        }
        return false;
      });
      if (!emp) return NextResponse.json({ error: 'PIN invalido' }, { status: 401 });
      return NextResponse.json({
        id: emp.id, name: emp.name, role: emp.role,
        personalDiscountEnabled: emp.personalDiscountEnabled,
        monthlyLimit: Number(emp.monthlyLimit || 0),
        monthlyUsed: Number(emp.monthlyUsed || 0),
        monthlyUsedMonth: emp.monthlyUsedMonth,
      });
    }

    if (action === 'link-whatsapp') {
      const { code } = body as Record<string, unknown>;
      const [emp] = await db.select({ id: employees.id, name: employees.name })
        .from(employees)
        .where(and(eq(employees.tenantId, tenantId), eq(employees.whatsappCode, code as string)));
      if (!emp) return NextResponse.json({ error: 'Codigo invalido' }, { status: 404 });
      await db.update(employees)
        .set({ whatsappLinked: true, whatsappCode: '' })
        .where(and(eq(employees.id, emp.id), eq(employees.tenantId, tenantId)));
      return NextResponse.json({ ok: true, employeeId: emp.id, employeeName: emp.name });
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
