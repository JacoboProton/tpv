import { calculateOfferDiscount } from '@/domain/pricing/offers'
import { calculateOrderTotals } from '@/domain/order/order'
import { buildPayments, isFiado, hasPendingBizum, formatPaymentMethod } from '@/domain/payments/payments'
import { closeTableOrders, isDebtPayment } from '@/domain/tables/table'
import { deductStock } from '@/domain/inventory/stock'
import { clone } from '@/components/constants'
import type { CatalogProduct } from '@/infrastructure/database/catalog-repository'
import { generateInvoiceNumber } from '@/domain/invoice/invoice'
import type { Floor, Order, Catalog, Offer, PaymentSplit, Sale } from '@/domain/types'

export interface CloseOrderItem {
  id: string
  productId?: string
  name: string
  qty: number
  price?: number
  modifiers?: { optionId: string }[]
  voided?: boolean
  sent?: boolean
  ready?: boolean
  served?: boolean
}

// IMPORTANTE: CloseOrderModifierGroup debe existir separado de CloseOrderModifierOption.
// modifierData.groups son GRUPOS que contienen 'options', no opciones directas.
// No colapsar a CloseOrderModifierOption[]: rompe el type-check (close-order.ts:146, g.options).
export interface CloseOrderModifierGroup {
  id: string
  options: CloseOrderModifierOption[]
}

export interface CloseOrderModifierOption {
  id: string
  stockDeduct?: boolean
  stockArticleId?: string
  stockQuantity?: number
}

export interface CloseOrderTable {
  id: string
  name: string
  orderId: string
  isFiado?: boolean
  [key: string]: unknown
}

export interface CloseOrderInput {
  floor: Floor
  selectedTableId: string
  order: Order
  catalog: Catalog
  modifierData: { groups: CloseOrderModifierGroup[] }
  offers: Offer[]
  orderDiscount: number
  tipAmount: number
  tipMethod: string
  paymentSplits: PaymentSplit[]
  paymentIntentId: string
  currentUser: { id?: string; name?: string } | null
  invoice: { nif: string; name: string; address: string; email: string }
  trainingMode: boolean
}

export interface CloseOrderStockLog {
  productId: string
  productName: string
  oldStock: number
  newStock: number
  reason: string
  employeeName?: string
  createdAt: number
}

export interface CloseOrderResult {
  nextFloor: Floor
  nextCatalog: Catalog
  sale: Sale
  stockLogs: CloseOrderStockLog[]
  warnings: string[]
  wasDebt: boolean
}

function buildStockLogs(
  order: Order,
  catalog: Catalog,
  modOptMap: Record<string, CloseOrderModifierOption>,
  employeeName?: string,
): { nextCatalog: Catalog; stockLogs: CloseOrderStockLog[] } {
  const nextCatalog = clone(catalog) as Catalog
  const stockLogs: CloseOrderStockLog[] = []
  const now = Date.now()

  for (const item of order.items) {
    if (item.productId) {
      const p = nextCatalog.products.find((pr) => pr.id === item.productId) as CatalogProduct | undefined
      if (p) {
        const { stockByLocation, newStock } = deductStock(p.stockByLocation, p.ubicacion || 'Bar', item.qty)
        p.stockByLocation = stockByLocation
        stockLogs.push({
          productId: item.productId,
          productName: item.name,
          oldStock: newStock + item.qty,
          newStock,
          reason: 'venta',
          employeeName,
          createdAt: now,
        })
      }
    }
    if (item.modifiers) {
      for (const m of item.modifiers) {
        const opt = modOptMap[m.optionId]
        if (opt?.stockDeduct && opt.stockArticleId) {
          const p = nextCatalog.products.find((pr) => pr.id === opt.stockArticleId) as CatalogProduct | undefined
          if (p) {
            const qty = (opt.stockQuantity || 0) * item.qty
            const { stockByLocation, newStock } = deductStock(p.stockByLocation, p.ubicacion || 'Bar', qty)
            p.stockByLocation = stockByLocation
            stockLogs.push({
              productId: opt.stockArticleId,
              productName: p.name,
              oldStock: newStock + qty,
              newStock,
              reason: 'venta (modificador)',
              employeeName,
              createdAt: now,
            })
          }
        }
      }
    }
  }

  return { nextCatalog, stockLogs }
}

export function executeCloseOrder(input: CloseOrderInput): CloseOrderResult {
  const { floor, selectedTableId, order, catalog, modifierData, offers, orderDiscount, tipAmount, tipMethod, paymentSplits, paymentIntentId, currentUser, invoice, trainingMode } = input

  const nextFloor = clone(floor) as Floor
  const table = nextFloor.tables.find((t) => t.id === selectedTableId)!
  const wasDebt = isDebtPayment(order, table.isFiado ?? false)

  const warnings: string[] = []
  const unsentItems = order.items.filter((i) => !i.sent && !i.voided)
  const pendingItems = order.items.filter((i) => i.sent && !i.ready && !i.voided && !i.served)
  if (unsentItems.length > 0 || pendingItems.length > 0) {
    const parts: string[] = []
    if (unsentItems.length > 0) parts.push(`${unsentItems.length} artículo(s) sin enviar a cocina`)
    if (pendingItems.length > 0) parts.push(`${pendingItems.length} artículo(s) en preparación`)
    warnings.push(`Hay ${parts.join(' y ')}.`)
  }

  const modOptMap: Record<string, CloseOrderModifierOption> = {}
  for (const g of modifierData.groups) {
    for (const o of g.options || []) {
      modOptMap[o.id] = o
    }
  }

  const { nextCatalog, stockLogs } = buildStockLogs(order, catalog, modOptMap, currentUser?.name)

  const offerDiscountAmount = calculateOfferDiscount(order.items, offers)
  const { subtotal, discountAmount, total, totalWithTip } = calculateOrderTotals(
    order.items, orderDiscount, offerDiscountAmount, tipAmount,
  )
  const payments = buildPayments(paymentSplits)
  const fiado = isFiado(payments)
  const pendingBizum = hasPendingBizum(payments)
  const methodLabel = formatPaymentMethod(payments)

  const wantInvoice = !!(invoice.nif.trim() && invoice.name.trim())
  const invNum = wantInvoice ? generateInvoiceNumber() : ''
  const sale: Sale = {
    id: 's_' + Date.now(),
    tableId: table.id,
    tableName: table.name,
    items: order.items.map((i) => ({ id: i.id, productId: i.productId, name: i.name, qty: i.qty, price: i.price || 0, voided: !!i.voided })),
    subtotal,
    discount: orderDiscount,
    discountAmount,
    total,
    tip: tipAmount,
    tipMethod,
    totalWithTip,
    invoiceNif: wantInvoice ? invoice.nif : '',
    invoiceName: wantInvoice ? invoice.name : '',
    invoiceAddress: wantInvoice ? invoice.address : '',
    invoiceEmail: wantInvoice ? invoice.email : '',
    invoiceNumber: invNum,
    invoiceCreated: wantInvoice,
    invoiceCreatedAt: wantInvoice ? Date.now() : null,
    paymentIntentId,
    payments: fiado ? [{ method: 'fiado', amount: totalWithTip }] : payments,
    paymentMethod: methodLabel,
    isFiado: fiado,
    hasPendingBizum: pendingBizum,
    isDebtPayment: wasDebt,
    offerDiscount: offerDiscountAmount,
    employeeId: currentUser?.id || undefined,
    employeeName: currentUser?.name || 'Sin asignar',
    closedAt: Date.now(),
    ticketNumber: Date.now(),
  }

  const closedOrder = { ...order, closedAt: Date.now() }
  if (!nextFloor.history) nextFloor.history = {}
  if (!nextFloor.history[table.id]) nextFloor.history[table.id] = []
  nextFloor.history[table.id].push(closedOrder)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  nextFloor.history[table.id] = nextFloor.history[table.id].filter((h) => (h.closedAt || h.createdAt) >= todayStart.getTime())

  const closedOid = table.orderId
  if (closedOid) {
    delete nextFloor.orders[closedOid]
    Object.assign(table, closeTableOrders(table, closedOid))
  }

  return { nextFloor, nextCatalog, sale, stockLogs, warnings, wasDebt }
}
