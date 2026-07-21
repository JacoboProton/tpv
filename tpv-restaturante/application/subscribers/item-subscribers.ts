import { eventBus, type ItemSentEvent } from '@/lib/event-bus'

export function registerItemSubscribers(deps: {
  showToast: (msg: string) => void
}) {
  eventBus.on('item:sent', (data: ItemSentEvent) => {
    deps.showToast(`${data.productName} enviado a cocina`)
  })
}
