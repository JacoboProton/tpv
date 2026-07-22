import type { ItemState, KitchenItem, OrderItem, Floor } from '../types'

export type { ItemState, KitchenItem }

export function getItemState(item: KitchenItem): ItemState {
  if (item.voided) return 'voided'
  if (item.served) return 'served'
  if (item.ready) return 'ready'
  if (item.sent) return 'sent'
  return 'pending'
}

export function canTransitionTo(item: KitchenItem, target: ItemState): boolean {
  const current = getItemState(item)
  const order = ['pending', 'sent', 'ready', 'served', 'voided']
  return order.indexOf(target) > order.indexOf(current)
}

export function isPending(item: KitchenItem): boolean {
  return getItemState(item) === 'pending'
}

export function isInKitchen(item: KitchenItem): boolean {
  const state = getItemState(item)
  return state === 'sent' || state === 'ready'
}

export function hasUnsentItems(items: KitchenItem[]): boolean {
  return items.some(i => isPending(i))
}

export function hasPendingItems(items: KitchenItem[]): boolean {
  return items.some(i => getItemState(i) === 'sent')
}

export function countPendingLines(items: KitchenItem[]): number {
  return items.filter(i => !i.sent && !i.voided).length
}

export function countPendingKitchenItems(floor: Floor): number {
  return Object.values(floor.orders || {}).reduce((sum, o) =>
    sum + o.items.filter(i => i.sent && !i.ready).length, 0
  )
}

export function formatItemPreview(itemNames: string[], max: number = 3): string {
  const items = itemNames.slice(0, max).join(', ')
  const suffix = itemNames.length > max ? ` y ${itemNames.length - max} más` : ''
  return `${items}${suffix}`
}
