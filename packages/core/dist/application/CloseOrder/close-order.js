import { calculateOfferDiscount } from '../../domain/pricing/offers.js';
import { calculateOrderTotals } from '../../domain/order/order.js';
import { buildPayments, isFiado, hasPendingBizum, formatPaymentMethod } from '../../domain/payments/payments.js';
import { closeTableOrders, isDebtPayment } from '../../domain/tables/table.js';
import { deductStock } from '../../domain/inventory/stock.js';
import { clone } from '../../lib/utils.js';
import { generateInvoiceNumber } from '../../domain/invoice/invoice.js';
function buildStockLogs(order, catalog, modOptMap, employeeName) {
    const nextCatalog = clone(catalog);
    const stockLogs = [];
    const now = Date.now();
    for (const item of order.items) {
        if (item.productId) {
            const p = nextCatalog.products.find((pr) => pr.id === item.productId);
            if (p) {
                const { stockByLocation, newStock } = deductStock(p.stockByLocation, p.ubicacion || 'Bar', item.qty);
                p.stockByLocation = stockByLocation;
                stockLogs.push({
                    productId: item.productId,
                    productName: item.name,
                    oldStock: newStock + item.qty,
                    newStock,
                    reason: 'venta',
                    employeeName,
                    createdAt: now,
                });
            }
        }
        if (item.modifiers) {
            for (const m of item.modifiers) {
                const opt = modOptMap[m.optionId];
                if ((opt === null || opt === void 0 ? void 0 : opt.stockDeduct) && opt.stockArticleId) {
                    const p = nextCatalog.products.find((pr) => pr.id === opt.stockArticleId);
                    if (p) {
                        const qty = (opt.stockQuantity || 0) * item.qty;
                        const { stockByLocation, newStock } = deductStock(p.stockByLocation, p.ubicacion || 'Bar', qty);
                        p.stockByLocation = stockByLocation;
                        stockLogs.push({
                            productId: opt.stockArticleId,
                            productName: p.name,
                            oldStock: newStock + qty,
                            newStock,
                            reason: 'venta (modificador)',
                            employeeName,
                            createdAt: now,
                        });
                    }
                }
            }
        }
    }
    return { nextCatalog, stockLogs };
}
export function executeCloseOrder(input) {
    var _a, _b;
    const { floor, selectedTableId, order, catalog, modifierData, offers, orderDiscount, tipAmount, tipMethod, paymentSplits, paymentIntentId, currentUser, invoice, trainingMode } = input;
    const nextFloor = clone(floor);
    const table = nextFloor.tables.find((t) => t.id === selectedTableId);
    const wasDebt = isDebtPayment(order, (_a = table.isFiado) !== null && _a !== void 0 ? _a : false);
    const warnings = [];
    const unsentItems = order.items.filter((i) => !i.sent && !i.voided);
    const pendingItems = order.items.filter((i) => i.sent && !i.ready && !i.voided && !i.served);
    if (unsentItems.length > 0 || pendingItems.length > 0) {
        const parts = [];
        if (unsentItems.length > 0)
            parts.push(`${unsentItems.length} artículo(s) sin enviar a cocina`);
        if (pendingItems.length > 0)
            parts.push(`${pendingItems.length} artículo(s) en preparación`);
        warnings.push(`Hay ${parts.join(' y ')}.`);
    }
    const modOptMap = {};
    for (const g of modifierData.groups) {
        for (const o of g.options || []) {
            modOptMap[o.id] = o;
        }
    }
    const { nextCatalog, stockLogs } = buildStockLogs(order, catalog, modOptMap, currentUser === null || currentUser === void 0 ? void 0 : currentUser.name);
    const offerDiscountAmount = calculateOfferDiscount(order.items, offers);
    const { subtotal, discountAmount, total, totalWithTip } = calculateOrderTotals(order.items, orderDiscount, offerDiscountAmount, tipAmount);
    const payments = buildPayments(paymentSplits);
    const fiado = isFiado(payments);
    const pendingBizum = hasPendingBizum(payments);
    const methodLabel = formatPaymentMethod(payments);
    const wantInvoice = !!(invoice.nif.trim() && invoice.name.trim());
    const invNum = wantInvoice ? generateInvoiceNumber() : '';
    const sale = {
        id: 's_' + Date.now(),
        tableId: table.id,
        tableName: table.name,
        items: order.items.map((i) => ({ id: i.id, productId: i.productId, name: i.name, qty: i.qty, price: i.price || 0, voided: !!i.voided })),
        subtotal,
        discount: orderDiscount,
        discountAmount,
        total,
        tip: tipAmount,
        tipMethod,
        totalWithTip,
        invoiceNif: wantInvoice ? invoice.nif : '',
        invoiceName: wantInvoice ? invoice.name : '',
        invoiceAddress: wantInvoice ? invoice.address : '',
        invoiceEmail: wantInvoice ? invoice.email : '',
        invoiceNumber: invNum,
        invoiceCreated: wantInvoice,
        invoiceCreatedAt: wantInvoice ? Date.now() : null,
        paymentIntentId,
        payments: fiado ? [{ method: 'fiado', amount: totalWithTip }] : payments,
        paymentMethod: methodLabel,
        isFiado: fiado,
        hasPendingBizum: pendingBizum,
        isDebtPayment: wasDebt,
        offerDiscount: offerDiscountAmount,
        employeeId: (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id) || undefined,
        employeeName: (currentUser === null || currentUser === void 0 ? void 0 : currentUser.name) || 'Sin asignar',
        closedAt: Date.now(),
        ticketNumber: Date.now(),
    };
    const closedOrder = Object.assign(Object.assign({}, order), { closedAt: Date.now(), createdAt: (_b = order.createdAt) !== null && _b !== void 0 ? _b : Date.now() });
    if (!nextFloor.history)
        nextFloor.history = {};
    if (!nextFloor.history[table.id])
        nextFloor.history[table.id] = [];
    nextFloor.history[table.id].push(closedOrder);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    nextFloor.history[table.id] = nextFloor.history[table.id].filter((h) => (h.closedAt || h.createdAt) >= todayStart.getTime());
    const closedOid = table.orderId;
    if (closedOid) {
        delete nextFloor.orders[closedOid];
        Object.assign(table, closeTableOrders(table, closedOid));
    }
    return { nextFloor, nextCatalog, sale, stockLogs, warnings, wasDebt };
}
//# sourceMappingURL=close-order.js.map