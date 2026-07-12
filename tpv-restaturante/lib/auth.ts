export function requireRole(req: Request, role: string): { error: string; status: number } | null {
  const employeeRole = req.headers.get('x-employee-role');
  if (!employeeRole) {
    return { error: 'Se requiere autenticación de empleado', status: 401 };
  }
  if (role === 'admin' && employeeRole !== 'admin') {
    return { error: 'Solo administradores pueden realizar esta acción', status: 403 };
  }
  return null;
}
