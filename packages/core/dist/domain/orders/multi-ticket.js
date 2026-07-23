"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTicket = createTicket;
exports.deleteTicket = deleteTicket;
exports.renameTicket = renameTicket;
exports.linkCustomer = linkCustomer;
exports.unlinkCustomer = unlinkCustomer;
function createTicket(floor, tableId, employeeName) {
    var _a;
    const next = JSON.parse(JSON.stringify(floor));
    const table = next.tables.find((t) => t.id === tableId);
    if (!table)
        return { floor, orderId: '', ticketNum: 0 };
    const orderId = 'o_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const ticketNum = (((_a = table.orderIds) === null || _a === void 0 ? void 0 : _a.length) || 0) + 1;
    next.orders[orderId] = {
        id: orderId, tableId, items: [], createdAt: Date.now(),
        employeeName: employeeName || '', label: `#${ticketNum}`,
    };
    if (!table.orderIds)
        table.orderIds = [];
    table.orderIds.push(orderId);
    table.orderId = orderId;
    if (table.status === 'libre')
        table.status = 'ocupada';
    return { floor: next, orderId, ticketNum };
}
function deleteTicket(floor, tableId, orderId) {
    const next = JSON.parse(JSON.stringify(floor));
    const table = next.tables.find((t) => t.id === tableId);
    const order = next.orders[orderId];
    if (!table || !order || order.items.length > 0)
        return { floor, activeOrderId: null };
    delete next.orders[orderId];
    table.orderIds = (table.orderIds || []).filter((id) => id !== orderId);
    if (table.orderIds.length === 0) {
        table.orderId = null;
        if (!table.reserved)
            table.status = 'libre';
    }
    else {
        table.orderId = table.orderIds[0];
    }
    return { floor: next, activeOrderId: table.orderId || null };
}
function renameTicket(floor, orderId, label) {
    const next = JSON.parse(JSON.stringify(floor));
    const order = next.orders[orderId];
    if (order)
        order.label = label;
    return next;
}
function linkCustomer(floor, orderId, customer) {
    const next = JSON.parse(JSON.stringify(floor));
    const order = next.orders[orderId];
    if (order)
        order.customer = customer;
    return next;
}
function unlinkCustomer(floor, orderId) {
    const next = JSON.parse(JSON.stringify(floor));
    const order = next.orders[orderId];
    if (order)
        order.customer = null;
    return next;
}
