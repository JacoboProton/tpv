import { describe, it, expect, vi, afterEach } from 'vitest'
import { executeCloseOrder } from '../application/CloseOrder/close-order'
import type { CloseOrderInput } from '../application/CloseOrder/close-order'

function makeInput(): CloseOrderInput {
  return {
    floor: {
      tables: [{ id: 'mesa-1', name: 'Mesa 1', orderId: 'ord_1', orderIds: [], status: 'ocupada' }],
      orders: { ord_1: {} },
      zones: [],
      sales: [],
      history: {},
      vectorClock: {},
    } as unknown as CloseOrderInput['floor'],
    selectedTableId: 'mesa-1',
    order: {
      id: 'ord_1',
      tableId: 'mesa-1',
      items: [{ id: 'it-1', productId: 'p-1', name: 'Cerveza', qty: 2, price: 3, sent: true, ready: true, served: true }],
      createdAt: 0,
    } as unknown as CloseOrderInput['order'],
    catalog: {
      products: [{ id: 'p-1', name: 'Cerveza', cost: 1, stockByLocation: {} }],
      categories: [],
    } as unknown as CloseOrderInput['catalog'],
    modifierData: { groups: [] },
    offers: [],
    orderDiscount: 0,
    tipAmount: 0,
    tipMethod: 'efectivo',
    paymentSplits: [{ method: 'efectivo', amount: 6 }],
    paymentIntentId: '',
    currentUser: { id: 'e1', name: 'Alice' },
    invoice: { nif: '', name: '', address: '', email: '' },
    trainingMode: false,
  }
}

describe('executeCloseOrder sale id', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('generates unique sale ids for closes in the same millisecond', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234567890000)

    const first = executeCloseOrder(makeInput())
    const second = executeCloseOrder(makeInput())

    expect(first.sale.id).toBeDefined()
    expect(second.sale.id).toBeDefined()
    expect(first.sale.id).not.toBe(second.sale.id)
  })

  it('keeps the s_ prefix and a timestamp component', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234567890000)

    const { sale } = executeCloseOrder(makeInput())

    expect(sale.id).toMatch(/^s_1234567890000_[a-z0-9]+$/)
  })
})
