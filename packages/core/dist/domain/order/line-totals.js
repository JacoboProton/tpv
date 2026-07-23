"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateLineTotal = calculateLineTotal;
exports.calculateOrderSubtotal = calculateOrderSubtotal;
function calculateLineTotal(item, product) {
    if (item.voided || item.isCourtesy)
        return 0;
    const effectivePrice = item.overridePrice != null ? item.overridePrice : item.price;
    const defaultDisc = (product === null || product === void 0 ? void 0 : product.discount) || 0;
    const lineDisc = item.lineDiscount || 0;
    const appliedDisc = lineDisc > 0 ? lineDisc : defaultDisc;
    return effectivePrice * (1 - appliedDisc / 100) * item.qty;
}
function calculateOrderSubtotal(items, catalog) {
    return items.reduce((sum, item) => {
        var _a;
        const product = (_a = catalog === null || catalog === void 0 ? void 0 : catalog.products) === null || _a === void 0 ? void 0 : _a.find((p) => p.id === item.productId);
        return sum + calculateLineTotal(item, product);
    }, 0);
}
