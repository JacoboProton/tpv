import { describe, it, expect } from 'vitest'
import {
  getItemState, canTransitionTo, isPending, isInKitchen,
  hasUnsentItems, hasPendingItems, countPendingLines,
  countPendingKitchenItems, formatItemPreview,
} from '../domain/kitchen/kitchen'

describe('getItemState', () => {
  it('returns voided first', () => { expect(getItemState({ id: '1', voided: true, sent: true })).toBe('voided') })
  it('returns served', () => { expect(getItemState({ id: '1', served: true })).toBe('served') })
  it('returns ready', () => { expect(getItemState({ id: '1', ready: true })).toBe('ready') })
  it('returns sent', () => { expect(getItemState({ id: '1', sent: true })).toBe('sent') })
  it('returns pending', () => { expect(getItemState({ id: '1' })).toBe('pending') })
})

describe('canTransitionTo', () => {
  it('allows forward transitions', () => {
    expect(canTransitionTo({ id: '1', sent: true }, 'ready')).toBe(true)
    expect(canTransitionTo({ id: '1' }, 'sent')).toBe(true)
  })
  it('blocks backward transitions', () => {
    expect(canTransitionTo({ id: '1', ready: true }, 'sent')).toBe(false)
    expect(canTransitionTo({ id: '1', served: true }, 'ready')).toBe(false)
  })
})

describe('isPending', () => {
  it('returns true for pending', () => { expect(isPending({ id: '1' })).toBe(true) })
  it('returns false for sent', () => { expect(isPending({ id: '1', sent: true })).toBe(false) })
})

describe('isInKitchen', () => {
  it('returns false for pending', () => { expect(isInKitchen({ id: '1' })).toBe(false) })
  it('returns true for sent', () => { expect(isInKitchen({ id: '1', sent: true })).toBe(true) })
  it('returns true for ready', () => { expect(isInKitchen({ id: '1', ready: true })).toBe(true) })
  it('returns false for served', () => { expect(isInKitchen({ id: '1', served: true })).toBe(false) })
})

describe('hasUnsentItems', () => {
  it('returns true if any item is pending', () => {
    expect(hasUnsentItems([{ id: '1', sent: true }, { id: '2' }])).toBe(true)
  })
  it('returns false if all are sent', () => {
    expect(hasUnsentItems([{ id: '1', sent: true }, { id: '2', sent: true }])).toBe(false)
  })
})

describe('hasPendingItems', () => {
  it('returns true if any item is sent', () => {
    expect(hasPendingItems([{ id: '1', sent: true }, { id: '2' }])).toBe(true)
  })
  it('returns false if no sent items', () => {
    expect(hasPendingItems([{ id: '1' }, { id: '2' }])).toBe(false)
  })
})

describe('countPendingLines', () => {
  it('counts unsent non-voided items', () => {
    expect(countPendingLines([
      { id: '1', sent: false },
      { id: '2', sent: false, voided: true },
      { id: '3', sent: true },
    ])).toBe(1)
  })
})

describe('countPendingKitchenItems', () => {
  it('counts sent-but-not-ready items across orders', () => {
    const floor: any = {
      tables: [],
      orders: {
        o1: { items: [{ id: 'i1', sent: true, ready: false }, { id: 'i2', sent: true, ready: true }] },
        o2: { items: [{ id: 'i3', sent: false }, { id: 'i4', sent: true, ready: false }] },
      },
    }
    expect(countPendingKitchenItems(floor)).toBe(2)
  })

  it('returns 0 for empty floor', () => {
    expect(countPendingKitchenItems({ tables: [], orders: {} })).toBe(0)
  })

  it('handles empty orders', () => {
    expect(countPendingKitchenItems({ tables: [], orders: {} } as any)).toBe(0)
  })
})

describe('formatItemPreview', () => {
  it('joins up to 3 names', () => {
    expect(formatItemPreview(['Café', 'Té', 'Zumo'])).toBe('Café, Té, Zumo')
  })

  it('adds suffix when more than max', () => {
    expect(formatItemPreview(['Café', 'Té', 'Zumo', 'Agua', 'Cerveza'])).toBe('Café, Té, Zumo y 2 más')
  })

  it('handles single item', () => {
    expect(formatItemPreview(['Café'])).toBe('Café')
  })

  it('respects custom max', () => {
    expect(formatItemPreview(['Café', 'Té', 'Zumo', 'Agua'], 2)).toBe('Café, Té y 2 más')
  })
})
