import { describe, it, expect } from 'vitest'
import { buildInvoiceHtml } from '../domain/invoice/invoice-html'
import type { Sale } from '../domain/types'

const settings = { restaurantName: 'LA COMANDA', companyCif: '78406450W', companyAddress: 'C/ Test 1', companyPhone: '922000000', footerText: 'Gracias' }

function makeSale(overrides: Partial<Sale> = {}): Sale {
  return {
    id: 's1',
    items: [],
    subtotal: 10,
    discount: 0,
    total: 10,
    tip: 0,
    totalWithTip: 10,
    paymentMethod: 'efectivo',
    payments: [],
    isFiado: false,
    closedAt: Date.now(),
    ...overrides,
  }
}

describe('buildInvoiceHtml', () => {
  it('escapes html in item names', () => {
    const sale = makeSale({ items: [{ id: 'i1', productId: 'p1', name: 'Café <script>alert(1)</script>', price: 1, qty: 1 }] })
    const html = buildInvoiceHtml(settings, sale)
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>')
  })

  it('escapes quotes and ampersands', () => {
    const sale = makeSale({ items: [{ id: 'i1', productId: 'p1', name: 'Jugo "doble" & extra', price: 2, qty: 1 }] })
    const html = buildInvoiceHtml(settings, sale)
    expect(html).toContain('&quot;doble&quot; &amp; extra')
    expect(html).not.toContain('"doble"')
  })

  it('escapes client fields', () => {
    const sale = makeSale({ invoiceName: 'Pepito <img src=x onerror=alert(1)>', invoiceNif: '12345678A', invoiceAddress: 'Calle <b>Real</b>' })
    const html = buildInvoiceHtml(settings, sale)
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<b>')
    expect(html).toContain('&lt;b&gt;')
  })

  it('escapes restaurant settings', () => {
    const html = buildInvoiceHtml({ ...settings, restaurantName: 'LA <i>COMANDA</i>', footerText: 'Vuelva <script>x</script>' }, makeSale())
    expect(html).not.toContain('<i>')
    expect(html).not.toContain('<script>')
  })

  it('renders normal content untouched', () => {
    const sale = makeSale({ items: [{ id: 'i1', productId: 'p1', name: 'Café', price: 1.5, qty: 2 }], invoiceName: 'Ana', tableName: 'Mesa 3' })
    const html = buildInvoiceHtml(settings, sale)
    expect(html).toContain('>Café<')
    expect(html).toContain('</strong> Ana</p>')
    expect(html).toContain('Mesa 3')
  })
})
