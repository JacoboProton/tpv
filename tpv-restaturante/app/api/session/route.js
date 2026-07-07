import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

function tenantId(req) {
  return req.headers.get('x-tenant-id') || req.headers.get('x-tenant_id') || 'default';
}

export async function POST(req) {
  try {
    const tid = tenantId(req);
    const body = await req.json();
    const { action, employeeId, employeeRole, deviceId } = body;

    if (action === 'login') {
      if (!employeeId || !deviceId) {
        return NextResponse.json({ error: 'employeeId y deviceId requeridos' }, { status: 400 });
      }

      // Check for existing active sessions on OTHER devices for this employee
      const existing = await sql`
        SELECT * FROM sessions
        WHERE tenant_id = ${tid}
          AND employee_id = ${employeeId}
          AND active = true
          AND device_id != ${deviceId}
        ORDER BY last_seen DESC
      `;

      // If non-admin and session exists on another device, return conflict
      if (existing.length > 0 && employeeRole !== 'admin' && !body.force) {
        return NextResponse.json({
          conflict: true,
          existingDevice: existing[0].device_id,
          existingSince: existing[0].created_at,
          message: `El empleado ya está conectado en otro terminal`,
        });
      }

      // Deactivate any old sessions for this employee
      await sql`
        UPDATE sessions SET active = false
        WHERE tenant_id = ${tid}
          AND employee_id = ${employeeId}
          AND device_id != ${deviceId}
      `;

      // Upsert this session
      const now = Date.now();
      await sql`
        INSERT INTO sessions (tenant_id, employee_id, device_id, role, active, created_at, last_seen)
        VALUES (${tid}, ${employeeId}, ${deviceId}, ${employeeRole}, true, ${now}, ${now})
        ON CONFLICT (tenant_id, employee_id, device_id)
        DO UPDATE SET active = true, last_seen = ${now}, role = ${employeeRole}
      `;

      return NextResponse.json({ ok: true });
    }

    if (action === 'logout') {
      if (!employeeId || !deviceId) {
        return NextResponse.json({ error: 'employeeId y deviceId requeridos' }, { status: 400 });
      }
      await sql`
        UPDATE sessions SET active = false
        WHERE tenant_id = ${tid}
          AND employee_id = ${employeeId}
          AND device_id = ${deviceId}
      `;
      return NextResponse.json({ ok: true });
    }

    if (action === 'keepalive') {
      if (!employeeId || !deviceId) {
        return NextResponse.json({ error: 'employeeId y deviceId requeridos' }, { status: 400 });
      }
      // Check if session is still valid (not taken over by another device)
      const session = await sql`
        SELECT active FROM sessions
        WHERE tenant_id = ${tid}
          AND employee_id = ${employeeId}
          AND device_id = ${deviceId}
      `;
      if (session.length === 0 || !session[0].active) {
        return NextResponse.json({ invalidated: true, message: 'Sesión cerrada en otro terminal' });
      }
      await sql`
        UPDATE sessions SET last_seen = ${Date.now()}
        WHERE tenant_id = ${tid}
          AND employee_id = ${employeeId}
          AND device_id = ${deviceId}
      `;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
