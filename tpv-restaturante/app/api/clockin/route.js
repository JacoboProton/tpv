import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);

    const rows = await sql`
      SELECT * FROM clockin_logs
      WHERE employee_id = ${employeeId} AND clockin_date = ${date}
      ORDER BY created_at ASC
    `;

    // Compute summary
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
        if (p.vuelta) {
          pauseMinutes += (Number(p.vuelta.created_at) - Number(p.created_at)) / 60000;
        }
      });
      effectiveMinutes = totalMinutes - pauseMinutes;
    }

    const lastAction = rows.length > 0 ? rows[rows.length - 1].action : null;

    return NextResponse.json({
      logs: rows.map(r => ({
        id: r.id, employeeId: r.employee_id, employeeName: r.employee_name,
        action: r.action, method: r.method, clockinDate: r.clockin_date,
        createdAt: r.created_at,
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
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const today = new Date().toISOString().slice(0, 10);

    // Check PIN if provided
    if (body.pin) {
      const emp = await sql`SELECT id FROM employees WHERE id = ${body.employeeId} AND pin = ${body.pin}`;
      if (emp.length === 0) return NextResponse.json({ error: 'PIN incorrecto' }, { status: 403 });
    }

    // Determine action if not specified
    let action = body.action;
    if (!action) {
      const last = await sql`
        SELECT action FROM clockin_logs WHERE employee_id = ${body.employeeId} AND clockin_date = ${today}
        ORDER BY created_at DESC LIMIT 1
      `;
      if (last.length === 0) action = 'entrada';
      else if (last[0].action === 'entrada') action = 'salida';
      else if (last[0].action === 'pausa') action = 'vuelta';
      else action = 'entrada';
    }

    await sql`
      INSERT INTO clockin_logs (employee_id, employee_name, action, method, clockin_date, created_at)
      VALUES (${body.employeeId}, ${body.employeeName || ''}, ${action}, ${body.method || 'tpc'}, ${today}, ${Date.now()})
    `;

    return NextResponse.json({ ok: true, action });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
