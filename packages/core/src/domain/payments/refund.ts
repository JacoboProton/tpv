import type { RefundInput, Sale, SaleRefund } from '../types'

export type { RefundInput }

export function addRefundToSale(sale: Sale, refund: RefundInput, employeeName: string): Sale {
  if (!sale.refunds) sale.refunds = []
  const entry: SaleRefund = { ...refund, employeeName, timestamp: Date.now() }
  sale.refunds.push(entry)
  return sale
}
