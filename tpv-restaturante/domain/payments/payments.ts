import type { PaymentSplit, Payment } from '../types'

export type { PaymentSplit, Payment }

const METHOD_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  bizum: 'Bizum',
  fiado: 'Fiado',
}

export function buildPayments(splits: PaymentSplit[]): Payment[] {
  return splits.map(s => ({
    method: s.method,
    amount: round2(s.amount),
    ...(s.method === 'bizum' ? { confirmed: false } : {}),
  }))
}

export function isFiado(payments: Payment[]): boolean {
  return payments.some(p => p.method === 'fiado')
}

export function hasPendingBizum(payments: Payment[]): boolean {
  return payments.some(p => p.method === 'bizum' && p.confirmed === false)
}

export function formatPaymentMethod(payments: Payment[]): string {
  return payments.map(p => METHOD_LABELS[p.method] || p.method).join(' + ')
}

export function isCardPayment(payments: Payment[]): boolean {
  return payments.some(p => p.method === 'tarjeta')
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
