import { eventBus, type OrderCreatedEvent } from '@/lib/event-bus'

export function registerOrderCreatedSubscribers(deps: {
  showToast: (msg: string) => void
}) {
  eventBus.on('order:created', (data: OrderCreatedEvent) => {
    const itemSummary = data.items.slice(0, 2).map(i => `${i.qty}x ${i.name}`).join(', ')
    const suffix = data.items.length > 2 ? ` y ${data.items.length - 2} más` : ''
    const tableInfo = data.tableName ? ` en ${data.tableName}` : ''
    deps.showToast(`🆕 ${itemSummary}${suffix}${tableInfo}`)
  })
}
