import { expandMenu, expandCombo } from '@/domain/order/menu-expansion'
import type { MenuExpansionItem } from '@/domain/order/menu-expansion'
import { clone } from '@/components/constants'

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function generateId(prefix: string): string {
  return prefix + '_' + Date.now() + Math.random().toString(16).slice(2)
}

function findOrCreateOrder(floor: any, tableId: string, employeeName: string, activeTicketId?: string | null) {
  const table = floor.tables.find((t: any) => t.id === tableId)
  if (!table) return null

  const activeOid = activeTicketId || table.orderIds?.[0] || table.orderId
  let order = activeOid ? floor.orders[activeOid] : null
  let isNew = false

  if (!order) {
    const orderId = 'o_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    order = {
      id: orderId, tableId, items: [], createdAt: Date.now(),
      employeeName: employeeName || '-',
    }
    floor.orders[orderId] = order
    if (!table.orderIds) table.orderIds = []
    table.orderIds.push(orderId)
    table.orderId = orderId
    table.status = 'ocupada'
    isNew = true
  }

  return { order, table, isNew, activeOid: order.id }
}

export interface AddNormalItemInput {
  product: any
  modifiers?: any[]
  extraPrice?: number
  employeeName?: string
  activeTicketId?: string | null
}

export interface AddNormalItemResult {
  floor: any
  orderId: string
  isNewOrder: boolean
  itemId?: string
}

export function addNormalItem(
  floor: any,
  tableId: string,
  catalog: any,
  input: AddNormalItemInput,
): AddNormalItemResult | null {
  const next = clone(floor)
  const ctx = findOrCreateOrder(next, tableId, input.employeeName || '', input.activeTicketId)
  if (!ctx) return null

  const { order, isNew } = ctx
  const basePrice = input.product.price || catalog?.products?.find((p: any) => p.id === input.product.id)?.price || 0
  const extra = input.extraPrice || 0
  const effectivePrice = round2(basePrice + extra)
  const modifiers = input.modifiers || []

  const existing = order.items.find(
    (i: any) => i.productId === input.product.id && !i.sent &&
      JSON.stringify(i.modifiers) === JSON.stringify(modifiers),
  )

  let itemId: string | undefined
  if (existing) {
    existing.qty += 1
    itemId = existing.id
  } else {
    const prod = catalog?.products?.find((p: any) => p.id === input.product.id)
    itemId = generateId('i')
    order.items.push({
      id: itemId,
      productId: input.product.id,
      name: input.product.name,
      price: effectivePrice,
      qty: 1,
      sent: false, ready: false, sentAt: null,
      notes: '',
      modifiers,
      course: input.product.course || '',
      ubicacion: input.product.ubicacion || prod?.ubicacion || 'Bar',
    })
  }

  return { floor: next, orderId: order.id, isNewOrder: isNew, itemId }
}

export interface AddMenuItemsInput {
  product: any
  menuSel?: { productId: string }[]
  employeeName?: string
}

export interface AddItemsResult {
  floor: any
  orderId: string
  isNewOrder: boolean
}

export function addMenuItems(
  floor: any,
  tableId: string,
  catalog: any,
  input: AddMenuItemsInput,
): AddItemsResult | null {
  const next = clone(floor)
  const ctx = findOrCreateOrder(next, tableId, input.employeeName || '')
  if (!ctx) return null

  const { order, isNew } = ctx
  const menuItems = expandMenu(input.product, catalog, input.menuSel)

  for (const mi of menuItems) {
    if (mi.productId && !mi.isMenuPrice) {
      const existing = order.items.find(
        (i: any) => i.productId === mi.productId && !i.sent && !i.isCombo && !i.isMenuItem,
      )
      if (existing) { existing.qty += mi.qty; continue }
    }
    order.items.push({
      id: generateId('i'),
      ...mi,
      sent: !!mi.isMenuPrice,
      ready: !!mi.isMenuPrice,
      sentAt: mi.isMenuPrice ? Date.now() : null,
      notes: '',
      modifiers: [],
    })
  }

  return { floor: next, orderId: order.id, isNewOrder: isNew }
}

export function addComboItems(
  floor: any,
  tableId: string,
  catalog: any,
  input: AddMenuItemsInput,
): AddItemsResult | null {
  const next = clone(floor)
  const ctx = findOrCreateOrder(next, tableId, input.employeeName || '')
  if (!ctx) return null

  const { order, isNew } = ctx
  const comboItems = expandCombo(input.product, catalog, input.menuSel)

  for (const ci of comboItems) {
    if (ci.productId && !ci.isComboPrice) {
      const existing = order.items.find(
        (i: any) => i.productId === ci.productId && !i.sent && !i.isCombo,
      )
      if (existing) { existing.qty += ci.qty; continue }
    }
    order.items.push({
      id: generateId('i'),
      ...ci,
      sent: !!ci.isComboPrice,
      ready: !!ci.isComboPrice,
      sentAt: ci.isComboPrice ? Date.now() : null,
      notes: '',
      modifiers: [],
    })
  }

  return { floor: next, orderId: order.id, isNewOrder: isNew }
}

export interface EditItemModifiersInput {
  itemId: string
  product: any
  modifiers: any[]
  extraPrice: number
}

export function editItemModifiers(
  floor: any,
  tableId: string,
  catalog: any,
  input: EditItemModifiersInput,
): any | null {
  const next = clone(floor)
  const table = next.tables.find((t: any) => t.id === tableId)
  if (!table) return null

  const order = next.orders[table.orderId]
  if (!order) return null

  const item = order.items.find((i: any) => i.id === input.itemId)
  if (!item) return null

  const basePrice = input.product.price || catalog?.products?.find((p: any) => p.id === input.product.id)?.price || 0
  item.modifiers = input.modifiers
  item.price = round2(basePrice + input.extraPrice)

  return next
}
