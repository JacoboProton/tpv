"use client"

import { useCallback } from 'react'
import type { Floor, Catalog, Employee, Order } from '../domain/types'
import { calculatePersonalDiscountAmount } from '../domain/pricing/personal-discount'
import { euros } from '../components/constants'
import { verifyEmployeePin as verifyPin } from '../application/auth/verify-pin'
import { applyPersonalDiscount as applyPersonalDiscountOp, removePersonalDiscount as removePersonalDiscountOp } from '../application/ApplyPersonalDiscount/apply-personal-discount'

export function usePersonalDiscount(
  floor: Floor,
  employees: Employee[],
  catalog: Catalog,
  ticketSettings?: Record<string, unknown>,
  persistFloor?: (next: Floor) => Promise<void>,
  setEmployees?: (e: Employee[]) => void,
  showToast?: (msg: string) => void,
) {
  const getDiscountRates = useCallback(() => {
    const raw = ticketSettings?.personalDiscountRates
    try { return typeof raw === 'string' ? JSON.parse(raw) : raw || {} } catch { return {} }
  }, [ticketSettings])

  const calcPersonalDiscountAmount = useCallback((order: { items: Order['items'] }, rates: Record<string, number>) => {
    return calculatePersonalDiscountAmount(order.items, rates, catalog)
  }, [catalog])

  const applyPersonalDiscount = useCallback(async (orderId: string, employeePin: string): Promise<boolean> => {
    if (!persistFloor || !setEmployees || !showToast) return false
    const verifyWithToast = async (pin: string) => {
      const emp = await verifyPin(pin)
      if (!emp) showToast('PIN incorrecto')
      return emp
    }
    const result = await applyPersonalDiscountOp(floor, employees, catalog, orderId, employeePin, {
      verifyEmployeePin: verifyWithToast,
      getRates: getDiscountRates,
      showToast,
      euros,
    })
    if (!result) return false
    persistFloor(result.floor)
    setEmployees(result.employees)
    return true
  }, [floor, employees, catalog, getDiscountRates, persistFloor, showToast, setEmployees])

  const removePersonalDiscount = useCallback((orderId: string) => {
    if (!persistFloor || !setEmployees || !showToast) return
    const result = removePersonalDiscountOp(floor, employees, catalog, orderId, {
      getRates: getDiscountRates,
      showToast,
    })
    if (!result) return
    persistFloor(result.floor)
    setEmployees(result.employees)
  }, [floor, employees, catalog, getDiscountRates, persistFloor, showToast, setEmployees])

  return {
    getDiscountRates, calcPersonalDiscountAmount,
    applyPersonalDiscount, removePersonalDiscount,
  }
}
