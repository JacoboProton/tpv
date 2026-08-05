import type { Employee, Floor } from '../types'

export function createEmployee(data: Partial<Employee>): Employee {
  return { id: 'e_' + Date.now(), ...data } as Employee
}

export function canDeleteEmployee(employees: Employee[], employeeId: string): { allowed: boolean; error?: string } {
  const target = employees.find((e) => e.id === employeeId)
  if (!target) return { allowed: true }
  if (target.role === 'admin') {
    const adminCount = employees.filter((e) => e.role === 'admin').length
    if (adminCount <= 1) return { allowed: false, error: 'Tiene que quedar al menos un administrador' }
  }
  return { allowed: true }
}

export function buildTrainingFloor(floor: Partial<Floor>): Floor {
  const tables = (floor?.tables || []).map((t) => ({
    ...t, orderId: null, orderIds: [], status: 'libre', reserved: null, isFiado: false,
  }))
  return { ...JSON.parse(JSON.stringify(floor)), tables, orders: {}, history: {} }
}
