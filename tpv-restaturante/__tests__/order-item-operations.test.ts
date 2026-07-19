import { describe, it, expect } from 'vitest'
import {
  changeItemQuantity,
  updateItemNotes,
  removeItemFromOrder,
  sendToKitchenCourse,
  sendSingleItemToKitchen,
  updateItemCourse,
  markItemsReady,
  voidOrderItem,
  setLineDiscount,
  removeLineDiscount,
  setItemCourtesy,
  removeItemCourtesy,
  setItemOverridePrice,
} from '../application/OrderItemOperations/order-item-operations'

function makeFloor(overrides = {}): any {
  return {
    tables: [
      { id: 'mesa-1', name: 'Mesa 1', status: 'ocupada', orderIds: ['ord-1'], orderId: 'ord-1' },
      { id: 'mesa-2', name: 'Mesa 2', status: 'ocupada', orderIds: ['ord-2'], orderId: 'ord-2' },
    ],
    orders: {
      'ord-1': {
        tableId: 'mesa-1',
        items: [
          { id: 'item-1', name: 'Café', qty: 2, price: 2.5, sent: false, course: 'principal' },
          { id: 'item-2', name: 'Tarta', qty: 1, price: 4, sent: true, ubicacion: 'Cocina' },
        ],
      },
      'ord-2': {
        tableId: 'mesa-2',
        items: [
          { id: 'item-3', name: 'Agua', qty: 3, price: 1.5, sent: false },
        ],
      },
    },
    ...overrides,
  }
}

describe('changeItemQuantity', () => {
  it('increments item quantity', () => {
    const floor = makeFloor()
    const next = changeItemQuantity(floor, 'ord-1', 'item-1', 1)
    expect(next.orders['ord-1'].items.find((i: any) => i.id === 'item-1').qty).toBe(3)
  })

  it('decrements item quantity', () => {
    const floor = makeFloor()
    const next = changeItemQuantity(floor, 'ord-1', 'item-1', -1)
    expect(next.orders['ord-1'].items.find((i: any) => i.id === 'item-1').qty).toBe(1)
  })

  it('removes item when qty reaches 0', () => {
    const floor = makeFloor()
    const next = changeItemQuantity(floor, 'ord-1', 'item-1', -2)
    expect(next.orders['ord-1'].items.find((i: any) => i.id === 'item-1')).toBeUndefined()
  })

  it('returns null if item already sent', () => {
    const floor = makeFloor()
    const next = changeItemQuantity(floor, 'ord-1', 'item-2', 1)
    expect(next).toBeNull()
  })

  it('returns null if order not found', () => {
    const floor = makeFloor()
    const next = changeItemQuantity(floor, 'bogus', 'item-1', 1)
    expect(next).toBeNull()
  })
})

describe('updateItemNotes', () => {
  it('updates item notes', () => {
    const floor = makeFloor()
    const next = updateItemNotes(floor, 'ord-1', 'item-1', 'Sin azúcar')
    expect(next.orders['ord-1'].items.find((i: any) => i.id === 'item-1').notes).toBe('Sin azúcar')
  })

  it('returns null if order not found', () => {
    const floor = makeFloor()
    const next = updateItemNotes(floor, 'bogus', 'item-1', 'test')
    expect(next).toBeNull()
  })
})

describe('removeItemFromOrder', () => {
  it('removes item and keeps order if other items exist', () => {
    const floor = makeFloor()
    const next = removeItemFromOrder(floor, 'mesa-1', 'ord-1', 'item-1')
    expect(next.orders['ord-1'].items.find((i: any) => i.id === 'item-1')).toBeUndefined()
    expect(next.orders['ord-1']).toBeDefined()
  })

  it('deletes order and frees table when last item removed and single order', () => {
    const floor = makeFloor()
    floor.orders['ord-1'].items = [{ id: 'only-item', name: 'X', qty: 1, price: 1, sent: false }] as any
    const next = removeItemFromOrder(floor, 'mesa-1', 'ord-1', 'only-item')
    expect(next.orders['ord-1']).toBeUndefined()
    const table = next.tables.find((t: any) => t.id === 'mesa-1')
    expect(table.status).toBe('libre')
    expect(table.orderId).toBeNull()
  })

  it('returns null if order not found', () => {
    const floor = makeFloor()
    const next = removeItemFromOrder(floor, 'mesa-1', 'bogus', 'item-1')
    expect(next).toBeNull()
  })
})

describe('sendToKitchenCourse', () => {
  it('sends unsent items', () => {
    const floor = makeFloor()
    const next = sendToKitchenCourse(floor, 'ord-1')
    const items = next.orders['ord-1'].items
    expect(items.find((i: any) => i.id === 'item-1').sent).toBe(true)
    expect(items.find((i: any) => i.id === 'item-1').sentAt).toBeDefined()
  })

  it('filters by course when specified', () => {
    const floor = makeFloor()
    floor.orders['ord-1'].items.push({ id: 'item-4', name: 'Vino', qty: 1, price: 3, sent: false, course: 'bebida' })
    const next = sendToKitchenCourse(floor, 'ord-1', 'bebida')
    expect(next.orders['ord-1'].items.find((i: any) => i.id === 'item-1').sent).toBe(false)
    expect(next.orders['ord-1'].items.find((i: any) => i.id === 'item-4').sent).toBe(true)
  })
})

describe('sendSingleItemToKitchen', () => {
  it('sends a single item and returns metadata', () => {
    const floor = makeFloor()
    const result = sendSingleItemToKitchen(floor, 'ord-1', 'item-1')
    expect(result).not.toBeNull()
    if (!result) return
    expect(result.floor.orders['ord-1'].items.find((i: any) => i.id === 'item-1').sent).toBe(true)
    expect(result.itemName).toBe('Café')
    expect(result.tableName).toBe('Mesa 1')
  })

  it('returns null if already sent', () => {
    const floor = makeFloor()
    const result = sendSingleItemToKitchen(floor, 'ord-1', 'item-2')
    expect(result).toBeNull()
  })
})

describe('updateItemCourse', () => {
  it('updates course', () => {
    const floor = makeFloor()
    const next = updateItemCourse(floor, 'ord-1', 'item-1', 'bebida')
    expect(next.orders['ord-1'].items.find((i: any) => i.id === 'item-1').course).toBe('bebida')
  })
})

describe('markItemsReady', () => {
  it('marks sent items as ready and returns names', () => {
    const floor = makeFloor()
    floor.orders['ord-1'].items[0].sent = true
    const result = markItemsReady(floor, 'ord-1')
    expect(result).not.toBeNull()
    if (!result) return
    expect(result.floor.orders['ord-1'].items.find((i: any) => i.id === 'item-1').ready).toBe(true)
    expect(result.names).toContain('Café')
    expect(result.tableName).toBe('Mesa 1')
  })

  it('filters by ubicacion', () => {
    const floor = makeFloor()
    ;(floor.orders['ord-1'].items as any)[0] = { id: 'item-1', name: 'Café', qty: 1, price: 2, sent: true, ubicacion: 'Barra' }
    const result = markItemsReady(floor, 'ord-1', 'Cocina')
    expect(result).toBeNull()
  })

  it('returns null if no ready candidates', () => {
    const floor = makeFloor()
    const result = markItemsReady(floor, 'ord-1')
    expect(result).toBeNull()
  })
})

describe('voidOrderItem', () => {
  it('voids an item with reason', () => {
    const floor = makeFloor()
    const next = voidOrderItem(floor, 'ord-1', 'item-1', 'Cliente canceló', 'Juan')
    const item = next.orders['ord-1'].items.find((i: any) => i.id === 'item-1')
    expect(item.voided).toBe(true)
    expect(item.voidReason).toBe('Cliente canceló')
    expect(item.voidedBy).toBe('Juan')
    expect(item.voidedAt).toBeDefined()
  })
})

describe('line discounts', () => {
  it('sets line discount and removes courtesy', () => {
    const floor = makeFloor()
    const next = setLineDiscount(floor, 'ord-1', 'item-1', 50)
    const item = next.orders['ord-1'].items.find((i: any) => i.id === 'item-1')
    expect(item.lineDiscount).toBe(50)
    expect(item.isCourtesy).toBe(false)
  })

  it('removes line discount', () => {
    const floor = makeFloor()
    ;(floor.orders['ord-1'].items[0] as any).lineDiscount = 50
    const next = removeLineDiscount(floor, 'ord-1', 'item-1')
    expect(next.orders['ord-1'].items.find((i: any) => i.id === 'item-1').lineDiscount).toBe(0)
  })
})

describe('courtesy', () => {
  it('sets courtesy and removes discount', () => {
    const floor = makeFloor()
    ;(floor.orders['ord-1'].items[0] as any).lineDiscount = 30
    const next = setItemCourtesy(floor, 'ord-1', 'item-1')
    const item = next.orders['ord-1'].items.find((i: any) => i.id === 'item-1')
    expect(item.isCourtesy).toBe(true)
    expect(item.lineDiscount).toBe(0)
  })

  it('removes courtesy', () => {
    const floor = makeFloor()
    ;(floor.orders['ord-1'].items[0] as any).isCourtesy = true
    const next = removeItemCourtesy(floor, 'ord-1', 'item-1')
    expect(next.orders['ord-1'].items.find((i: any) => i.id === 'item-1').isCourtesy).toBe(false)
  })
})

describe('setItemOverridePrice', () => {
  it('sets override price', () => {
    const floor = makeFloor()
    const next = setItemOverridePrice(floor, 'ord-1', 'item-1', 3)
    expect(next.orders['ord-1'].items.find((i: any) => i.id === 'item-1').overridePrice).toBe(3)
  })

  it('clamps negative price to 0', () => {
    const floor = makeFloor()
    const next = setItemOverridePrice(floor, 'ord-1', 'item-1', -1)
    expect(next.orders['ord-1'].items.find((i: any) => i.id === 'item-1').overridePrice).toBe(0)
  })
})
