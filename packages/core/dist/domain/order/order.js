export function calculateSubtotal(items) {
    return items.reduce((s, i) => s + i.price * i.qty, 0);
}
export function calculateDiscountAmount(subtotal, discountPct) {
    return round2(subtotal * (discountPct / 100));
}
export function calculateTotal(subtotal, discountAmount) {
    return round2(Math.max(0, subtotal - discountAmount));
}
export function calculateTotalWithTip(total, tip) {
    return round2(total + tip);
}
export function calculateOrderTotals(items, discountPct, offerDiscountAmount, tip) {
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
//# sourceMappingURL=order.js.map