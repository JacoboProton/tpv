import { sql } from 'drizzle-orm';
import { getDb } from '@/lib/drizzle';

const SESSION_TTL = 12 * 60 * 60 * 1000;

interface PermissionRule {
  path: string;
  methods: string[];
  roles: string[];
}

const PERMISSION_MATRIX: PermissionRule[] = [
  { path: '/api/floor', methods: ['GET', 'PATCH'], roles: ['admin', 'camarero', 'cocina'] },
  { path: '/api/sales', methods: ['POST'], roles: ['admin', 'camarero'] },
  { path: '/api/qr-order', methods: ['GET', 'POST', 'PUT'], roles: ['admin', 'camarero'] },
  { path: '/api/employees', methods: ['POST'], roles: ['admin', 'camarero', 'cocina'] },
  { path: '/api/session', methods: ['POST'], roles: ['admin', 'camarero', 'cocina'] },
  { path: '/api/keep-alive', methods: ['GET'], roles: ['admin', 'camarero', 'cocina'] },
];

export function getRoutePermission(pathname: string, method: string): string[] | null {
  const match = PERMISSION_MATRIX.find(
    r => pathname.startsWith(r.path) && r.methods.includes(method)
  );
  return match ? match.roles : null;
}

export function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith('/api/') &&
    !PERMISSION_MATRIX.some(r => pathname.startsWith(r.path));
}

interface SessionEmployee {
  id: string;
  role: string;
  tenantId: string;
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
    const rows = result.rows as Array<{ employee_id: string; role: string; last_seen: string }>;

    if (rows.length === 0) return null;
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

export async function requireAdminPin(req: Request, adminPin: string | null): Promise<AuthResult> {
  if (!adminPin) return { authorized: false, error: 'PIN de administrador requerido', status: 400 };
  const tenantId = req.headers.get('x-tenant-id') || 'default';
  const db = getDb();
  const pinResult = await db.execute(sql`
    SELECT pin_hash FROM employees
    WHERE tenant_id = ${tenantId} AND role = 'admin'
  `);
  const rows = pinResult.rows as Array<{ pin_hash: string }>;
  const { compareSync } = await import('bcryptjs');
  const match = rows.some(r => compareSync(adminPin, r.pin_hash));
  if (!match) return { authorized: false, error: 'PIN de administrador incorrecto', status: 403 };
  return { authorized: true };
}
