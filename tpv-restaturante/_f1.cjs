const fs = require('fs');
const CORE = '/f/tpv/packages/core/src';
function edit(file, from, to) {
  let s = fs.readFileSync(file, 'utf8');
  const eol = s.includes('\r\n') ? '\r\n' : '\n';
  from = from.replace(/\n/g, eol); to = to.replace(/\n/g, eol);
  if (s.includes(to)) { console.log('skip', file); return; }
  if (!s.includes(from)) { console.error('NOT FOUND', file, '\n', from.slice(0,90)); process.exit(1); }
  fs.writeFileSync(file, s.replace(from, to));
  console.log('ok', file);
}
// 1) schema: add cost column to products
edit('db/schema.ts',
`price: numeric({ precision: 10, scale:  2 }).notNull(),`,
`price: numeric({ precision: 10, scale:  2 }).notNull(),
  cost: numeric({ precision: 10, scale: 2 }).default('0').notNull(),`);
// 2) SaleItem cost
edit(CORE + '/domain/types.ts',
`export interface SaleItem {
  id: string
  productId?: string | null
  name: string
  price: number
  qty: number
  modifiers?: ModifierSelection[]
  notes?: string
  voided?: boolean
}`,
`export interface SaleItem {
  id: string
  productId?: string | null
  name: string
  price: number
  cost?: number
  qty: number
  modifiers?: ModifierSelection[]
  notes?: string
  voided?: boolean
}`);
// 3) close-order: snapshot cost into sale items
edit('application/CloseOrder/close-order.ts',
`    items: order.items.map((i) => ({ id: i.id, productId: i.productId, name: i.name, qty: i.qty, price: i.price || 0, voided: !!i.voided })),`,
`    items: order.items.map((i) => ({ id: i.id, productId: i.productId, name: i.name, qty: i.qty, price: i.price || 0, cost: Number(catalog.products.find(p => p.id === i.productId)?.cost ?? 0), voided: !!i.voided })),`);
