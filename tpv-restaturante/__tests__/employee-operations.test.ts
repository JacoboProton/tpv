import { describe, it, expect } from 'vitest'
import type { Employee, Floor } from '../domain/types'
import { createEmployee, canDeleteEmployee, buildTrainingFloor } from '../domain/employees/employee-operations'

describe('createEmployee', () => {
  it('creates an employee with id', () => {
    const e = createEmployee({ name: 'Juan', role: 'camarero' })
    expect(e.id).toMatch(/^e_\d+$/)
    expect(e.name).toBe('Juan')
    expect(e.role).toBe('camarero')
  })
})

describe('canDeleteEmployee', () => {
  const employees: Employee[] = [
    { id: 'e1', name: 'Admin1', role: 'admin' },
    { id: 'e2', name: 'Admin2', role: 'admin' },
    { id: 'e3', name: 'Camarero1', role: 'camarero' },
  ]

  it('allows deleting non-admin', () => {
    expect(canDeleteEmployee(employees, 'e3')).toEqual({ allowed: true })
  })

  it('allows deleting admin if another admin remains', () => {
    expect(canDeleteEmployee(employees, 'e1')).toEqual({ allowed: true })
  })

  it('blocks deleting last admin', () => {
    const singleAdmin: Employee[] = [{ id: 'e1', name: 'SoloAdmin', role: 'admin' }]
    expect(canDeleteEmployee(singleAdmin, 'e1')).toEqual({
      allowed: false,
      error: 'Tiene que quedar al menos un administrador',
    })
  })

  it('allows deleting non-existent employee', () => {
    expect(canDeleteEmployee(employees, 'e999')).toEqual({ allowed: true })
  })
})

describe('buildTrainingFloor', () => {
  const floor: Floor = {
    tables: [
      { id: 't1', name: 'Mesa 1', orderId: 'o1', orderIds: ['o1'], status: 'ocupada', reserved: true, isFiado: true } as any,
      { id: 't2', name: 'Mesa 2' },
    ],
    orders: { o1: { id: 'o1', items: [] } },
    history: { some: ['data'] },
  }

  it('resets all tables to free', () => {
    const result = buildTrainingFloor(floor)
    result.tables.forEach((t: any) => {
      expect(t.orderId).toBeNull()
      expect(t.orderIds).toEqual([])
      expect(t.status).toBe('libre')
      expect(t.reserved).toBeNull()
      expect(t.isFiado).toBe(false)
    })
  })

  it('clears orders and history', () => {
    const result = buildTrainingFloor(floor)
    expect(result.orders).toEqual({})
    expect(result.history).toEqual({})
  })

  it('preserves table names and ids', () => {
    const result = buildTrainingFloor(floor)
    expect(result.tables[0].name).toBe('Mesa 1')
    expect(result.tables[1].id).toBe('t2')
  })

  it('handles null tables', () => {
    const result = buildTrainingFloor({})
    expect(result.tables).toEqual([])
  })
})
