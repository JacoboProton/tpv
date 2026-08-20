import { sql } from 'drizzle-orm';
import { getDb } from '@/lib/drizzle';

const SESSION_TTL = 12 * 60 * 60 * 1000;

interface SessionEmployee {
  id: string;
  role: string;
  tenantId: string;
}

interface SessionRow {
  employee_id: string;
  role: string;
  last_seen: string;
}

interface PinRow {
  pin_hash: string;
}

function isSessionRow(r: unknown): r is SessionRow {
  if (typeof r !== 'object' || r === null) return false;
  if (!('employee_id' in r) || !('role' in r) || !('last_seen' in r)) return false;
  return typeof r.employee_id === 'string' && typeof r.role === 'string' && typeof r.last_seen === 'string';
}

function isPinRow(r: unknown): r is PinRow {
  if (typeof r !== 'object' || r === null) return false;
  return 'pin_hash' in r && typeof r.pin_hash === 'string';
}

export async function getSessionEmployee(req: Request): Promise<SessionEmployee | null> {
  try {
    const employeeId = req.headers.get('x-employee-id');
    const deviceId = req.headers.get('x-device-id');
    const tenantId = req.headers.get('x-tenant-id') || 'default';

    if (!employeeId || !deviceId) return null;

    const db = getDb();
    const result = await db.execute(sql`
      SELECT employee_id, role, last_seen FROM sessions
      WHERE tenant_id = ${tenantId}
        AND employee_id = ${employeeId}
        AND device_id = ${deviceId}
        AND active = true
      LIMIT 1
    `);
    const rows: unknown[] = result.rows;

    if (rows.length === 0 || !isSessionRow(rows[0])) return null;
    const session = rows[0];

    if (Date.now() - Number(session.last_seen) > SESSION_TTL) {
      await db.execute(sql`
        UPDATE sessions SET active = false
        WHERE tenant_id = ${tenantId} AND employee_id = ${employeeId} AND device_id = ${deviceId}
      `);
      return null;
    }

    return { id: session.employee_id, role: session.role, tenantId };
  } catch {
    return null;
  }
}

interface AuthResult {
  authorized: boolean;
  error?: string;
  status?: number;
  employee?: SessionEmployee;
}

export function requireRole(allowedRoles: string[]) {
  return async (req: Request): Promise<AuthResult> => {
    const emp = await getSessionEmployee(req);
    if (!emp) {
      return { authorized: false, error: 'Sesión no válida', status: 401 };
    }
    if (!allowedRoles.includes(emp.role)) {
      return { authorized: false, error: 'No tienes permisos para esta operación', status: 403 };
    }
    return { authorized: true, employee: emp };
  };
}

export async function validateTenantOwnership(employeeId: string, tenantId: string): Promise<boolean> {
  try {
    const db = getDb();
    const result = await db.execute(sql`
      SELECT 1 FROM employees
      WHERE id = ${employeeId} AND tenant_id = ${tenantId}
      LIMIT 1
    `);
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

export async function requireAdminPin(req: Request, adminPin: string | null): Promise<AuthResult> {
  if (!adminPin) return { authorized: false, error: 'PIN de administrador requerido', status: 400 };
  const tenantId = req.headers.get('x-tenant-id') || 'default';
  const db = getDb();
  const pinResult = await db.execute(sql`
    SELECT pin_hash FROM employees
    WHERE tenant_id = ${tenantId} AND role = 'admin'
  `);
  const rows: unknown[] = pinResult.rows;
  const { compareSync } = await import('bcryptjs');
  const { createHash } = await import('crypto');
  const match = rows.some(r => {
    if (!isPinRow(r)) return false;
    return compareSync(adminPin, r.pin_hash) ||
      compareSync(createHash('sha256').update(adminPin, 'utf8').digest('hex'), r.pin_hash);
  });
  if (!match) return { authorized: false, error: 'PIN de administrador incorrecto', status: 403 };
  return { authorized: true };
}
