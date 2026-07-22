import { clone } from '@/components/constants'
import type { Floor, OrderItem } from '@/domain/types'

export interface CancelledItemInfo {
  tableId: string
  tableName: string
  orderId: string
  items: OrderItem[]
  total: number
  employeeName: string | undefined
  reason?: string
  cancelledAt: number
}

export function cancelTable(
  floor: Floor,
  tableId: string,
  employeeName?: string,
): { floor: Floor; cancelled: CancelledItemInfo[] } {
  const next = clone(floor) as Floor
  const table = next.tables.find((t) => t.id === tableId)
  if (!table) return { floor, cancelled: [] }

  const cancelled: CancelledItemInfo[] = []
  const orderIds = [...(table.orderIds || [])]

  for (const oid of orderIds) {
    const order = next.orders[oid]
    if (order) {
      cancelled.push({
        tableId,
        tableName: table.name || tableId,
        orderId: oid,
        items: order.items,
        total: order.items.reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0),
        employeeName,
        cancelledAt: Date.now(),
      })
      delete next.orders[oid]
    }
  }

  table.orderIds = []
  table.orderId = null
  table.status = 'libre'
  table.isFiado = false

  return { floor: next, cancelled }
}

export function voidTable(
  floor: Floor,
  tableId: string,
  reason: string,
  employeeName?: string,
): { floor: Floor; cancelled: CancelledItemInfo[] } {
  const next = clone(floor) as Floor
  const table = next.tables.find((t) => t.id === tableId)
  if (!table) return { floor, cancelled: [] }

  const cancelled: CancelledItemInfo[] = []
  const orderIds = [...(table.orderIds || [])]

  for (const oid of orderIds) {
    const order = next.orders[oid]
    if (order) {
      const sentItems = order.items.filter((i) => i.sent)
      if (sentItems.length > 0) {
        cancelled.push({
          tableId,
          tableName: table.name || tableId,
          orderId: oid,
          items: sentItems,
          total: sentItems.reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0),
          employeeName,
          reason: reason || 'vaciar mesa',
          cancelledAt: Date.now(),
        })
      }
      delete next.orders[oid]
    }
  }

  table.orderIds = []
  table.orderId = null
  table.status = 'libre'
  table.isFiado = false

  return { floor: next, cancelled }
}
