"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyPersonalDiscount = applyPersonalDiscount;
exports.removePersonalDiscount = removePersonalDiscount;
const constants_1 = require("@/components/constants");
const personal_discount_1 = require("@/domain/pricing/personal-discount");
async function applyPersonalDiscount(floor, employees, catalog, orderId, employeePin, deps) {
    const emp = await deps.verifyEmployeePin(employeePin);
    if (!emp)
        return null;
    if (!emp.personalDiscountEnabled) {
        deps.showToast(`${emp.name} no tiene activado el descuento de personal`);
        return null;
    }
    const next = (0, constants_1.clone)(floor);
    const order = next.orders[orderId];
    if (!order)
        return null;
    const rates = deps.getRates();
    const discountAmount = (0, personal_discount_1.calculatePersonalDiscountAmount)(order.items, rates, catalog);
    if (discountAmount <= 0) {
        deps.showToast('Ningún artículo recibe descuento según las tasas configuradas');
        return null;
    }
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const used = emp.monthlyUsedMonth === currentMonth ? (emp.monthlyUsed || 0) : 0;
    const remaining = emp.monthlyLimit - used;
    if (discountAmount > remaining) {
        deps.showToast(`${emp.name} no tiene suficiente saldo: necesita ${deps.euros(discountAmount)} pero le queda ${deps.euros(remaining)}`);
        return null;
    }
    order.items = (0, personal_discount_1.applyDiscountRates)(order.items, rates, catalog);
    order.personalDiscountEmployeeId = emp.id;
    order.personalDiscountEmployeeName = emp.name;
    order.personalDiscountApplied = true;
    const empNext = (0, personal_discount_1.buildEmployeeMonthlyUsage)(employees, emp.id, discountAmount, now);
    deps.showToast(`Descuento personal aplicado — ${emp.name} (${deps.euros(discountAmount)})`);
    return { floor: next, employees: empNext };
}
function removePersonalDiscount(floor, employees, catalog, orderId, deps) {
    const next = (0, constants_1.clone)(floor);
    const order = next.orders[orderId];
    if (!order || !order.personalDiscountApplied)
        return null;
    const empId = order.personalDiscountEmployeeId;
    if (!empId)
        return null;
    const rates = deps.getRates();
    const discountAmount = (0, personal_discount_1.calculatePersonalDiscountAmount)(order.items, rates, catalog);
    const now = new Date();
    const empNext = (0, personal_discount_1.buildEmployeeMonthlyUsageDecrement)(employees, empId, discountAmount, now);
    order.items = (0, personal_discount_1.removeDiscountRates)(order.items, rates, catalog);
    delete order.personalDiscountApplied;
    delete order.personalDiscountEmployeeId;
    delete order.personalDiscountEmployeeName;
    deps.showToast('Descuento personal retirado');
    return { floor: next, employees: empNext };
}
