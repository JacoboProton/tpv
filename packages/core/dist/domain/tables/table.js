"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.determineTableStatus = determineTableStatus;
exports.isDebtPayment = isDebtPayment;
exports.closeTableOrders = closeTableOrders;
exports.removeOrderFromTable = removeOrderFromTable;
exports.clearTable = clearTable;
function determineTableStatus(orderIds, isReserved) {
    if (!orderIds || orderIds.length === 0)
        return isReserved ? 'ocupada' : 'libre';
    if (orderIds.length > 1)
        return 'unidas';
    return 'ocupada';
}
function isDebtPayment(order, isFiado) {
    return isFiado && order.items.length === 1 && order.items[0].productId === null;
}
function closeTableOrders(table, closedOrderId) {
    const orderIds = (table.orderIds || []).filter(id => id !== closedOrderId);
    if (orderIds.length === 0) {
        return { orderId: null, orderIds: [], status: 'libre', isFiado: false };
    }
    return {
        orderId: orderIds[0],
        orderIds,
        status: orderIds.length > 1 ? 'unidas' : 'ocupada',
        isFiado: table.isFiado || false,
    };
}
function removeOrderFromTable(table, orderId) {
    const orderIds = (table.orderIds || []).filter(id => id !== orderId);
    if (orderIds.length === 0) {
        return { orderId: null, orderIds: [], status: table.reserved ? 'ocupada' : 'libre' };
    }
    return {
        orderId: orderIds[0],
        orderIds,
        status: 'ocupada',
    };
}
function clearTable(table) {
    return { orderId: null, orderIds: [], status: 'libre', isFiado: false };
}
