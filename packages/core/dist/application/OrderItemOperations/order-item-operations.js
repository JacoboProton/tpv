"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeItemQuantity = changeItemQuantity;
exports.updateItemNotes = updateItemNotes;
exports.removeItemFromOrder = removeItemFromOrder;
exports.sendToKitchenCourse = sendToKitchenCourse;
exports.sendSingleItemToKitchen = sendSingleItemToKitchen;
exports.updateItemCourse = updateItemCourse;
exports.markItemsReady = markItemsReady;
exports.voidOrderItem = voidOrderItem;
exports.setLineDiscount = setLineDiscount;
exports.removeLineDiscount = removeLineDiscount;
exports.setItemCourtesy = setItemCourtesy;
exports.removeItemCourtesy = removeItemCourtesy;
exports.setItemOverridePrice = setItemOverridePrice;
const constants_1 = require("@/components/constants");
function changeItemQuantity(floor, orderId, itemId, delta) {
    const next = (0, constants_1.clone)(floor);
    const order = next.orders[orderId];
    if (!order)
        return null;
    const item = order.items.find((i) => i.id === itemId);
    if (!item || item.sent)
        return null;
    item.qty += delta;
    if (item.qty <= 0)
        order.items = order.items.filter((i) => i.id !== itemId);
    return next;
}
function updateItemNotes(floor, orderId, itemId, notes) {
    const next = (0, constants_1.clone)(floor);
    const order = next.orders[orderId];
    if (!order)
        return null;
    const item = order.items.find((i) => i.id === itemId);
    if (item)
        item.notes = notes;
    return next;
}
function removeItemFromOrder(floor, tableId, orderId, itemId) {
    var _a, _b;
    const next = (0, constants_1.clone)(floor);
    const table = next.tables.find((t) => t.id === tableId);
    const order = next.orders[orderId];
    if (!order)
        return null;
    order.items = order.items.filter((i) => i.id !== itemId);
    if (order.items.length === 0 && (((_a = table === null || table === void 0 ? void 0 : table.orderIds) === null || _a === void 0 ? void 0 : _a.length) || 0) <= 1) {
        delete next.orders[orderId];
        if (table) {
            table.orderIds = (table.orderIds || []).filter((id) => id !== orderId);
            table.orderId = ((_b = table.orderIds) === null || _b === void 0 ? void 0 : _b[0]) || null;
            if (!table.orderId)
                table.status = 'libre';
        }
    }
    return next;
}
function sendToKitchenCourse(floor, orderId, course) {
    const next = (0, constants_1.clone)(floor);
    const order = next.orders[orderId];
    if (!order)
        return null;
    order.items.forEach((i) => {
        if (!i.sent && (!course || i.course === course)) {
            i.sent = true;
            i.sentAt = Date.now();
        }
    });
    return next;
}
function sendSingleItemToKitchen(floor, orderId, itemId) {
    const next = (0, constants_1.clone)(floor);
    const order = next.orders[orderId];
    if (!order)
        return null;
    const item = order.items.find((i) => i.id === itemId);
    if (!item || item.sent)
        return null;
    item.sent = true;
    item.sentAt = Date.now();
    const table = next.tables.find((t) => t.id === order.tableId);
    return {
        floor: next,
        itemName: item.name,
        course: item.course || '',
        tableName: (table === null || table === void 0 ? void 0 : table.name) || order.tableId || '',
    };
}
function updateItemCourse(floor, orderId, itemId, course) {
    const next = (0, constants_1.clone)(floor);
    const order = next.orders[orderId];
    if (!order)
        return null;
    const item = order.items.find((i) => i.id === itemId);
    if (item)
        item.course = course;
    return next;
}
function markItemsReady(floor, orderId, ubicacion) {
    const next = (0, constants_1.clone)(floor);
    const order = next.orders[orderId];
    if (!order)
        return null;
    let readyItems = order.items.filter((i) => i.sent && !i.ready);
    if (ubicacion)
        readyItems = readyItems.filter((i) => (i.ubicacion || 'Cocina') === ubicacion);
    if (readyItems.length === 0)
        return null;
    readyItems.forEach((i) => i.ready = true);
    const table = next.tables.find((t) => t.id === order.tableId);
    const names = [...new Set(readyItems.map((i) => i.name))];
    return { floor: next, names, tableName: (table === null || table === void 0 ? void 0 : table.name) || order.tableId || '' };
}
function voidOrderItem(floor, orderId, itemId, reason, voidedBy) {
    const next = (0, constants_1.clone)(floor);
    const order = next.orders[orderId];
    if (!order)
        return null;
    const item = order.items.find((i) => i.id === itemId);
    if (item) {
        item.voided = true;
        item.voidReason = reason;
        item.voidedBy = voidedBy;
        item.voidedAt = Date.now();
    }
    return next;
}
function setLineDiscount(floor, orderId, itemId, pct) {
    const next = (0, constants_1.clone)(floor);
    const order = next.orders[orderId];
    if (!order)
        return null;
    const item = order.items.find((i) => i.id === itemId);
    if (item) {
        item.lineDiscount = pct;
        item.isCourtesy = false;
    }
    return next;
}
function removeLineDiscount(floor, orderId, itemId) {
    const next = (0, constants_1.clone)(floor);
    const order = next.orders[orderId];
    if (!order)
        return null;
    const item = order.items.find((i) => i.id === itemId);
    if (item)
        item.lineDiscount = 0;
    return next;
}
function setItemCourtesy(floor, orderId, itemId) {
    const next = (0, constants_1.clone)(floor);
    const order = next.orders[orderId];
    if (!order)
        return null;
    const item = order.items.find((i) => i.id === itemId);
    if (item) {
        item.isCourtesy = true;
        item.lineDiscount = 0;
    }
    return next;
}
function removeItemCourtesy(floor, orderId, itemId) {
    const next = (0, constants_1.clone)(floor);
    const order = next.orders[orderId];
    if (!order)
        return null;
    const item = order.items.find((i) => i.id === itemId);
    if (item)
        item.isCourtesy = false;
    return next;
}
function setItemOverridePrice(floor, orderId, itemId, newPrice) {
    const next = (0, constants_1.clone)(floor);
    const order = next.orders[orderId];
    if (!order)
        return null;
    const item = order.items.find((i) => i.id === itemId);
    if (item) {
        item.overridePrice = Math.max(0, newPrice);
    }
    return next;
}
