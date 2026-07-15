import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const objectives = searchParams.get('objectives') === 'true';

    if (objectives) {
      const rows = await sql`SELECT * FROM shift_objectives WHERE tenant_id = ${tenantId} ORDER BY day_of_week, start_time`;
      return NextResponse.json(rows);
    }

    let base = sql`SELECT * FROM employee_shifts WHERE tenant_id = ${tenantId}`;
    const conds = [];
    if (employeeId) conds.push(sql`employee_id = ${employeeId}`);
    if (from) conds.push(sql`date >= ${from}`);
    if (to) conds.push(sql`date <= ${to}`);
    if (conds.length > 0) base = sql`${base} AND ${conds.reduce((a, c) => sql`${a} AND ${c}`)}`;
    base = sql`${base} ORDER BY date, start_time`;

    const rows = await base;
    return NextResponse.json(rows.map(r => ({
      id: r.id, employeeId: r.employee_id, employeeName: r.employee_name,
      date: r.date, startTime: r.start_time, endTime: r.end_time,
      position: r.position, notes: r.notes, color: r.color,
      createdAt: r.created_at,
    })));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const body = await req.json() as any;
    const { action } = body;

    if (action === 'copy-week') {
      const { fromWeekStart, toWeekStart } = body;
      const fromEnd = new Date(new Date(fromWeekStart).getTime() + 6 * 86400000).toISOString().slice(0, 10);
      const toEnd = new Date(new Date(toWeekStart).getTime() + 6 * 86400000).toISOString().slice(0, 10);

      // Delete existing shifts in target week
      await sql`DELETE FROM employee_shifts WHERE date >= ${toWeekStart} AND date <= ${toEnd} AND tenant_id = ${tenantId}`;

      // Copy from source week
      const sourceShifts = await sql`
        SELECT * FROM employee_shifts WHERE date >= ${fromWeekStart} AND date <= ${fromEnd} AND tenant_id = ${tenantId}
      `;

      for (const s of sourceShifts) {
        const daysDiff = Math.round(
          (new Date(s.date).getTime() - new Date(fromWeekStart).getTime()) / 86400000
        );
        const targetDate = new Date(new Date(toWeekStart).getTime() + daysDiff * 86400000)
          .toISOString().slice(0, 10);

        await sql`
          INSERT INTO employee_shifts (id, employee_id, employee_name, date, start_time, end_time, position, notes, color, created_at, tenant_id)
          VALUES (${'shift_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)},
                  ${s.employee_id}, ${s.employee_name}, ${targetDate},
                  ${s.start_time}, ${s.end_time}, ${s.position}, ${s.notes}, ${s.color}, ${Date.now()}, ${tenantId})
        `;
      }

      return NextResponse.json({ ok: true, count: sourceShifts.length });
    }

    if (action === 'save-objective') {
      const { dayOfWeek, startTime, endTime, position, minPeople, maxPeople, id } = body;
      if (id) {
        await sql`UPDATE shift_objectives SET day_of_week=${dayOfWeek}, start_time=${startTime}, end_time=${endTime}, position=${position}, min_people=${minPeople}, max_people=${maxPeople} WHERE id=${id} AND tenant_id = ${tenantId}`;
      } else {
        await sql`INSERT INTO shift_objectives (day_of_week, start_time, end_time, position, min_people, max_people, tenant_id) VALUES (${dayOfWeek}, ${startTime}, ${endTime}, ${position}, ${minPeople}, ${maxPeople}, ${tenantId})`;
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'delete-objective') {
      await sql`DELETE FROM shift_objectives WHERE id=${body.id} AND tenant_id = ${tenantId}`;
      return NextResponse.json({ ok: true });
    }

    // Save a single shift
    const { id, employeeId, employeeName, date, startTime, endTime, position, notes, color } = body;
    if (id) {
      await sql`
        UPDATE employee_shifts SET employee_id=${employeeId}, employee_name=${employeeName}, date=${date},
          start_time=${startTime}, end_time=${endTime}, position=${position}, notes=${notes}, color=${color}
        WHERE id=${id} AND tenant_id = ${tenantId}
      `;
    } else {
      await sql`
        INSERT INTO employee_shifts (id, employee_id, employee_name, date, start_time, end_time, position, notes, color, created_at, tenant_id)
        VALUES (${'shift_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)},
                ${employeeId}, ${employeeName}, ${date}, ${startTime}, ${endTime}, ${position}, ${notes}, ${color}, ${Date.now()}, ${tenantId})
      `;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const { id } = await req.json() as any;
    await sql`DELETE FROM employee_shifts WHERE id = ${id} AND tenant_id = ${tenantId}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
