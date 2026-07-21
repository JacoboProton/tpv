import { eventBus, type OrderCreatedEvent } from '@/lib/event-bus'

export function registerOrderCreatedSubscribers(_deps: {
  showToast: (msg: string) => void
}) {
  eventBus.on('order:created', (_data: OrderCreatedEvent) => {
    // Future: analytics, kitchen display update, audit log
  })
}
