import { describe, it, expect } from 'vitest'
import { toggleCuentaStatus } from '../application/TableStatus/toggle-table-status'

function makeFloor(status = 'ocupada') {
  return {
    tables: [{ id: 'mesa-1', name: 'Mesa 1', status }],
    orders: {},
  }
}

describe('toggleCuentaStatus', () => {
  it('toggles ocupada to cuenta', () => {
    const floor = makeFloor('ocupada')
    const next = toggleCuentaStatus(floor, 'mesa-1')
    expect(next.tables[0].status).toBe('cuenta')
  })

  it('toggles cuenta to ocupada', () => {
    const floor = makeFloor('cuenta')
    const next = toggleCuentaStatus(floor, 'mesa-1')
    expect(next.tables[0].status).toBe('ocupada')
  })

  it('returns null if table not found', () => {
    const floor = makeFloor()
    const next = toggleCuentaStatus(floor, 'bogus')
    expect(next).toBeNull()
  })

  it('does not mutate original floor', () => {
    const floor = makeFloor('ocupada')
    toggleCuentaStatus(floor, 'mesa-1')
    expect(floor.tables[0].status).toBe('ocupada')
  })
})
