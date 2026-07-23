"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateSubtotal = calculateSubtotal;
exports.calculateDiscountAmount = calculateDiscountAmount;
exports.calculateTotal = calculateTotal;
exports.calculateTotalWithTip = calculateTotalWithTip;
exports.calculateOrderTotals = calculateOrderTotals;
function calculateSubtotal(items) {
    return items.reduce((s, i) => s + i.price * i.qty, 0);
}
function calculateDiscountAmount(subtotal, discountPct) {
    return round2(subtotal * (discountPct / 100));
}
function calculateTotal(subtotal, discountAmount) {
    return round2(Math.max(0, subtotal - discountAmount));
}
function calculateTotalWithTip(total, tip) {
    return round2(total + tip);
}
function calculateOrderTotals(items, discountPct, offerDiscountAmount, tip) {
    const subtotal = calculateSubtotal(items);
    const pctDiscount = calculateDiscountAmount(subtotal, discountPct);
    const discountAmount = round2(pctDiscount + offerDiscountAmount);
    const total = calculateTotal(subtotal, discountAmount);
    const totalWithTip = calculateTotalWithTip(total, tip);
    return { subtotal, discountAmount, offerDiscountAmount, total, totalWithTip };
}
function round2(n) {
    return Math.round(n * 100) / 100;
}
