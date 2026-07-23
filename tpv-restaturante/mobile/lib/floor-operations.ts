import type { Floor, Product, ModifierSelection } from './types'

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

export function addItemToOrder(
  floor: Floor, tableId: string, product: Product,
  modifiers: ModifierSelection[], extraPrice: number, userName: string,
): Floor {
  const f = JSON.parse(JSON.stringify(floor)) as Floor
  const t = f.tables.find(t => t.id === tableId)
  if (!t) return floor

  let order: any
  if (t.orderIds && t.orderIds.length > 0) {
    order = f.orders[t.orderIds[0]]
  } else {
    const oid = generateId()
    order = { id: oid, tableId, items: [], createdAt: Date.now(), employeeName: userName || 'Camarero' }
    f.orders[oid] = order
    t.orderIds = [oid]
    t.orderId = oid
    t.status = 'ocupada'
  }

  const modKey = JSON.stringify(modifiers)
  const existing = order.items.find((i: any) =>
    i.productId === product.id && !i.sent && JSON.stringify(i.modifiers || []) === modKey,
  )
  if (existing) {
    existing.qty += 1
  } else {
    order.items.push({
      id: generateId(), productId: product.id, name: product.name,
      price: product.price + extraPrice, qty: 1, course: product.course || '',
      ubicacion: product.ubicacion || 'Bar',
      modifiers: modifiers.length > 0 ? modifiers : undefined,
    })
  }
  return f
}

export function changeItemQuantity(floor: Floor, itemId: string, delta: number): Floor {
  const f = JSON.parse(JSON.stringify(floor)) as Floor
  for (const order of Object.values(f.orders)) {
    const item = order.items.find((i: any) => i.id === itemId)
    if (!item) continue
    item.qty = Math.max(0, item.qty + delta)
    if (item.qty === 0) {
      order.items = order.items.filter((i: any) => i.id !== itemId)
    }
    for (const o of Object.values(f.orders)) {
      if (o.items.length === 0) {
        delete f.orders[o.id]
        f.tables.forEach(t => {
          t.orderIds = (t.orderIds || []).filter((oid: any) => oid !== o.id)
          if (t.orderId === o.id) t.orderId = t.orderIds[0] || null
        })
      }
    }
    f.tables.forEach(t => {
      const hasItems = (t.orderIds || []).some(oid => f.orders[oid]?.items?.length > 0)
      t.status = hasItems ? 'ocupada' : 'libre'
      if (!t.orderId && t.orderIds?.length === 0) t.orderId = null
    })
    break
  }
  return f
}

export function sendItemToKDS(floor: Floor, itemId: string): Floor {
  const f = JSON.parse(JSON.stringify(floor)) as Floor
  for (const order of Object.values(f.orders)) {
    const item = order.items.find((i: any) => i.id === itemId)
    if (item) { item.sent = true; break }
  }
  return f
}

export function sendAllToKDS(floor: Floor, ubicacionFilter?: string): { floor: Floor; count: number } {
  const f = JSON.parse(JSON.stringify(floor)) as Floor
  let count = 0
  for (const order of Object.values(f.orders)) {
    order.items.forEach((i: any) => {
      if (!i.sent && (!ubicacionFilter || i.ubicacion === ubicacionFilter)) {
        i.sent = true; count++
      }
    })
  }
  return { floor: f, count }
}

export function sendCourseToKDS(floor: Floor, course: string): { floor: Floor; count: number } {
  const f = JSON.parse(JSON.stringify(floor)) as Floor
  let count = 0
  for (const order of Object.values(f.orders)) {
    order.items.forEach((i: any) => {
      if (!i.sent && i.course === course) { i.sent = true; i.sentAt = Date.now(); count++ }
    })
  }
  return { floor: f, count }
}

export function markItemServed(floor: Floor, itemId: string, userName: string): Floor {
  const f = JSON.parse(JSON.stringify(floor)) as Floor
  for (const order of Object.values(f.orders)) {
    const item = order.items.find((i: any) => i.id === itemId)
    if (item) {
      item.delivered = true
      item.servedBy = userName || 'Camarero'
      item.servedAt = Date.now()
      break
    }
  }
  return f
}
