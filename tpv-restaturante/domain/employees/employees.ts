export type EmployeeRole = 'admin' | 'camarero' | 'cocina' | 'manager'

const ADMIN_ROUTES = new Set(['almacen', 'caja', 'config'])
const ROLE_HIERARCHY: Record<string, number> = { cocina: 0, camarero: 1, manager: 2, admin: 3 }

export function hasRole(employee: { role: string } | null, requiredRole: EmployeeRole): boolean {
  if (!employee) return false
  return (ROLE_HIERARCHY[employee.role] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0)
}

export function isAdmin(employee: { role: string } | null): boolean {
  return employee?.role === 'admin'
}

export function requiresAdmin(entryPoint: string): boolean {
  return ADMIN_ROUTES.has(entryPoint)
}

export function canAccess(employee: { role: string } | null, entryPoint: string): boolean {
  if (!requiresAdmin(entryPoint)) return true
  return isAdmin(employee)
}

export function formatEmployeeName(employee: { name: string; role?: string } | null): string {
  if (!employee) return 'Sin asignar'
  return employee.role ? `${employee.name} (${employee.role})` : employee.name
}
