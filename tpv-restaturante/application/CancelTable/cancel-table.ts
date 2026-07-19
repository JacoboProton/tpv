import { clone } from '@/components/constants'

export interface CancelledItemInfo {
  tableId: string
  tableName: string
  orderId: string
  items: any[]
  total: number
  employeeName?: string
  reason?: string
  cancelledAt: number
}

export function cancelTable(
  floor: any,
  tableId: string,
  employeeName?: string,
): { floor: any; cancelled: CancelledItemInfo[] } {
  const next = clone(floor)
  const table = next.tables.find((t: any) => t.id === tableId)
  if (!table) return { floor, cancelled: [] }

  const cancelled: CancelledItemInfo[] = []
  const orderIds = [...(table.orderIds || [])]

  for (const oid of orderIds) {
    const order = next.orders[oid]
    if (order) {
      cancelled.push({
        tableId,
        tableName: table.name,
        orderId: oid,
        items: order.items,
        total: order.items.reduce((s: any, i: any) => s + (i.price || 0) * (i.qty || 0), 0),
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
  floor: any,
  tableId: string,
  reason: string,
  employeeName?: string,
): { floor: any; cancelled: CancelledItemInfo[] } {
  const next = clone(floor)
  const table = next.tables.find((t: any) => t.id === tableId)
  if (!table) return { floor, cancelled: [] }

  const cancelled: CancelledItemInfo[] = []
  const orderIds = [...(table.orderIds || [])]

  for (const oid of orderIds) {
    const order = next.orders[oid]
    if (order) {
      const sentItems = order.items.filter((i: any) => i.sent)
      if (sentItems.length > 0) {
        cancelled.push({
          tableId,
          tableName: table.name,
          orderId: oid,
          items: sentItems,
          total: sentItems.reduce((s: any, i: any) => s + (i.price || 0) * (i.qty || 0), 0),
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
