import { eventBus, type StockChangedEvent } from '@/lib/event-bus'

export function registerStockSubscribers(_deps: {
  showToast: (msg: string) => void
}) {
  eventBus.on('stock:changed', (data: StockChangedEvent) => {
    if (data.newStock <= 0) {
      _deps.showToast(`⚠️ ${data.productName} agotado (${data.ubicacion})`)
    }
  })
}

