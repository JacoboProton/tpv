import type { Floor, Sale } from '../types'

export function createDebtOrder(
  floor: Floor,
  tableId: string,
  lastFiadoSale: Sale,
): Floor {
  const next: Floor = JSON.parse(JSON.stringify(floor))
  const table = next.tables.find((t) => t.id === tableId)
  if (!table) return floor

  const debtOrderId = 'debt_' + Date.now()
  next.orders[debtOrderId] = {
    id: debtOrderId, tableId,
    items: [{
      id: 'debt_item', productId: null,
      name: 'Deuda fiada',
      price: lastFiadoSale.totalWithTip,
      qty: 1, sent: true, ready: true, sentAt: null, notes: '',
    }],
    createdAt: Date.now(),
    employeeName: 'Deuda anterior',
  }
  table.orderId = debtOrderId

  return next
}
