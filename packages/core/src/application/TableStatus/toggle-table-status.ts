import { clone } from '../../lib/utils'
import type { Floor } from '../../domain/types'

export function toggleCuentaStatus(floor: Floor, tableId: string): Floor | null {
  const next = clone(floor) as Floor
  const table = next.tables.find((t) => t.id === tableId)
  if (!table) return null
  table.status = table.status === 'cuenta' ? 'ocupada' : 'cuenta'
  return next
}
