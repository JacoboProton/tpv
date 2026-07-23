// ─── Enums / Unions ───
export type TableStatus = 'libre' | 'ocupada' | 'unidas' | 'cuenta'
export type EmployeeRole = 'admin' | 'camarero' | 'cocina' | 'manager'
export type ItemState = 'pending' | 'sent' | 'ready' | 'served' | 'voided'
export type TableType = 'mesa' | 'barra' | 'llevar' | 'domicilio'

// ─── Inventory ───
export interface StockEntry {
  stock: number
  lowStock?: number
}

// ─── Products ───
export interface Product {
  id: string
  name: string
  price: number
  cost?: number
  barcode?: string
  categoryId: string
  category?: string
  description?: string
  agotado?: boolean
  show_tpv?: boolean
  show_qr?: boolean
  course?: string
  ubicacion?: string
  allergens?: string[]
  image?: string
  stock?: number
  lowStock?: number
  stockByLocation?: Record<string, StockEntry>
  discount?: number
  isMenu?: boolean
  menuData?: any
  isCombo?: boolean
  comboData?: any
}

export interface Category {
  id: string
  name: string
  active?: boolean
  show_qr?: boolean
  sort_order?: number
}

export interface NewProductInput {
  name: string
  category: string
  price: number
  ubicacion?: string
  stock?: number
  lowStock?: number
}

export interface StockDelta {
  productId: string
  productName: string
  ubicacion: string
  delta: number
  newStock: number
}

// ─── Orders ───
export interface OrderItem {
  id: string
  productId?: string | null
  name: string
  price: number
  qty: number
  sent?: boolean
  ready?: boolean
  served?: boolean
  voided?: boolean
  voidReason?: string
  voidedBy?: string
  voidedAt?: number
  sentAt?: number | null
  delivered?: boolean
  servedBy?: string
  servedAt?: number
  notes?: string
  modifiers?: any[]
  course?: string
  ubicacion?: string
  lineDiscount?: number
  isCourtesy?: boolean
  overridePrice?: number
  isMenuItem?: boolean
  isMenuPrice?: boolean
  isComboItem?: boolean
  isComboPrice?: boolean
}

export interface Order {
  id: string
  tableId?: string
  items: OrderItem[]
  employeeName?: string
  createdAt?: number
  source?: string
  label?: string
  customer?: any
  _mergedFrom?: string[]
  _mergedLabel?: string
  personalDiscountApplied?: boolean
  personalDiscountEmployeeId?: string
  personalDiscountEmployeeName?: string
  closedAt?: number
}

export interface MenuExpansionItem {
  productId: string | null
  name: string
  price: number
  qty: number
  course: string
  isMenuItem?: boolean
  isMenuPrice?: boolean
  isComboItem?: boolean
  isComboPrice?: boolean
  ubicacion?: string
}

export interface OrderTotals {
  subtotal: number
  discountAmount: number
  offerDiscountAmount: number
  total: number
  totalWithTip: number
}

// ─── Tables / Floor ───
export interface Table {
  id: string
  name?: string
  status: string
  orderId?: string | null
  orderIds?: string[]
  type?: TableType
  isFiado?: boolean
  reserved?: boolean
  reserved_for?: string
  reservation?: {
    for?: string
    until?: number
    name?: string
    pax?: number
    notes?: string
  } | null
  mergedTableIds?: string[] | null
  x?: number
  y?: number
  width?: number
  height?: number
  radius?: number
  shape?: string
  rotation?: number
  seats?: number
  zone?: string
  layer?: number
  color?: string
}

export interface Floor {
  tables: Table[]
  orders: Record<string, Order>
  history?: Record<string, any[]>
  id?: string
  name?: string
  zones?: Zone[]
  background?: string | null
}

// ─── Payments ───
export interface Payment {
  method: string
  amount: number
  confirmed?: boolean
  itemIds?: string[]
}

export interface PaymentSplit {
  method: string
  amount: number
}

export interface RefundInput {
  amount: number
  reason?: string
}

export interface SaleItem {
  id: string
  productId: string
  name: string
  price: number
  qty: number
  modifiers?: ModifierSelection[]
  notes?: string
}

export interface SaleRefund extends RefundInput {
  employeeName: string
  timestamp: number
  stripeRefundId?: string
}

export interface Sale {
  id: string
  items: any[]
  subtotal: number
  discount: number
  discountAmount?: number
  total: number
  tip: number
  tipMethod?: string
  totalWithTip: number
  paymentMethod: string
  payments: Payment[]
  isFiado: boolean
  tableId?: string
  tableName?: string
  employeeName?: string
  employeeId?: string
  closedAt: number
  invoiceNumber?: string
  invoiceNif?: string
  invoiceName?: string
  invoiceAddress?: string
  invoiceEmail?: string
  invoiceCreated?: boolean
  invoiceCreatedAt?: number | null
  paymentIntentId?: string
  ticketNumber?: string | number
  offerDiscount?: number
  refunds?: SaleRefund[]
  hasPendingBizum?: boolean
  isDebtPayment?: boolean
  stripe_confirmed?: boolean
  stripeConfirmed?: boolean
  dispute_status?: string
  disputeStatus?: string
  dispute_data?: any
  verifactuStatus?: string
  verifactuNumSerie?: string
}

// ─── Auth ───
export interface CurrentUser {
  id: string
  name: string
  role: EmployeeRole
}

// ─── Employees ───
export interface Employee {
  id: string
  name: string
  role: EmployeeRole
  pin?: string
  monthlyUsed?: number
  monthlyUsedMonth?: string
  personalDiscountEnabled?: boolean
  monthlyLimit?: number
}

// ─── Catalog ───
export interface Catalog {
  products: Product[]
  categories: Category[]
  offers?: any[]
  combos?: any[]
  mealMenus?: any[]
  priceRules?: any[]
}

// ─── Kitchen ───
export interface KitchenItem {
  id: string
  sent?: boolean
  ready?: boolean
  served?: boolean
  voided?: boolean
}

// ─── Invoice ───
export interface IgicBreakdown {
  baseImponible: number
  cuotaIgic: number
}

// ─── Offers / Pricing ───
export interface Offer {
  active: boolean
  days: number[]
  startHour: number
  endHour: number
  productIds: string[]
  discountPct: number
}

export interface PriceRule {
  id?: string
  name?: string
  categoryId?: string
  productId?: string
  discountPct?: number
  type?: string
}

// ─── Mobile-specific: Modifiers ───
export interface ModifierOption {
  id: string
  group_id: string
  name: string
  price_delta: number
  is_default: boolean
  sort_order: number
}

export interface ModifierGroup {
  id: string
  name: string
  type: 'single' | 'multiple'
  required: boolean
  options: ModifierOption[]
}

export interface ModifierSelection {
  groupId: string
  groupName: string
  optionId: string
  optionName: string
  priceDelta: number
}

// ─── Mobile-specific: Zones ───
export interface Zone {
  id: string
  name: string
  color: string
}
