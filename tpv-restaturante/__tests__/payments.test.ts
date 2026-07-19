import { describe, it, expect } from 'vitest'
import { addRefundToSale } from '../domain/payments/refund'
import { confirmBizumPayments } from '../domain/payments/bizum'

describe('addRefundToSale', () => {
  it('adds a refund to the sale', () => {
    const sale: any = { id: 's1', total: 100 }
    const result = addRefundToSale(sale, { amount: 10, reason: 'Cliente insatisfecho' }, 'Juan')
    expect(result.refunds).toHaveLength(1)
    expect(result.refunds[0].amount).toBe(10)
    expect(result.refunds[0].reason).toBe('Cliente insatisfecho')
    expect(result.refunds[0].employeeName).toBe('Juan')
    expect(result.refunds[0].timestamp).toBeTypeOf('number')
  })

  it('appends to existing refunds', () => {
    const sale: any = { id: 's1', total: 100, refunds: [{ amount: 5 }] }
    const result = addRefundToSale(sale, { amount: 3 }, 'Ana')
    expect(result.refunds).toHaveLength(2)
    expect(result.refunds[1].amount).toBe(3)
  })

  it('works without reason', () => {
    const sale: any = { id: 's1', total: 50 }
    const result = addRefundToSale(sale, { amount: 5 }, 'Luis')
    expect(result.refunds[0].reason).toBeUndefined()
  })
})

describe('confirmBizumPayments', () => {
  it('marks bizum payments as confirmed', () => {
    const sale: any = {
      id: 's1',
      payments: [
        { method: 'bizum', amount: 20, confirmed: false },
        { method: 'efectivo', amount: 10 },
      ],
    }
    const result = confirmBizumPayments(sale)
    expect(result.payments[0].confirmed).toBe(true)
    expect(result.payments[1].confirmed).toBeUndefined()
    expect(result.hasPendingBizum).toBeUndefined()
  })

  it('handles empty payments', () => {
    const result = confirmBizumPayments({ id: 's1', payments: [] })
    expect(result.payments).toEqual([])
  })

  it('handles no payments field', () => {
    const result = confirmBizumPayments({ id: 's1' })
    expect(result.payments).toEqual([])
  })
})
