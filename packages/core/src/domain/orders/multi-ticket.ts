import type { Floor, Table, Order } from '../types'

export function createTicket(
  floor: Floor,
  tableId: string,
  employeeName?: string,
): { floor: Floor; orderId: string; ticketNum: number } {
  const next = JSON.parse(JSON.stringify(floor))
  const table = next.tables.find((t: Table) => t.id === tableId)
  if (!table) return { floor, orderId: '', ticketNum: 0 }

  const orderId = 'o_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
  const ticketNum = (table.orderIds?.length || 0) + 1

  next.orders[orderId] = {
    id: orderId, tableId, items: [], createdAt: Date.now(),
    employeeName: employeeName || '', label: `#${ticketNum}`,
  }

  if (!table.orderIds) table.orderIds = []
  table.orderIds.push(orderId)
  table.orderId = orderId
  if (table.status === 'libre') table.status = 'ocupada'

  return { floor: next, orderId, ticketNum }
}

export function deleteTicket(
  floor: Floor,
  tableId: string,
  orderId: string,
): { floor: Floor; activeOrderId: string | null } {
  const next = JSON.parse(JSON.stringify(floor))
  const table = next.tables.find((t: Table) => t.id === tableId)
  const order = next.orders[orderId]
  if (!table || !order || order.items.length > 0) return { floor, activeOrderId: null }

  delete next.orders[orderId]
  table.orderIds = (table.orderIds || []).filter((id: string) => id !== orderId)

  if (table.orderIds.length === 0) {
    table.orderId = null
    if (!table.reserved) table.status = 'libre'
  } else {
    table.orderId = table.orderIds[0]
  }

  return { floor: next, activeOrderId: table.orderId || null }
}

export function renameTicket(
  floor: Floor,
  orderId: string,
  label: string,
): Floor {
  const next = JSON.parse(JSON.stringify(floor))
  const order: Order = next.orders[orderId]
  if (order) order.label = label
  return next
}

export function linkCustomer(
  floor: Floor,
  orderId: string,
  customer: any,
): Floor {
  const next = JSON.parse(JSON.stringify(floor))
  const order: Order = next.orders[orderId]
  if (order) order.customer = customer
  return next
}

export function unlinkCustomer(
  floor: Floor,
  orderId: string,
): Floor {
  const next = JSON.parse(JSON.stringify(floor))
  const order: Order = next.orders[orderId]
  if (order) order.customer = null
  return next
}
