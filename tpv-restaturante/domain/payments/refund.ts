export interface RefundInput {
  amount: number
  reason?: string
}

export function addRefundToSale(sale: any, refund: RefundInput, employeeName: string): any {
  if (!sale.refunds) sale.refunds = []
  sale.refunds.push({ ...refund, employeeName, timestamp: Date.now() })
  return sale
}
