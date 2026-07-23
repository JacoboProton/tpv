"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelTable = cancelTable;
exports.voidTable = voidTable;
const constants_1 = require("@/components/constants");
function cancelTable(floor, tableId, employeeName) {
    const next = (0, constants_1.clone)(floor);
    const table = next.tables.find((t) => t.id === tableId);
    if (!table)
        return { floor, cancelled: [] };
    const cancelled = [];
    const orderIds = [...(table.orderIds || [])];
    for (const oid of orderIds) {
        const order = next.orders[oid];
        if (order) {
            cancelled.push({
                tableId,
                tableName: table.name || tableId,
                orderId: oid,
                items: order.items,
                total: order.items.reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0),
                employeeName,
                cancelledAt: Date.now(),
            });
            delete next.orders[oid];
        }
    }
    table.orderIds = [];
    table.orderId = null;
    table.status = 'libre';
    table.isFiado = false;
    return { floor: next, cancelled };
}
function voidTable(floor, tableId, reason, employeeName) {
    const next = (0, constants_1.clone)(floor);
    const table = next.tables.find((t) => t.id === tableId);
    if (!table)
        return { floor, cancelled: [] };
    const cancelled = [];
    const orderIds = [...(table.orderIds || [])];
    for (const oid of orderIds) {
        const order = next.orders[oid];
        if (order) {
            const sentItems = order.items.filter((i) => i.sent);
            if (sentItems.length > 0) {
                cancelled.push({
                    tableId,
                    tableName: table.name || tableId,
                    orderId: oid,
                    items: sentItems,
                    total: sentItems.reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0),
                    employeeName,
                    reason: reason || 'vaciar mesa',
                    cancelledAt: Date.now(),
                });
            }
            delete next.orders[oid];
        }
    }
    table.orderIds = [];
    table.orderId = null;
    table.status = 'libre';
    table.isFiado = false;
    return { floor: next, cancelled };
}
