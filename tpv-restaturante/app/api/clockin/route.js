import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';

export async function GET(req) {
  try {
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Period query (for RegistroHorario)
    if (from || to) {
      let q = sql`SELECT * FROM clockin_logs WHERE tenant_id = ${tenantId}`;
      const conds = [];
      if (employeeId) conds.push(sql`employee_id = ${employeeId}`);
      if (from) conds.push(sql`clockin_date >= ${from}`);
      if (to) conds.push(sql`clockin_date <= ${to}`);
      if (conds.length > 0) q = sql`${q} AND ${conds.reduce((a, c) => sql`${a} AND ${c}`)}`;
      q = sql`${q} ORDER BY created_at DESC LIMIT 2000`;

      const rows = await q;
      return NextResponse.json(rows.map(r => ({
        id: r.id, employeeId: r.employee_id, employeeName: r.employee_name,
        action: r.action, method: r.method, clockinDate: r.clockin_date,
        createdAt: Number(r.created_at),
        edited: r.edited, editedBy: r.edited_by, editReason: r.edit_reason,
        signature: r.signature,
      })));
    }

    // Single employee/day (for Fichar page)
    if (!employeeId) return NextResponse.json({ error: 'employeeId required' }, { status: 400 });

    const rows = await sql`
      SELECT * FROM clockin_logs
      WHERE employee_id = ${employeeId} AND clockin_date = ${date} AND tenant_id = ${tenantId}
      ORDER BY created_at ASC
    `;

    let entrada = null;
    let salida = null;
    const pausas = [];
    let totalMinutes = 0;
    let effectiveMinutes = 0;
    let lastPausaStart = null;

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
      const end = salida ? new Date(Number(salida.created_at)) : new Date();
      const start = new Date(Number(entrada.created_at));
      totalMinutes = Math.round((end - start) / 60000);
      let pauseMinutes = 0;
      pausas.forEach(p => {
        if (p.vuelta) pauseMinutes += (Number(p.vuelta.created_at) - Number(p.created_at)) / 60000;
      });
      effectiveMinutes = totalMinutes - pauseMinutes;
    }

    const lastAction = rows.length > 0 ? rows[rows.length - 1].action : null;

    return NextResponse.json({
      logs: rows.map(r => ({
        id: r.id, employeeId: r.employee_id, employeeName: r.employee_name,
        action: r.action, method: r.method, clockinDate: r.clockin_date,
        createdAt: Number(r.created_at),
        edited: r.edited, editedBy: r.edited_by, editReason: r.edit_reason, signature: r.signature,
      })),
      summary: {
        entrada: entrada ? Number(entrada.created_at) : null,
        salida: salida ? Number(salida.created_at) : null,
        pausas: pausas.map(p => ({
          start: Number(p.created_at),
          end: p.vuelta ? Number(p.vuelta.created_at) : null,
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
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const tenantId = getTenantId(req);
    const body = await req.json();
    const today = new Date().toISOString().slice(0, 10);

    // Check PIN if provided
    if (body.pin) {
      const emp = await sql`SELECT id FROM employees WHERE id = ${body.employeeId} AND pin = ${body.pin} AND tenant_id = ${tenantId}`;
      if (emp.length === 0) return NextResponse.json({ error: 'PIN incorrecto' }, { status: 403 });
    }

    let action = body.action;
    if (!action) {
      const last = await sql`
        SELECT action FROM clockin_logs WHERE employee_id = ${body.employeeId} AND clockin_date = ${today} AND tenant_id = ${tenantId}
        ORDER BY created_at DESC LIMIT 1
      `;
      if (last.length === 0) action = 'entrada';
      else if (last[0].action === 'entrada') action = 'salida';
      else if (last[0].action === 'pausa') action = 'vuelta';
      else action = 'entrada';
    }

    await sql`
      INSERT INTO clockin_logs (employee_id, employee_name, action, method, clockin_date, created_at, tenant_id)
      VALUES (${body.employeeId}, ${body.employeeName || ''}, ${action}, ${body.method || 'tpc'}, ${today}, ${Date.now()}, ${tenantId})
    `;

    return NextResponse.json({ ok: true, action });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const tenantId = getTenantId(req);
    const body = await req.json();
    const { action: putAction } = body;

    // Edit a single record
    if (putAction === 'edit-record') {
      const { id, createdAt, action: newAction } = body;
      await sql`
        UPDATE clockin_logs SET created_at=${createdAt}, action=${newAction},
          edited=true, edited_by=${body.editedBy || ''}, edit_reason=${body.editReason || ''}
        WHERE id=${id} AND tenant_id = ${tenantId}
      `;
      return NextResponse.json({ ok: true });
    }

    // Close all open entries for a date
    if (putAction === 'close-open') {
      const { date: closeDate, defaultEndTime, editedBy } = body;
      const targetDate = closeDate || new Date().toISOString().slice(0, 10);
      const endTime = defaultEndTime || '23:59';

      const openLogs = await sql`
        SELECT DISTINCT employee_id, employee_name FROM clockin_logs
        WHERE clockin_date = ${targetDate} AND action = 'entrada' AND tenant_id = ${tenantId}
        AND employee_id NOT IN (
          SELECT employee_id FROM clockin_logs
          WHERE clockin_date = ${targetDate} AND action = 'salida' AND tenant_id = ${tenantId}
        )
      `;

      for (const emp of openLogs) {
        const [h, m] = endTime.split(':').map(Number);
        const closeAt = new Date(targetDate + 'T' + endTime);
        await sql`
          INSERT INTO clockin_logs (employee_id, employee_name, action, method, clockin_date, created_at, edited, edited_by, edit_reason, tenant_id)
          VALUES (${emp.employee_id}, ${emp.employee_name}, 'salida', 'auto', ${targetDate}, ${closeAt.getTime()}, true, ${editedBy || ''}, 'Cierre automático — entrada sin salida', ${tenantId})
        `;
      }

      return NextResponse.json({ ok: true, closedCount: openLogs.length });
    }

    // Employee correction request
    if (putAction === 'correction-request') {
      const { id, employeeId, employeeName, requestedAt, requestedAction, reason } = body;
      // Store in a new table or mark the existing record
      await sql`
        INSERT INTO clockin_corrections (clockin_id, employee_id, employee_name, requested_action, reason, status, created_at, tenant_id)
        VALUES (${id || 0}, ${employeeId}, ${employeeName || ''}, ${requestedAction || ''}, ${reason || ''}, 'pending', ${Date.now()}, ${tenantId})
      `;
      return NextResponse.json({ ok: true });
    }

    // Approve/reject correction request
    if (putAction === 'resolve-correction') {
      const { correctionId, status, resolvedBy } = body;
      await sql`UPDATE clockin_corrections SET status=${status}, resolved_by=${resolvedBy || ''} WHERE id=${correctionId} AND tenant_id = ${tenantId}`;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
