import { clone } from '@/components/constants'

export function toggleCuentaStatus(floor: any, tableId: string): any {
  const next = clone(floor)
  const table = next.tables.find((t: any) => t.id === tableId)
  if (!table) return null
  table.status = table.status === 'cuenta' ? 'ocupada' : 'cuenta'
  return next
}
