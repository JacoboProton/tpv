import { sql } from '@/lib/db';

const SESSION_TTL = 12 * 60 * 60 * 1000;

const PERMISSION_MATRIX = [
  { path: '/api/floor', methods: ['GET', 'PATCH'], roles: ['admin', 'camarero', 'cocina'] },
  { path: '/api/sales', methods: ['POST'], roles: ['admin', 'camarero'] },
  { path: '/api/qr-order', methods: ['GET', 'POST', 'PUT'], roles: ['admin', 'camarero'] },
  { path: '/api/employees', methods: ['POST'], roles: ['admin', 'camarero', 'cocina'] },
  { path: '/api/session', methods: ['POST'], roles: ['admin', 'camarero', 'cocina'] },
  { path: '/api/keep-alive', methods: ['GET'], roles: ['admin', 'camarero', 'cocina'] },
];

export function getRoutePermission(pathname, method) {
  const match = PERMISSION_MATRIX.find(
    r => pathname.startsWith(r.path) && r.methods.includes(method)
  );
  return match ? match.roles : null;
}

export function isAdminRoute(pathname) {
  return pathname.startsWith('/api/') &&
    !PERMISSION_MATRIX.some(r => pathname.startsWith(r.path));
}

export async function getSessionEmployee(req) {
  try {
    const employeeId = req.headers.get('x-employee-id');
    const deviceId = req.headers.get('x-device-id');
    const tenantId = req.headers.get('x-tenant-id') || 'default';

    if (!employeeId || !deviceId) return null;

    const rows = await sql`
      SELECT employee_id, role, last_seen FROM sessions
      WHERE tenant_id = ${tenantId}
        AND employee_id = ${employeeId}
        AND device_id = ${deviceId}
        AND active = true
      LIMIT 1
    `;

    if (rows.length === 0) return null;
    const session = rows[0];

    if (Date.now() - Number(session.last_seen) > SESSION_TTL) {
      await sql`
        UPDATE sessions SET active = false
        WHERE tenant_id = ${tenantId} AND employee_id = ${employeeId} AND device_id = ${deviceId}
      `;
      return null;
    }

    return { id: session.employee_id, role: session.role, tenantId };
  } catch {
    return null;
  }
}

export function requireRole(allowedRoles) {
  return async (req) => {
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

export async function requireAdminPin(req, adminPin) {
  if (!adminPin) return { authorized: false, error: 'PIN de administrador requerido', status: 400 };
  const tenantId = req.headers.get('x-tenant-id') || 'default';
  const rows = await sql`
    SELECT pin_hash FROM employees
    WHERE tenant_id = ${tenantId} AND role = 'admin'
  `;
  const { default: bcrypt } = await import('bcryptjs');
  const match = rows.some(r => bcrypt.compareSync(adminPin, r.pin_hash));
  if (!match) return { authorized: false, error: 'PIN de administrador incorrecto', status: 403 };
  return { authorized: true };
}
