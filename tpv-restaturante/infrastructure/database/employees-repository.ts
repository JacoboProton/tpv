import { fetchEmployees, saveEmployees as apiSaveEmployees } from '@/lib/api'
import { cacheGet, cacheSet } from '@/lib/offline'

export interface Employee {
  id: string
  name: string
  role: string
  pin?: string
  active?: boolean
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function toEmployees(data: unknown): Employee[] | null {
  if (!Array.isArray(data)) return null
  return data.flatMap((e) => {
    if (!isRecord(e) || typeof e.id !== 'string' || typeof e.name !== 'string' || typeof e.role !== 'string') return []
    return [{
      id: e.id, name: e.name, role: e.role,
      pin: typeof e.pin === 'string' ? e.pin : undefined,
      active: typeof e.active === 'boolean' ? e.active : undefined,
    }]
  })
}

export async function getEmployees(): Promise<Employee[] | null> {
  try {
    return toEmployees(await fetchEmployees())
  } catch {
    return null
  }
}

export async function saveEmployees(employees: Employee[]): Promise<void> {
  cacheSet('employees', employees)
  try {
    await apiSaveEmployees(employees)
  } catch {
    /* offline — cache handles it */
  }
}

export function getCachedEmployees(): Employee[] | null {
  return toEmployees(cacheGet<unknown>('employees'))
}
