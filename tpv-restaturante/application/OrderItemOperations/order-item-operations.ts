import { clone } from '@/components/constants'

export function changeItemQuantity(floor: any, orderId: string, itemId: string, delta: number): any {
  const next = clone(floor)
  const order = next.orders[orderId]
  if (!order) return null
  const item = order.items.find((i: any) => i.id === itemId)
  if (!item || item.sent) return null
  item.qty += delta
  if (item.qty <= 0) order.items = order.items.filter((i: any) => i.id !== itemId)
  return next
}

export function updateItemNotes(floor: any, orderId: string, itemId: string, notes: string): any {
  const next = clone(floor)
  const order = next.orders[orderId]
  if (!order) return null
  const item = order.items.find((i: any) => i.id === itemId)
  if (item) item.notes = notes
  return next
}

export function removeItemFromOrder(floor: any, tableId: string, orderId: string, itemId: string): any {
  const next = clone(floor)
  const table = next.tables.find((t: any) => t.id === tableId)
  const order = next.orders[orderId]
  if (!order) return null
  order.items = order.items.filter((i: any) => i.id !== itemId)
  if (order.items.length === 0 && (table?.orderIds?.length || 0) <= 1) {
    delete next.orders[orderId]
    if (table) {
      table.orderIds = (table.orderIds || []).filter((id: any) => id !== orderId)
      table.orderId = table.orderIds?.[0] || null
      if (!table.orderId) table.status = 'libre'
    }
  }
  return next
}

export function sendToKitchenCourse(floor: any, orderId: string, course?: string): any {
  const next = clone(floor)
  const order = next.orders[orderId]
  if (!order) return null
  order.items.forEach((i: any) => {
    if (!i.sent && (!course || i.course === course)) { i.sent = true; i.sentAt = Date.now() }
  })
  return next
}

export function sendSingleItemToKitchen(floor: any, orderId: string, itemId: string): { floor: any; itemName: string; course: string; tableName: string } | null {
  const next = clone(floor)
  const order = next.orders[orderId]
  if (!order) return null
  const item = order.items.find((i: any) => i.id === itemId)
  if (!item || item.sent) return null
  item.sent = true; item.sentAt = Date.now()
  const table = next.tables.find((t: any) => t.id === order.tableId)
  return {
    floor: next,
    itemName: item.name,
    course: item.course || '',
    tableName: table?.name || order.tableId || '',
  }
}

export function updateItemCourse(floor: any, orderId: string, itemId: string, course?: string): any {
  const next = clone(floor)
  const order = next.orders[orderId]
  if (!order) return null
  const item = order.items.find((i: any) => i.id === itemId)
  if (item) item.course = course
  return next
}

export function markItemsReady(floor: any, orderId: string, ubicacion?: string): { floor: any; names: string[]; tableName: string } | null {
  const next = clone(floor)
  const order = next.orders[orderId]
  if (!order) return null
  let readyItems = order.items.filter((i: any) => i.sent && !i.ready)
  if (ubicacion) readyItems = readyItems.filter((i: any) => (i.ubicacion || 'Cocina') === ubicacion)
  if (readyItems.length === 0) return null
  readyItems.forEach((i: any) => i.ready = true)
  const table = next.tables.find((t: any) => t.id === order.tableId)
  const names = [...new Set(readyItems.map((i: any) => i.name))] as string[]
  return { floor: next, names, tableName: table?.name || order.tableId || '' }
}

export function voidOrderItem(floor: any, orderId: string, itemId: string, reason: string, voidedBy?: string): any {
  const next = clone(floor)
  const order = next.orders[orderId]
  if (!order) return null
  const item = order.items.find((i: any) => i.id === itemId)
  if (item) {
    item.voided = true; item.voidReason = reason
    item.voidedBy = voidedBy; item.voidedAt = Date.now()
  }
  return next
}

export function setLineDiscount(floor: any, orderId: string, itemId: string, pct: number): any {
  const next = clone(floor)
  const order = next.orders[orderId]
  if (!order) return null
  const item = order.items.find((i: any) => i.id === itemId)
  if (item) { item.lineDiscount = pct; item.isCourtesy = false }
  return next
}

export function removeLineDiscount(floor: any, orderId: string, itemId: string): any {
  const next = clone(floor)
  const order = next.orders[orderId]
  if (!order) return null
  const item = order.items.find((i: any) => i.id === itemId)
  if (item) item.lineDiscount = 0
  return next
}

export function setItemCourtesy(floor: any, orderId: string, itemId: string): any {
  const next = clone(floor)
  const order = next.orders[orderId]
  if (!order) return null
  const item = order.items.find((i: any) => i.id === itemId)
  if (item) { item.isCourtesy = true; item.lineDiscount = 0 }
  return next
}

export function removeItemCourtesy(floor: any, orderId: string, itemId: string): any {
  const next = clone(floor)
  const order = next.orders[orderId]
  if (!order) return null
  const item = order.items.find((i: any) => i.id === itemId)
  if (item) item.isCourtesy = false
  return next
}

export function setItemOverridePrice(floor: any, orderId: string, itemId: string, newPrice: number): any {
  const next = clone(floor)
  const order = next.orders[orderId]
  if (!order) return null
  const item = order.items.find((i: any) => i.id === itemId)
  if (item) { item.overridePrice = Math.max(0, newPrice) }
  return next
}
