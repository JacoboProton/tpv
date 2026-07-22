import type { Employee, EmployeeRole } from '../types'

export type { EmployeeRole }

const ADMIN_ROUTES = new Set(['almacen', 'caja', 'config'])
const ROLE_HIERARCHY: Record<string, number> = { cocina: 0, camarero: 1, manager: 2, admin: 3 }

export function hasRole(employee: Employee | null, requiredRole: EmployeeRole): boolean {
  if (!employee) return false
  return (ROLE_HIERARCHY[employee.role] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0)
}

export function isAdmin(employee: Employee | null): boolean {
  return employee?.role === 'admin'
}

export function requiresAdmin(entryPoint: string): boolean {
  return ADMIN_ROUTES.has(entryPoint)
}

export function canAccess(employee: Employee | null, entryPoint: string): boolean {
  if (!requiresAdmin(entryPoint)) return true
  return isAdmin(employee)
}

export function formatEmployeeName(employee: Employee | null): string {
  if (!employee) return 'Sin asignar'
  return employee.role ? `${employee.name} (${employee.role})` : employee.name
}
