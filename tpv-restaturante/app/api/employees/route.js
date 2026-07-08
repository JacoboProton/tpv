import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';

export async function GET(req) {
  try {
    const tenantId = getTenantId(req);
    const rows = await sql`
      SELECT * FROM employees WHERE tenant_id = ${tenantId} ORDER BY role DESC, name
    `;
    return NextResponse.json(rows.map(r => ({
      id: r.id, name: r.name, pin: r.pin, role: r.role,
      personalDiscountEnabled: r.personal_discount_enabled,
      monthlyLimit: Number(r.monthly_limit || 0),
      monthlyUsed: Number(r.monthly_used || 0),
      monthlyUsedMonth: r.monthly_used_month,
      position: r.position, workType: r.work_type,
      workPct: Number(r.work_pct || 100), dni: r.dni,
      notes: r.notes, whatsappCode: r.whatsapp_code,
      whatsappLinked: r.whatsapp_linked, createdAt: r.created_at,
    })));
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const employees = await req.json();
    const tenantId = getTenantId(req);
    const queries = [];
    for (const e of employees) {
      queries.push(sql`
        INSERT INTO employees (tenant_id, id, name, pin, role, position, work_type, work_pct, dni, notes,
          personal_discount_enabled, monthly_limit, monthly_used, monthly_used_month,
          whatsapp_code, whatsapp_linked, created_at)
        VALUES (${tenantId}, ${e.id}, ${e.name}, ${e.pin || ''}, ${e.role || 'camarero'}, ${e.position || ''},
          ${e.workType || ''}, ${e.workPct || 100}, ${e.dni || ''}, ${e.notes || ''},
          ${e.personalDiscountEnabled || false}, ${e.monthlyLimit || 0}, ${e.monthlyUsed || 0},
          ${e.monthlyUsedMonth || ''}, ${e.whatsappCode || ''}, ${e.whatsappLinked || false},
          ${e.createdAt || Date.now()})
        ON CONFLICT (id) DO UPDATE SET
          tenant_id = EXCLUDED.tenant_id,
          name = EXCLUDED.name, pin = EXCLUDED.pin, role = EXCLUDED.role,
          position = EXCLUDED.position, work_type = EXCLUDED.work_type,
          work_pct = EXCLUDED.work_pct, dni = EXCLUDED.dni, notes = EXCLUDED.notes,
          personal_discount_enabled = EXCLUDED.personal_discount_enabled,
          monthly_limit = EXCLUDED.monthly_limit, monthly_used = EXCLUDED.monthly_used,
          monthly_used_month = EXCLUDED.monthly_used_month,
          whatsapp_code = EXCLUDED.whatsapp_code, whatsapp_linked = EXCLUDED.whatsapp_linked
      `);
    }
    const ids = employees.map(e => e.id);
    if (ids.length > 0) {
      queries.push(sql`DELETE FROM employees WHERE tenant_id = ${tenantId} AND id != ALL(${ids})`);
    }
    if (queries.length > 0) {
      await sql.transaction(queries);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action } = body;
    const tenantId = getTenantId(req);

    if (action === 'generate-codes') {
      const employees = await sql`
        SELECT id, name FROM employees WHERE tenant_id = ${tenantId} AND whatsapp_linked = false
      `;
      const codes = employees.map(e => {
        const code = Math.random().toString(36).slice(2, 8).toUpperCase();
        return { employeeId: e.id, name: e.name, code };
      });
      for (const c of codes) {
        await sql`UPDATE employees SET whatsapp_code = ${c.code} WHERE id = ${c.employeeId} AND tenant_id = ${tenantId}`;
      }
      return NextResponse.json({ ok: true, codes });
    }

    if (action === 'verify') {
      const { pin } = body;
      if (!pin) return NextResponse.json({ error: 'PIN requerido' }, { status: 400 });
      const emp = await sql`
        SELECT * FROM employees WHERE tenant_id = ${tenantId} AND pin = ${pin}
      `;
      if (emp.length === 0) return NextResponse.json({ error: 'PIN inválido' }, { status: 401 });
      const r = emp[0];
      return NextResponse.json({
        id: r.id, name: r.name, pin: r.pin, role: r.role,
        personalDiscountEnabled: r.personal_discount_enabled,
        monthlyLimit: Number(r.monthly_limit || 0),
        monthlyUsed: Number(r.monthly_used || 0),
        monthlyUsedMonth: r.monthly_used_month,
      });
    }

    if (action === 'link-whatsapp') {
      const { code, phone } = body;
      const emp = await sql`
        SELECT id, name FROM employees WHERE tenant_id = ${tenantId} AND whatsapp_code = ${code}
      `;
      if (emp.length === 0) return NextResponse.json({ error: 'Código inválido' }, { status: 404 });
      await sql`
        UPDATE employees SET whatsapp_linked = true, whatsapp_code = '' WHERE id = ${emp[0].id} AND tenant_id = ${tenantId}
      `;
      return NextResponse.json({ ok: true, employeeId: emp[0].id, employeeName: emp[0].name });
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
