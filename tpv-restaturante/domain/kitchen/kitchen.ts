export type ItemState = 'pending' | 'sent' | 'ready' | 'served' | 'voided'

export interface KitchenItem {
  id: string
  sent?: boolean
  ready?: boolean
  served?: boolean
  voided?: boolean
}

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
