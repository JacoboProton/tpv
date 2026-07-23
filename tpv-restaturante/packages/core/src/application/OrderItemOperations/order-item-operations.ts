import { clone } from '../../lib/utils'
import type { Floor } from '../../domain/types'

export function changeItemQuantity(floor: Floor, orderId: string, itemId: string, delta: number): Floor | null {
  const next = clone(floor) as Floor
  const order = next.orders[orderId]
  if (!order) return null
  const item = order.items.find((i) => i.id === itemId)
  if (!item || item.sent) return null
  item.qty += delta
  if (item.qty <= 0) order.items = order.items.filter((i) => i.id !== itemId)
  return next
}

export function updateItemNotes(floor: Floor, orderId: string, itemId: string, notes: string): Floor | null {
  const next = clone(floor) as Floor
  const order = next.orders[orderId]
  if (!order) return null
  const item = order.items.find((i) => i.id === itemId)
  if (item) item.notes = notes
  return next
}

export function removeItemFromOrder(floor: Floor, tableId: string, orderId: string, itemId: string): Floor | null {
  const next = clone(floor) as Floor
  const table = next.tables.find((t) => t.id === tableId)
  const order = next.orders[orderId]
  if (!order) return null
  order.items = order.items.filter((i) => i.id !== itemId)
  if (order.items.length === 0 && (table?.orderIds?.length || 0) <= 1) {
    delete next.orders[orderId]
    if (table) {
      table.orderIds = (table.orderIds || []).filter((id) => id !== orderId)
      table.orderId = table.orderIds?.[0] || null
      if (!table.orderId) table.status = 'libre'
    }
  }
  return next
}

export function sendToKitchenCourse(floor: Floor, orderId: string, course?: string): Floor | null {
  const next = clone(floor) as Floor
  const order = next.orders[orderId]
  if (!order) return null
  order.items.forEach((i) => {
    if (!i.sent && (!course || i.course === course)) { i.sent = true; i.sentAt = Date.now() }
  })
  return next
}

export function sendSingleItemToKitchen(floor: Floor, orderId: string, itemId: string): { floor: Floor; itemName: string; course: string; tableName: string } | null {
  const next = clone(floor) as Floor
  const order = next.orders[orderId]
  if (!order) return null
  const item = order.items.find((i) => i.id === itemId)
  if (!item || item.sent) return null
  item.sent = true; item.sentAt = Date.now()
  const table = next.tables.find((t) => t.id === order.tableId)
  return {
    floor: next,
    itemName: item.name,
    course: item.course || '',
    tableName: table?.name || order.tableId || '',
  }
}

export function updateItemCourse(floor: Floor, orderId: string, itemId: string, course?: string): Floor | null {
  const next = clone(floor) as Floor
  const order = next.orders[orderId]
  if (!order) return null
  const item = order.items.find((i) => i.id === itemId)
  if (item) item.course = course
  return next
}

export function markItemsReady(floor: Floor, orderId: string, ubicacion?: string): { floor: Floor; names: string[]; tableName: string } | null {
  const next = clone(floor) as Floor
  const order = next.orders[orderId]
  if (!order) return null
  let readyItems = order.items.filter((i) => i.sent && !i.ready)
  if (ubicacion) readyItems = readyItems.filter((i) => (i.ubicacion || 'Cocina') === ubicacion)
  if (readyItems.length === 0) return null
  readyItems.forEach((i) => i.ready = true)
  const table = next.tables.find((t) => t.id === order.tableId)
  const names = [...new Set(readyItems.map((i) => i.name))] as string[]
  return { floor: next, names, tableName: table?.name || order.tableId || '' }
}

export function voidOrderItem(floor: Floor, orderId: string, itemId: string, reason: string, voidedBy?: string): Floor | null {
  const next = clone(floor) as Floor
  const order = next.orders[orderId]
  if (!order) return null
  const item = order.items.find((i) => i.id === itemId)
  if (item) {
    item.voided = true; item.voidReason = reason
    item.voidedBy = voidedBy; item.voidedAt = Date.now()
  }
  return next
}

export function setLineDiscount(floor: Floor, orderId: string, itemId: string, pct: number): Floor | null {
  const next = clone(floor) as Floor
  const order = next.orders[orderId]
  if (!order) return null
  const item = order.items.find((i) => i.id === itemId)
  if (item) { item.lineDiscount = pct; item.isCourtesy = false }
  return next
}

export function removeLineDiscount(floor: Floor, orderId: string, itemId: string): Floor | null {
  const next = clone(floor) as Floor
  const order = next.orders[orderId]
  if (!order) return null
  const item = order.items.find((i) => i.id === itemId)
  if (item) item.lineDiscount = 0
  return next
}

export function setItemCourtesy(floor: Floor, orderId: string, itemId: string): Floor | null {
  const next = clone(floor) as Floor
  const order = next.orders[orderId]
  if (!order) return null
  const item = order.items.find((i) => i.id === itemId)
  if (item) { item.isCourtesy = true; item.lineDiscount = 0 }
  return next
}

export function removeItemCourtesy(floor: Floor, orderId: string, itemId: string): Floor | null {
  const next = clone(floor) as Floor
  const order = next.orders[orderId]
  if (!order) return null
  const item = order.items.find((i) => i.id === itemId)
  if (item) item.isCourtesy = false
  return next
}

export function setItemOverridePrice(floor: Floor, orderId: string, itemId: string, newPrice: number): Floor | null {
  const next = clone(floor) as Floor
  const order = next.orders[orderId]
  if (!order) return null
  const item = order.items.find((i) => i.id === itemId)
  if (item) { item.overridePrice = Math.max(0, newPrice) }
  return next
}
