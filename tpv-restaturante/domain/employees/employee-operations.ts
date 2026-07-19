export function createEmployee(data: any): any {
  return { id: 'e_' + Date.now(), ...data }
}

export function canDeleteEmployee(employees: any[], employeeId: string): { allowed: boolean; error?: string } {
  const target = employees.find((e: any) => e.id === employeeId)
  if (!target) return { allowed: true }
  if (target.role === 'admin') {
    const adminCount = employees.filter((e: any) => e.role === 'admin').length
    if (adminCount <= 1) return { allowed: false, error: 'Tiene que quedar al menos un administrador' }
  }
  return { allowed: true }
}

export function buildTrainingFloor(floor: any): any {
  const tables = (floor?.tables || []).map((t: any) => ({
    ...t, orderId: null, orderIds: [], status: 'libre', reserved: null, isFiado: false,
  }))
  return { ...JSON.parse(JSON.stringify(floor)), tables, orders: {}, history: {} }
}
