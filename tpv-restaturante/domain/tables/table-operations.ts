export interface TableState {
  id: string
  orderId?: string | null
  orderIds?: string[]
  status: string
  name?: string
  isFiado?: boolean
  mergedTableIds?: string[] | null
}

export interface OrderState {
  id: string
  tableId?: string
  items: any[]
  employeeName?: string
  createdAt?: number
  _mergedFrom?: string[]
  _mergedLabel?: string
}

export interface FloorState {
  tables: TableState[]
  orders: Record<string, OrderState>
  history?: Record<string, any[]>
}

export function moveTableOrder(
  floor: FloorState,
  srcTableId: string,
  dstTableId: string,
): FloorState {
  const next = JSON.parse(JSON.stringify(floor)) as FloorState
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
  floor: FloorState,
  dstTableId: string,
  srcTableIds: string[],
  employeeName?: string,
): FloorState {
  const next = JSON.parse(JSON.stringify(floor)) as FloorState
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
  floor: FloorState,
  tableId: string,
  historyEntry: any,
): { floor: FloorState; orderId: string } {
  const next = JSON.parse(JSON.stringify(floor)) as FloorState
  const table = next.tables.find((t) => t.id === tableId)
  if (!table) return { floor, orderId: '' }

  const reopenedId = historyEntry.id + '_reopened'
  next.orders[reopenedId] = {
    ...historyEntry,
    id: reopenedId,
    tableId,
    reopenedAt: Date.now(),
    items: historyEntry.items.map((i: any) => ({ ...i, sent: false, ready: false })),
  }

  if (!table.orderIds) table.orderIds = []
  table.orderIds.push(reopenedId)
  table.orderId = reopenedId
  table.status = 'ocupada'

  if (next.history?.[tableId]) {
    next.history[tableId] = next.history[tableId].filter((h: any) => h.id !== historyEntry.id)
  }

  return { floor: next, orderId: reopenedId }
}
