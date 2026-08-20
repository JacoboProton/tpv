import { fetchFloor as apiFetchFloor, saveFloor as apiSaveFloor } from '@/lib/api'
import { cacheGet, cacheSet } from '@/lib/offline'
import type { Floor } from '@tpv/core'

export type FloorData = Floor

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
    await apiSaveFloor(floor)
  } catch {
    /* offline — cache handles it */
  }
}

export function getCachedFloor(): FloorData | null {
  return cacheGet('floor') as FloorData | null
}

export function findTable(floor: FloorData | null, tableId: string): Floor['tables'][number] | null {
  return floor?.tables?.find(t => t.id === tableId) || null
}
