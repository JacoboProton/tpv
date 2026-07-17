export interface OrderClosedEvent {
  saleId: string
  tableId: string
  tableName: string
  items: Array<{ productId: string; name: string; qty: number; price: number }>
  subtotal: number
  discount: number
  total: number
  tip: number
  totalWithTip: number
  paymentMethod: string
  payments: Array<{ method: string; amount: number }>
  isFiado: boolean
  isDebtPayment: boolean
  employeeId: string | null
  employeeName: string | null
  closedAt: number
}

export interface PaymentCompletedEvent {
  saleId: string
  tableId: string
  amount: number
  method: string
  employeeName: string | null
  timestamp: number
}

export interface StockChangedEvent {
  productId: string
  productName: string
  ubicacion: string
  delta: number
  newStock: number
  reason: string
}

export interface OrderCreatedEvent {
  orderId: string
  tableId: string
  tableName: string
  items: Array<{ productId: string; name: string; qty: number }>
  employeeName: string | null
  createdAt: number
}

export interface PaymentRefundedEvent {
  saleId: string
  amount: number
  reason: string
  employeeName: string
  timestamp: number
}

export interface ItemSentEvent {
  orderId: string
  itemId: string
  productName: string
  course: string
  tableName: string
}
