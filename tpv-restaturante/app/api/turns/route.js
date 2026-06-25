import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const turnDate = searchParams.get('turnDate');

    let base = sql`SELECT * FROM employee_turns`;
    if (employeeId && turnDate) {
      base = sql`${base} WHERE employee_id = ${employeeId} AND turn_date = ${turnDate}`;
    } else if (employeeId) {
      base = sql`${base} WHERE employee_id = ${employeeId}`;
    } else if (turnDate) {
      base = sql`${base} WHERE turn_date = ${turnDate}`;
    }
    base = sql`${base} ORDER BY time ASC`;

    const rows = await base;
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { employeeId, employeeName, action, turnDate } = await req.json();
    const time = Date.now();

    await sql`
      INSERT INTO employee_turns (employee_id, employee_name, action, turn_date, time)
      VALUES (${employeeId}, ${employeeName}, ${action}, ${turnDate}, ${time})
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
