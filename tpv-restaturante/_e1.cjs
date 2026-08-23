const fs = require('fs');
const path = require('path');
const APP = process.cwd();
const CORE = path.resolve(APP, '..', 'packages', 'core', 'src');
function edit(file, from, to) {
  const s = fs.readFileSync(file, 'utf8');
  from = from.replace(/\n/g, '\r\n');
  to = to.replace(/\n/g, '\r\n');
  if (!s.includes(from)) { console.error('NOT FOUND in', file, '\n---\n', from.slice(0,90)); process.exit(1); }
  fs.writeFileSync(file, s.replace(from, to));
  console.log('ok', file.replace(APP,''));
}
edit(CORE + '/domain/types.ts',
`export interface Payment {
  method: string
  amount: number
  confirmed?: boolean
  itemIds?: string[]
}

export interface PaymentSplit {
  method: string
  amount: number
}`,
`export interface Payment {
  method: string
  amount: number
  confirmed?: boolean
  itemIds?: string[]
  code?: string
}

export interface PaymentSplit {
  method: string
  amount: number
  code?: string
}`);
edit(CORE + '/application/payments/payment-splits.ts',
`export interface PaymentSplitState {
  id: string
  method: string
  amount: number
  itemIds?: string[]
}`,
`export interface PaymentSplitState {
  id: string
  method: string
  amount: number
  itemIds?: string[]
  code?: string
}`);
edit(CORE + '/domain/payments/payments.ts',
`const METHOD_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  bizum: 'Bizum',
  fiado: 'Fiado',
}`,
`const METHOD_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  bizum: 'Bizum',
  fiado: 'Fiado',
  gift: 'Tarjeta regalo',
}`);
edit(CORE + '/domain/payments/payments.ts',
`export function buildPayments(splits: PaymentSplit[]): Payment[] {
  return splits.map(s => ({
    method: s.method,
    amount: round2(s.amount),
    ...(s.method === 'bizum' ? { confirmed: false } : {}),
  }))
}`,
`export function buildPayments(splits: PaymentSplit[]): Payment[] {
  return splits.map(s => ({
    method: s.method,
    amount: round2(s.amount),
    ...(s.code ? { code: s.code } : {}),
    ...(s.method === 'bizum' ? { confirmed: false } : {}),
  }))
}`);
