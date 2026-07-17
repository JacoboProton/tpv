export type TableStatus = 'libre' | 'ocupada' | 'unidas' | 'cuenta'

export function determineTableStatus(orderIds: string[], isReserved: boolean): TableStatus {
  if (!orderIds || orderIds.length === 0) return isReserved ? 'ocupada' : 'libre'
  if (orderIds.length > 1) return 'unidas'
  return 'ocupada'
}

export function isDebtPayment(order: { items: Array<{ productId?: string | null }> }, isFiado: boolean): boolean {
  return isFiado && order.items.length === 1 && order.items[0].productId === null
}

export function closeTableOrders(table: {
  orderIds?: string[]
  orderId?: string | null
  isFiado?: boolean
  reserved?: string | null
  status?: string
}, closedOrderId: string): {
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

export function removeOrderFromTable(table: {
  orderIds?: string[]
  orderId?: string | null
  reserved?: string | null
  status?: string
}, orderId: string): {
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

export function clearTable(table: {
  orderId?: string | null
  orderIds?: string[]
  isFiado?: boolean
}): {
  orderId: null
  orderIds: []
  status: 'libre'
  isFiado: false
} {
  return { orderId: null, orderIds: [], status: 'libre', isFiado: false }
}
