import { registerOrderSubscribers } from './order-subscribers'
import { registerStockSubscribers } from './stock-subscribers'
import { registerItemSubscribers } from './item-subscribers'
import { registerPaymentSubscribers } from './payment-subscribers'
import { registerOrderCreatedSubscribers } from './order-created-subscriber'

let registered = false

export function registerAllSubscribers(deps: {
  showToast: (msg: string) => void
}) {
  if (registered) return
  registered = true
  registerOrderSubscribers(deps)
  registerStockSubscribers(deps)
  registerItemSubscribers(deps)
  registerPaymentSubscribers(deps)
  registerOrderCreatedSubscribers(deps)
}
