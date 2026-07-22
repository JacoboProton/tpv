import type { TableStatus, Order, Table } from '../types'

export type { TableStatus }

export function determineTableStatus(orderIds: string[], isReserved: boolean): TableStatus {
  if (!orderIds || orderIds.length === 0) return isReserved ? 'ocupada' : 'libre'
  if (orderIds.length > 1) return 'unidas'
  return 'ocupada'
}

export function isDebtPayment(order: Order, isFiado: boolean): boolean {
  return isFiado && order.items.length === 1 && order.items[0].productId === null
}

export function closeTableOrders(table: Table, closedOrderId: string): {
  orderId: string | null
  orderIds: string[]
  status: TableStatus
  isFiado: boolean
} {
  const orderIds = (table.orderIds || []).filter(id => id !== closedOrderId)
  if (orderIds.length === 0) {
    return { orderId: null, orderIds: [], status: 'libre', isFiado: false }
  }
  return {
    orderId: orderIds[0],
    orderIds,
    status: orderIds.length > 1 ? 'unidas' : 'ocupada',
    isFiado: table.isFiado || false,
  }
}

export function removeOrderFromTable(table: Table, orderId: string): {
  orderId: string | null
  orderIds: string[]
  status: TableStatus
} {
  const orderIds = (table.orderIds || []).filter(id => id !== orderId)
  if (orderIds.length === 0) {
    return { orderId: null, orderIds: [], status: table.reserved ? 'ocupada' : 'libre' }
  }
  return {
    orderId: orderIds[0],
    orderIds,
    status: 'ocupada',
  }
}

export function clearTable(table: Table): {
  orderId: null
  orderIds: []
  status: 'libre'
  isFiado: false
} {
  return { orderId: null, orderIds: [], status: 'libre', isFiado: false }
}
