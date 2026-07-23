import type { Floor, Table, Order, OrderItem } from '../types'

export type { }

export function moveTableOrder(
  floor: Floor,
  srcTableId: string,
  dstTableId: string,
): Floor {
  const next: Floor = JSON.parse(JSON.stringify(floor))
  const src = next.tables.find((t) => t.id === srcTableId)
  const dst = next.tables.find((t) => t.id === dstTableId)
  if (!src || !dst || !src.orderId || !next.orders[src.orderId]) return floor

  if (dst.orderId) {
    const srcOrder = next.orders[src.orderId]
    const dstOrder = next.orders[dst.orderId]
    dstOrder.items = [...dstOrder.items, ...srcOrder.items]
    delete next.orders[src.orderId]
  } else {
    next.orders[src.orderId].tableId = dstTableId
    dst.orderId = src.orderId
  }
  src.orderId = null
  src.status = 'libre'
  src.mergedTableIds = null
  dst.status = dst.orderId ? 'unidas' : 'ocupada'

  return next
}

export function mergeTables(
  floor: Floor,
  dstTableId: string,
  srcTableIds: string[],
  employeeName?: string,
): Floor {
  const next: Floor = JSON.parse(JSON.stringify(floor))
  const dst = next.tables.find((t) => t.id === dstTableId)
  if (!dst) return floor

  let dstOrder = dst.orderId ? next.orders[dst.orderId] : null
  if (!dstOrder) {
    const newOrderId = 'ord_' + Date.now()
    dstOrder = { id: newOrderId, tableId: dstTableId, items: [], createdAt: Date.now(), employeeName: employeeName || '' }
    next.orders[newOrderId] = dstOrder
    dst.orderId = newOrderId
  }
  dst.status = 'unidas'
  dst.mergedTableIds = srcTableIds.filter((id) => id !== dstTableId)

  for (const srcId of srcTableIds) {
    if (srcId === dstTableId) continue
    const src = next.tables.find((t) => t.id === srcId)
    if (!src || !src.orderId) continue
    const srcOrder = next.orders[src.orderId]
    if (!srcOrder) continue
    dstOrder.items = [...dstOrder.items, ...srcOrder.items]
    delete next.orders[src.orderId]
    src.orderId = null
    src.status = 'libre'
  }

  const mergedNames = srcTableIds
    .filter((id) => id !== dstTableId)
    .map((id) => next.tables.find((t) => t.id === id)?.name || id)
    .filter(Boolean)
  if (mergedNames.length > 0) {
    dstOrder._mergedFrom = [dstTableId, ...srcTableIds.filter((id) => id !== dstTableId)]
    dstOrder._mergedLabel = `Unidas: ${dst.name} + ${mergedNames.join(' + ')}`
  }

  return next
}

export function reopenOrder(
  floor: Floor,
  tableId: string,
  historyEntry: Order,
): { floor: Floor; orderId: string } {
  const next: Floor = JSON.parse(JSON.stringify(floor))
  const table = next.tables.find((t) => t.id === tableId)
  if (!table) return { floor, orderId: '' }

  const reopenedId = historyEntry.id + '_reopened'
  const reopened: Order = {
    ...historyEntry,
    id: reopenedId,
    tableId,
    items: historyEntry.items.map((i: OrderItem) => ({ ...i, sent: false, ready: false })),
  } as Order
  ;(reopened as any).reopenedAt = Date.now()
  next.orders[reopenedId] = reopened

  if (!table.orderIds) table.orderIds = []
  table.orderIds.push(reopenedId)
  table.orderId = reopenedId
  table.status = 'ocupada'

  if (next.history?.[tableId]) {
    next.history[tableId] = next.history[tableId].filter((h: any) => h.id !== historyEntry.id)
  }

  return { floor: next, orderId: reopenedId }
}
