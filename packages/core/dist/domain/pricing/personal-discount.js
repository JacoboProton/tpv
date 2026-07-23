"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePersonalDiscountAmount = calculatePersonalDiscountAmount;
exports.applyDiscountRates = applyDiscountRates;
exports.removeDiscountRates = removeDiscountRates;
exports.buildEmployeeMonthlyUsage = buildEmployeeMonthlyUsage;
exports.buildEmployeeMonthlyUsageDecrement = buildEmployeeMonthlyUsageDecrement;
function calculatePersonalDiscountAmount(items, rates, catalog) {
    var _a;
    let total = 0;
    for (const item of items) {
        if (item.voided)
            continue;
        const p = (_a = catalog === null || catalog === void 0 ? void 0 : catalog.products) === null || _a === void 0 ? void 0 : _a.find((pr) => pr.id === item.productId);
        if (!p)
            continue;
        const rate = rates[p.category || ''] || 0;
        if (rate <= 0)
            continue;
        const effectivePrice = item.overridePrice != null ? item.overridePrice : item.price;
        total += effectivePrice * item.qty * rate / 100;
    }
    return Math.round((total + Number.EPSILON) * 100) / 100;
}
function applyDiscountRates(items, rates, catalog) {
    return items.map((item) => {
        var _a;
        if (item.voided)
            return item;
        const p = (_a = catalog === null || catalog === void 0 ? void 0 : catalog.products) === null || _a === void 0 ? void 0 : _a.find((pr) => pr.id === item.productId);
        if (!p)
            return item;
        const rate = rates[p.category || ''] || 0;
        return Object.assign(Object.assign({}, item), { lineDiscount: rate > 0 ? rate : 0, isCourtesy: rate > 0 ? false : item.isCourtesy });
    });
}
function removeDiscountRates(items, rates, catalog) {
    return items.map((item) => {
        var _a;
        const p = (_a = catalog === null || catalog === void 0 ? void 0 : catalog.products) === null || _a === void 0 ? void 0 : _a.find((pr) => pr.id === item.productId);
        if (!p)
            return item;
        const rate = rates[p.category || ''] || 0;
        if (rate > 0 && item.lineDiscount === rate) {
            return Object.assign(Object.assign({}, item), { lineDiscount: 0 });
        }
        return item;
    });
}
function buildEmployeeMonthlyUsage(employees, empId, discountAmount, now) {
    const d = now || new Date();
    const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return employees.map((e) => {
        if (e.id !== empId)
            return e;
        const used = e.monthlyUsedMonth === currentMonth ? (e.monthlyUsed || 0) : 0;
        return Object.assign(Object.assign({}, e), { monthlyUsedMonth: currentMonth, monthlyUsed: used + discountAmount });
    });
}
function buildEmployeeMonthlyUsageDecrement(employees, empId, discountAmount, now) {
    const d = now || new Date();
    const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return employees.map((e) => {
        if (e.id !== empId)
            return e;
        const used = e.monthlyUsedMonth === currentMonth ? (e.monthlyUsed || 0) : 0;
        return Object.assign(Object.assign({}, e), { monthlyUsedMonth: currentMonth, monthlyUsed: Math.max(0, used - discountAmount) });
    });
}
