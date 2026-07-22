import { clone } from '@/components/constants'
import type { VerifiedEmployee } from '@/application/auth/verify-pin'
import type { Floor, Catalog, Employee } from '@/domain/types'
import { calculatePersonalDiscountAmount, applyDiscountRates, removeDiscountRates, buildEmployeeMonthlyUsage, buildEmployeeMonthlyUsageDecrement } from '@/domain/pricing/personal-discount'

export interface ApplyPersonalDiscountDeps {
  verifyEmployeePin: (pin: string) => Promise<VerifiedEmployee | null>
  getRates: () => Record<string, number>
  showToast: (msg: string) => void
  euros: (n: number) => string
}

export async function applyPersonalDiscount(
  floor: Floor,
  employees: Employee[],
  catalog: Catalog,
  orderId: string,
  employeePin: string,
  deps: ApplyPersonalDiscountDeps,
): Promise<{ floor: Floor; employees: Employee[] } | null> {
  const emp = await deps.verifyEmployeePin(employeePin)
  if (!emp) return null

  if (!emp.personalDiscountEnabled) {
    deps.showToast(`${emp.name} no tiene activado el descuento de personal`)
    return null
  }

  const next = clone(floor) as Floor
  const order = next.orders[orderId]
  if (!order) return null

  const rates = deps.getRates()
  const discountAmount = calculatePersonalDiscountAmount(order.items, rates, catalog)
  if (discountAmount <= 0) {
    deps.showToast('Ningún artículo recibe descuento según las tasas configuradas')
    return null
  }

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const used = emp.monthlyUsedMonth === currentMonth ? (emp.monthlyUsed || 0) : 0
  const remaining = emp.monthlyLimit - used
  if (discountAmount > remaining) {
    deps.showToast(`${emp.name} no tiene suficiente saldo: necesita ${deps.euros(discountAmount)} pero le queda ${deps.euros(remaining)}`)
    return null
  }

  order.items = applyDiscountRates(order.items, rates, catalog)
  order.personalDiscountEmployeeId = emp.id
  order.personalDiscountEmployeeName = emp.name
  order.personalDiscountApplied = true

  const empNext = buildEmployeeMonthlyUsage(employees, emp.id, discountAmount, now)
  deps.showToast(`Descuento personal aplicado — ${emp.name} (${deps.euros(discountAmount)})`)

  return { floor: next, employees: empNext }
}

export interface RemovePersonalDiscountDeps {
  getRates: () => Record<string, number>
  showToast: (msg: string) => void
}

export function removePersonalDiscount(
  floor: Floor,
  employees: Employee[],
  catalog: Catalog,
  orderId: string,
  deps: RemovePersonalDiscountDeps,
): { floor: Floor; employees: Employee[] } | null {
  const next = clone(floor) as Floor
  const order = next.orders[orderId]
  if (!order || !order.personalDiscountApplied) return null

  const empId = order.personalDiscountEmployeeId
  if (!empId) return null
  const rates = deps.getRates()
  const discountAmount = calculatePersonalDiscountAmount(order.items, rates, catalog)
  const now = new Date()

  const empNext = buildEmployeeMonthlyUsageDecrement(employees, empId, discountAmount, now)
  order.items = removeDiscountRates(order.items, rates, catalog)

  delete order.personalDiscountApplied
  delete order.personalDiscountEmployeeId
  delete order.personalDiscountEmployeeName

  deps.showToast('Descuento personal retirado')
  return { floor: next, employees: empNext }
}
