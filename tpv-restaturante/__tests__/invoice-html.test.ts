import { describe, it, expect } from 'vitest'
import { buildInvoiceHtml } from '../domain/invoice/invoice-html'

const settings = {
  restaurantName: 'La Comanda',
  companyCif: 'B12345678',
  companyAddress: 'Calle Mayor 1',
  companyPhone: '928123456',
  footerText: 'Gracias por su visita',
}

const sale = {
  id: 's1',
  invoiceNumber: 'INV-2026-00001',
  ticketNumber: '42',
  total: 107,
  items: [
    { name: 'Caf\xe9', qty: 2, price: 3 },
    { name: 'T\xe9', qty: 1, price: 2.5 },
  ],
  closedAt: new Date('2026-07-19T12:30:00').getTime(),
  invoiceName: 'Cliente A',
  invoiceNif: '12345678Z',
  invoiceAddress: 'Av. Principal 10',
  tableName: 'Mesa 3',
  employeeName: 'Juan',
}

describe('buildInvoiceHtml', () => {
  it('includes restaurant name', () => {
    const html = buildInvoiceHtml(settings, sale)
    expect(html).toContain('La Comanda')
  })

  it('includes invoice number', () => {
    const html = buildInvoiceHtml(settings, sale)
    expect(html).toContain('INV-2026-00001')
  })

  it('includes ticket number', () => {
    const html = buildInvoiceHtml(settings, sale)
    expect(html).toContain('Ticket #42')
  })

  it('includes item names and quantities', () => {
    const html = buildInvoiceHtml(settings, sale)
    expect(html).toContain('Caf')
    expect(html).toContain('T')
    expect(html).toContain('2</td>')
    expect(html).toContain('6,00 ')
  })

  it('includes company info', () => {
    const html = buildInvoiceHtml(settings, sale)
    expect(html).toContain('B12345678')
    expect(html).toContain('Calle Mayor 1')
    expect(html).toContain('928123456')
  })

  it('includes client info', () => {
    const html = buildInvoiceHtml(settings, sale)
    expect(html).toContain('Cliente A')
    expect(html).toContain('12345678Z')
    expect(html).toContain('Av. Principal 10')
  })

  it('includes table and waiter', () => {
    const html = buildInvoiceHtml(settings, sale)
    expect(html).toContain('Mesa 3')
    expect(html).toContain('Juan')
  })

  it('includes IGIC breakdown', () => {
    const html = buildInvoiceHtml(settings, sale)
    expect(html).toContain('Base Imponible')
    expect(html).toContain('IGIC 7%')
    expect(html).toContain('TOTAL')
  })

  it('calculates IGIC correctly for 107 total', () => {
    const html = buildInvoiceHtml(settings, sale)
    expect(html).toContain('100,00')
    expect(html).toContain('7,00')
  })

  it('escapes < in item names', () => {
    const saleWithHtml = { ...sale, items: [{ name: '<script>', qty: 1, price: 5 }] }
    const html = buildInvoiceHtml(settings, saleWithHtml)
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>')
  })

  it('shows tip and discount when present', () => {
    const saleWithExtras = { ...sale, tip: 2, discount: 10 }
    const html = buildInvoiceHtml(settings, saleWithExtras)
    expect(html).toContain('Propina')
    expect(html).toContain('Descuento aplicado')
  })

  it('falls back to defaults for missing fields', () => {
    const saleMin = { id: 's2', total: 0, closedAt: 0, items: [] }
    const html = buildInvoiceHtml({}, saleMin)
    expect(html).toContain('FACTURA')
    expect(html).toContain('Gracias por su visita')
  })
})
