import type { Sale } from '../types.js'

export function confirmBizumPayments(sale: Sale): Sale {
  const payments = (sale.payments || []).map((p) =>
    p.method === 'bizum' ? { ...p, confirmed: true } : p
  )
  return { ...sale, payments, hasPendingBizum: undefined }
}
