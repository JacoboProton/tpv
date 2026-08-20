export interface OrderCreatedEvent {
  orderId: string
  tableId: string
  tableName: string
  items: Array<{ productId: string; name: string; qty: number }>
  employeeName: string | null
  createdAt: string
}

import type { Payment, SaleItem } from '@tpv/core'

export interface OrderClosedEvent {
  saleId: string
  invoiceNumber?: string
  tableId: string
  tableName: string
  items: SaleItem[]
  subtotal: number
  discount: number
  total: number
  tip: number
  totalWithTip: number
  paymentMethod: string
  payments: Payment[]
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
  payments: Payment[]
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
  private listeners: { [K in keyof EventMap]: Set<Handler<EventMap[K]>> } = {
    'order:created': new Set(),
    'order:closed': new Set(),
    'item:sent': new Set(),
    'payment:completed': new Set(),
    'payment:refunded': new Set(),
    'stock:changed': new Set(),
  }

  on<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): () => void {
    const set = this.listeners[event]
    set.add(handler)
    return () => { set.delete(handler) }
  }

  off<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): void {
    this.listeners[event].delete(handler)
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    this.listeners[event].forEach(h => {
      try { h(data) } catch (e) { console.error(`[EventBus] error in handler for "${event}":`, e) }
    })
  }

  clear(event?: keyof EventMap): void {
    if (event) {
      this.listeners[event].clear()
    } else {
      for (const k of ['order:created', 'order:closed', 'item:sent', 'payment:completed', 'payment:refunded', 'stock:changed'] as const) {
        this.listeners[k].clear()
      }
    }
  }
}

export const eventBus = new TypedEventBus()
