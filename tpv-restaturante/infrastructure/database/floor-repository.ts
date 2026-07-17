import { fetchFloor as apiFetchFloor, saveFloor as apiSaveFloor } from '@/lib/api'
import { cacheGet, cacheSet } from '@/lib/offline'

export interface Table {
  id: string
  name: string
  mesa?: string
  orderIds: string[]
  clientName?: string
  people?: number
  peopleCount?: number
  status: string
  zone?: string
  invoiceCount?: number
}

export interface FloorData {
  tables: Table[]
}

export async function getFloor(): Promise<FloorData | null> {
  try {
    return (await apiFetchFloor()) as FloorData
  } catch {
    return null
  }
}

export async function saveFloor(floor: FloorData): Promise<void> {
  cacheSet('floor', floor)
  try {
    await apiSaveFloor(floor as unknown as Record<string, unknown>)
  } catch {
    /* offline — cache handles it */
  }
}

export function getCachedFloor(): FloorData | null {
  return cacheGet('floor') as FloorData | null
}

export function findTable(floor: FloorData | null, tableId: string): Table | null {
  return floor?.tables?.find(t => t.id === tableId) || null
}
