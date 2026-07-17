import { fetchEmployees, saveEmployees as apiSaveEmployees } from '@/lib/api'
import { cacheGet, cacheSet } from '@/lib/offline'

export interface Employee {
  id: string
  name: string
  role: string
  pin?: string
  active?: boolean
}

export async function getEmployees(): Promise<Employee[] | null> {
  try {
    return (await fetchEmployees()) as Employee[]
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
  return cacheGet('employees') as Employee[] | null
}
