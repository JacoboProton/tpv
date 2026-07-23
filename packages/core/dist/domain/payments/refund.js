"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRefundToSale = addRefundToSale;
function addRefundToSale(sale, refund, employeeName) {
    if (!sale.refunds)
        sale.refunds = [];
    const entry = Object.assign(Object.assign({}, refund), { employeeName, timestamp: Date.now() });
    sale.refunds.push(entry);
    return sale;
}
