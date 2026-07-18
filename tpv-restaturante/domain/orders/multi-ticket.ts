export interface TicketFloor {
  tables: any[]
  orders: Record<string, any>
}

export function createTicket(
  floor: TicketFloor,
  tableId: string,
  employeeName?: string,
): { floor: TicketFloor; orderId: string; ticketNum: number } {
  const next = JSON.parse(JSON.stringify(floor))
  const table = next.tables.find((t: any) => t.id === tableId)
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
  floor: TicketFloor,
  tableId: string,
  orderId: string,
): { floor: TicketFloor; activeOrderId: string | null } {
  const next = JSON.parse(JSON.stringify(floor))
  const table = next.tables.find((t: any) => t.id === tableId)
  const order = next.orders[orderId]
  if (!table || !order || order.items.length > 0) return { floor, activeOrderId: null }

  delete next.orders[orderId]
  table.orderIds = (table.orderIds || []).filter((id: any) => id !== orderId)

  if (table.orderIds.length === 0) {
    table.orderId = null
    if (!table.reserved) table.status = 'libre'
  } else {
    table.orderId = table.orderIds[0]
  }

  return { floor: next, activeOrderId: table.orderId || null }
}

export function renameTicket(
  floor: TicketFloor,
  orderId: string,
  label: string,
): TicketFloor {
  const next = JSON.parse(JSON.stringify(floor))
  const order = next.orders[orderId]
  if (order) order.label = label
  return next
}

export function linkCustomer(
  floor: TicketFloor,
  orderId: string,
  customer: any,
): TicketFloor {
  const next = JSON.parse(JSON.stringify(floor))
  const order = next.orders[orderId]
  if (order) order.customer = customer
  return next
}

export function unlinkCustomer(
  floor: TicketFloor,
  orderId: string,
): TicketFloor {
  const next = JSON.parse(JSON.stringify(floor))
  const order = next.orders[orderId]
  if (order) order.customer = null
  return next
}
