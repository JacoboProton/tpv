import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';
import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';

function sha256(s) {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

export async function GET(req) {
  try {
    const tenantId = getTenantId(req);
    const rows = await sql`
      SELECT * FROM employees WHERE tenant_id = ${tenantId} ORDER BY role DESC, name
    `;
    return NextResponse.json(rows.map(r => ({
      id: r.id, name: r.name, role: r.role,
      personalDiscountEnabled: r.personal_discount_enabled,
      monthlyLimit: Number(r.monthly_limit || 0),
      monthlyUsed: Number(r.monthly_used || 0),
      monthlyUsedMonth: r.monthly_used_month,
      position: r.position, workType: r.work_type,
      workPct: Number(r.work_pct || 100), dni: r.dni,
      notes: r.notes, whatsappCode: r.whatsapp_code,
      whatsappLinked: r.whatsapp_linked, createdAt: r.created_at,
      hasPin: !!r.pin_hash,
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
        INSERT INTO employees (tenant_id, id, name, pin, pin_hash, role, position, work_type, work_pct, dni, notes,
          personal_discount_enabled, monthly_limit, monthly_used, monthly_used_month,
          whatsapp_code, whatsapp_linked, created_at)
        VALUES (${tenantId}, ${e.id}, ${e.name}, '', ${e.pin ? bcrypt.hashSync(sha256(e.pin), 10) : (e.pin_hash || '')}, ${e.role || 'camarero'}, ${e.position || ''},
          ${e.workType || ''}, ${e.workPct || 100}, ${e.dni || ''}, ${e.notes || ''},
          ${e.personalDiscountEnabled || false}, ${e.monthlyLimit || 0}, ${e.monthlyUsed || 0},
          ${e.monthlyUsedMonth || ''}, ${e.whatsappCode || ''}, ${e.whatsappLinked || false},
          ${e.createdAt || Date.now()})
        ON CONFLICT (id) DO UPDATE SET
          tenant_id = EXCLUDED.tenant_id,
          name = EXCLUDED.name, pin = '', pin_hash = EXCLUDED.pin_hash, role = EXCLUDED.role,
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
      const { pin, pinHash } = body;
      if (!pin && !pinHash) return NextResponse.json({ error: 'PIN requerido' }, { status: 400 });
      const emps = await sql`
        SELECT * FROM employees WHERE tenant_id = ${tenantId}
      `;
      const emp = emps.find(r => {
        if (pinHash && bcrypt.compareSync(pinHash, r.pin_hash)) return true;
        if (pin && bcrypt.compareSync(pin, r.pin_hash)) {
          // Legacy hash — migrate to new format (async, no await needed)
          const newHash = bcrypt.hashSync(sha256(pin), 10);
          sql`UPDATE employees SET pin_hash = ${newHash} WHERE id = ${r.id}`.catch(() => {});
          return true;
        }
        return false;
      });
      if (!emp) return NextResponse.json({ error: 'PIN inválido' }, { status: 401 });
      return NextResponse.json({
        id: emp.id, name: emp.name, role: emp.role,
        personalDiscountEnabled: emp.personal_discount_enabled,
        monthlyLimit: Number(emp.monthly_limit || 0),
        monthlyUsed: Number(emp.monthly_used || 0),
        monthlyUsedMonth: emp.monthly_used_month,
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
