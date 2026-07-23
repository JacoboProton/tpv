"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moveTableOrder = moveTableOrder;
exports.mergeTables = mergeTables;
exports.reopenOrder = reopenOrder;
function moveTableOrder(floor, srcTableId, dstTableId) {
    const next = JSON.parse(JSON.stringify(floor));
    const src = next.tables.find((t) => t.id === srcTableId);
    const dst = next.tables.find((t) => t.id === dstTableId);
    if (!src || !dst || !src.orderId || !next.orders[src.orderId])
        return floor;
    if (dst.orderId) {
        const srcOrder = next.orders[src.orderId];
        const dstOrder = next.orders[dst.orderId];
        dstOrder.items = [...dstOrder.items, ...srcOrder.items];
        delete next.orders[src.orderId];
    }
    else {
        next.orders[src.orderId].tableId = dstTableId;
        dst.orderId = src.orderId;
    }
    src.orderId = null;
    src.status = 'libre';
    src.mergedTableIds = null;
    dst.status = dst.orderId ? 'unidas' : 'ocupada';
    return next;
}
function mergeTables(floor, dstTableId, srcTableIds, employeeName) {
    const next = JSON.parse(JSON.stringify(floor));
    const dst = next.tables.find((t) => t.id === dstTableId);
    if (!dst)
        return floor;
    let dstOrder = dst.orderId ? next.orders[dst.orderId] : null;
    if (!dstOrder) {
        const newOrderId = 'ord_' + Date.now();
        dstOrder = { id: newOrderId, tableId: dstTableId, items: [], createdAt: Date.now(), employeeName: employeeName || '' };
        next.orders[newOrderId] = dstOrder;
        dst.orderId = newOrderId;
    }
    dst.status = 'unidas';
    dst.mergedTableIds = srcTableIds.filter((id) => id !== dstTableId);
    for (const srcId of srcTableIds) {
        if (srcId === dstTableId)
            continue;
        const src = next.tables.find((t) => t.id === srcId);
        if (!src || !src.orderId)
            continue;
        const srcOrder = next.orders[src.orderId];
        if (!srcOrder)
            continue;
        dstOrder.items = [...dstOrder.items, ...srcOrder.items];
        delete next.orders[src.orderId];
        src.orderId = null;
        src.status = 'libre';
    }
    const mergedNames = srcTableIds
        .filter((id) => id !== dstTableId)
        .map((id) => { var _a; return ((_a = next.tables.find((t) => t.id === id)) === null || _a === void 0 ? void 0 : _a.name) || id; })
        .filter(Boolean);
    if (mergedNames.length > 0) {
        dstOrder._mergedFrom = [dstTableId, ...srcTableIds.filter((id) => id !== dstTableId)];
        dstOrder._mergedLabel = `Unidas: ${dst.name} + ${mergedNames.join(' + ')}`;
    }
    return next;
}
function reopenOrder(floor, tableId, historyEntry) {
    var _a;
    const next = JSON.parse(JSON.stringify(floor));
    const table = next.tables.find((t) => t.id === tableId);
    if (!table)
        return { floor, orderId: '' };
    const reopenedId = historyEntry.id + '_reopened';
    const reopened = Object.assign(Object.assign({}, historyEntry), { id: reopenedId, tableId, items: historyEntry.items.map((i) => (Object.assign(Object.assign({}, i), { sent: false, ready: false }))) });
    reopened.reopenedAt = Date.now();
    next.orders[reopenedId] = reopened;
    if (!table.orderIds)
        table.orderIds = [];
    table.orderIds.push(reopenedId);
    table.orderId = reopenedId;
    table.status = 'ocupada';
    if ((_a = next.history) === null || _a === void 0 ? void 0 : _a[tableId]) {
        next.history[tableId] = next.history[tableId].filter((h) => h.id !== historyEntry.id);
    }
    return { floor: next, orderId: reopenedId };
}
