import { expandMenu, expandCombo } from '../../domain/order/menu-expansion.js';
import { clone, generateId, round2 } from '../../lib/utils.js';
function findOrCreateOrder(floor, tableId, employeeName, activeTicketId) {
    var _a;
    const table = floor.tables.find((t) => t.id === tableId);
    if (!table)
        return null;
    const activeOid = activeTicketId || ((_a = table.orderIds) === null || _a === void 0 ? void 0 : _a[0]) || table.orderId;
    let order = activeOid ? floor.orders[activeOid] : null;
    let isNew = false;
    if (!order) {
        const orderId = 'o_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        order = {
            id: orderId, tableId, items: [], createdAt: Date.now(),
            employeeName: employeeName || '-',
        };
        floor.orders[orderId] = order;
        if (!table.orderIds)
            table.orderIds = [];
        table.orderIds.push(orderId);
        table.orderId = orderId;
        table.status = 'ocupada';
        isNew = true;
    }
    return { order, table, isNew, activeOid: order.id };
}
export function addNormalItem(floor, tableId, catalog, input) {
    var _a, _b, _c;
    const next = clone(floor);
    const ctx = findOrCreateOrder(next, tableId, input.employeeName || '', input.activeTicketId);
    if (!ctx)
        return null;
    const { order, isNew } = ctx;
    const basePrice = input.product.price || ((_b = (_a = catalog === null || catalog === void 0 ? void 0 : catalog.products) === null || _a === void 0 ? void 0 : _a.find((p) => p.id === input.product.id)) === null || _b === void 0 ? void 0 : _b.price) || 0;
    const extra = input.extraPrice || 0;
    const effectivePrice = round2(basePrice + extra);
    const modifiers = input.modifiers || [];
    const existing = order.items.find((i) => i.productId === input.product.id && !i.sent &&
        JSON.stringify(i.modifiers) === JSON.stringify(modifiers));
    let itemId;
    if (existing) {
        existing.qty += 1;
        itemId = existing.id;
    }
    else {
        const prod = (_c = catalog === null || catalog === void 0 ? void 0 : catalog.products) === null || _c === void 0 ? void 0 : _c.find((p) => p.id === input.product.id);
        itemId = generateId('i');
        order.items.push({
            id: itemId,
            productId: input.product.id,
            name: input.product.name,
            price: effectivePrice,
            qty: 1,
            sent: false, ready: false, sentAt: null,
            notes: '',
            modifiers,
            course: input.product.course || '',
            ubicacion: input.product.ubicacion || (prod === null || prod === void 0 ? void 0 : prod.ubicacion) || 'Bar',
        });
    }
    return { floor: next, orderId: order.id, isNewOrder: isNew, itemId };
}
export function addMenuItems(floor, tableId, catalog, input) {
    const next = clone(floor);
    const ctx = findOrCreateOrder(next, tableId, input.employeeName || '');
    if (!ctx)
        return null;
    const { order, isNew } = ctx;
    const menuItems = expandMenu(input.product, catalog, input.menuSel);
    for (const mi of menuItems) {
        if (mi.productId && !mi.isMenuPrice) {
            const existing = order.items.find((i) => i.productId === mi.productId && !i.sent && !i.isComboItem && !i.isMenuItem);
            if (existing) {
                existing.qty += mi.qty;
                continue;
            }
        }
        order.items.push(Object.assign(Object.assign({ id: generateId('i') }, mi), { sent: !!mi.isMenuPrice, ready: !!mi.isMenuPrice, sentAt: mi.isMenuPrice ? Date.now() : null, notes: '', modifiers: [] }));
    }
    return { floor: next, orderId: order.id, isNewOrder: isNew };
}
export function addComboItems(floor, tableId, catalog, input) {
    const next = clone(floor);
    const ctx = findOrCreateOrder(next, tableId, input.employeeName || '');
    if (!ctx)
        return null;
    const { order, isNew } = ctx;
    const comboItems = expandCombo(input.product, catalog, input.menuSel);
    for (const ci of comboItems) {
        if (ci.productId && !ci.isComboPrice) {
            const existing = order.items.find((i) => i.productId === ci.productId && !i.sent && !i.isComboItem);
            if (existing) {
                existing.qty += ci.qty;
                continue;
            }
        }
        order.items.push(Object.assign(Object.assign({ id: generateId('i') }, ci), { sent: !!ci.isComboPrice, ready: !!ci.isComboPrice, sentAt: ci.isComboPrice ? Date.now() : null, notes: '', modifiers: [] }));
    }
    return { floor: next, orderId: order.id, isNewOrder: isNew };
}
export function editItemModifiers(floor, tableId, catalog, input) {
    var _a, _b;
    const next = clone(floor);
    const table = next.tables.find((t) => t.id === tableId);
    if (!table)
        return null;
    if (!table.orderId)
        return null;
    const order = next.orders[table.orderId];
    if (!order)
        return null;
    const item = order.items.find((i) => i.id === input.itemId);
    if (!item)
        return null;
    const basePrice = input.product.price || ((_b = (_a = catalog === null || catalog === void 0 ? void 0 : catalog.products) === null || _a === void 0 ? void 0 : _a.find((p) => p.id === input.product.id)) === null || _b === void 0 ? void 0 : _b.price) || 0;
    item.modifiers = input.modifiers;
    item.price = round2(basePrice + input.extraPrice);
    return next;
}
//# sourceMappingURL=add-items-to-order.js.map