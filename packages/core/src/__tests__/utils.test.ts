import { describe, it, expect } from 'vitest'
import { euros, round2, clone } from '../lib/utils'

describe('euros', () => {
  it('formats numbers as euros', () => {
    expect(euros(10)).toContain('10')
    expect(euros(10)).toContain('€')
  })

  it('shows 2 decimal places', () => {
    expect(euros(10.5)).toContain('10,50')
  })

  it('formats zero', () => {
    expect(euros(0)).toContain('0,00')
  })

  it('formats large numbers', () => {
    const result = euros(1234.56)
    expect(result).toContain('1234')
    expect(result).toContain('56')
    expect(result).toContain('€')
  })
})

describe('round2', () => {
  it('rounds to 2 decimals', () => {
    expect(round2(10.456)).toBe(10.46)
    expect(round2(10.001)).toBe(10)
  })

  it('rounds negative numbers', () => {
    expect(round2(-10.456)).toBe(-10.46)
  })

  it('handles whole numbers', () => {
    expect(round2(5)).toBe(5)
  })
})

describe('clone', () => {
  it('deep clones objects', () => {
    const obj = { a: 1, b: { c: 2 } }
    const cloned = clone(obj)
    expect(cloned).toEqual(obj)
    expect(cloned).not.toBe(obj)
    expect(cloned.b).not.toBe(obj.b)
  })

  it('clones arrays', () => {
    const arr = [1, [2, 3]]
    const cloned = clone(arr)
    expect(cloned).toEqual(arr)
    expect(cloned).not.toBe(arr)
    expect(cloned[1]).not.toBe(arr[1])
  })

  it('handles null', () => {
    expect(clone(null)).toBeNull()
  })
})
