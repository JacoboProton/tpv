import { registerOrderSubscribers } from './order-subscribers'

let registered = false

export function registerAllSubscribers(deps: {
  showToast: (msg: string) => void
}) {
  if (registered) return
  registered = true
  registerOrderSubscribers(deps)
}
