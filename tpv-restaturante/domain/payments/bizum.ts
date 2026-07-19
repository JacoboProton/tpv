export function confirmBizumPayments(sale: any): any {
  const payments = (sale.payments || []).map((p: any) =>
    p.method === 'bizum' ? { ...p, confirmed: true } : p
  )
  return { ...sale, payments, hasPendingBizum: undefined }
}
