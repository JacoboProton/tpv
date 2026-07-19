import type { Floor, Sale } from './types'

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

export function closeOrderOnTable(
  floor: Floor, tableId: string, userName: string,
  paymentMethod: string, payments: { method: string; amount: number }[],
  extra?: Partial<Sale>,
): { floor: Floor; sale: Sale } {
  const f = JSON.parse(JSON.stringify(floor)) as Floor
  const table = f.tables.find(t => t.id === tableId)

  const allOrderItems = Object.values(f.orders)
    .filter(o => o.tableId === tableId)
    .flatMap(o => o.items.map(i => ({ id: i.id, productId: i.productId, name: i.name, qty: i.qty, price: i.price })))
  const total = allOrderItems.reduce((s, i) => s + i.price * i.qty, 0)

  const sale: Sale = {
    id: generateId(), tableId, tableName: table?.name || tableId,
    items: allOrderItems, subtotal: total, discount: 0, discountAmount: 0,
    total, tip: 0, totalWithTip: total,
    payments,
    paymentMethod, isFiado: paymentMethod === 'Fiado', isDebtPayment: false,
    employeeId: undefined, employeeName: userName,
    closedAt: Date.now(),
    ...extra,
  }

  if (table) {
    if (paymentMethod === 'Fiado') table.isFiado = true
    table.status = 'libre'
    table.orderIds = []
    table.orderId = null
  }
  for (const oid of Object.keys(f.orders)) {
    if (f.orders[oid].tableId === tableId) delete f.orders[oid]
  }

  return { floor: f, sale }
}
