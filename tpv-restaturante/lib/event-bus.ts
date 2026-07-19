export interface OrderCreatedEvent {
  orderId: string
  tableId: string
  tableName: string
  items: Array<{ productId: string; name: string; qty: number }>
  employeeName: string | null
  createdAt: string
}

export interface OrderClosedEvent {
  saleId: string
  tableId: string
  tableName: string
  items: any[]
  subtotal: number
  discount: number
  total: number
  tip: number
  totalWithTip: number
  paymentMethod: string
  payments: any[]
  isFiado: boolean
  isDebtPayment: boolean
  employeeId: string | null
  employeeName: string | null
  closedAt: string
}

export interface ItemSentEvent {
  orderId: string
  itemId: string
  productName: string
  course: string
  tableName: string
}

export interface PaymentCompletedEvent {
  saleId: string
  tableId: string
  amount: number
  method: string
  employeeName: string | null
  timestamp: number
}

export interface PaymentRefundedEvent {
  saleId: string
  amount: number
  reason: string
  employeeName: string
  timestamp: number
}

export interface StockChangedEvent {
  productId: string
  productName: string
  ubicacion: string
  delta: number
  newStock: number
  reason?: string
}

export interface EventMap {
  'order:created': OrderCreatedEvent
  'order:closed': OrderClosedEvent
  'item:sent': ItemSentEvent
  'payment:completed': PaymentCompletedEvent
  'payment:refunded': PaymentRefundedEvent
  'stock:changed': StockChangedEvent
}

type Handler<T> = (data: T) => void

class TypedEventBus {
  private listeners = new Map<string, Set<Handler<any>>>()

  on<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): () => void {
    if (!this.listeners.has(event as string)) this.listeners.set(event as string, new Set())
    this.listeners.get(event as string)!.add(handler)
    return () => this.listeners.get(event as string)?.delete(handler)
  }

  off<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): void {
    this.listeners.get(event as string)?.delete(handler)
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    this.listeners.get(event as string)?.forEach(h => {
      try { h(data) } catch (e) { console.error(`[EventBus] error in handler for "${event}":`, e) }
    })
  }

  clear(event?: keyof EventMap): void {
    if (event) this.listeners.delete(event as string)
    else this.listeners.clear()
  }
}

export const eventBus = new TypedEventBus()
