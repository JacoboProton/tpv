"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getItemState = getItemState;
exports.canTransitionTo = canTransitionTo;
exports.isPending = isPending;
exports.isInKitchen = isInKitchen;
exports.hasUnsentItems = hasUnsentItems;
exports.hasPendingItems = hasPendingItems;
exports.countPendingLines = countPendingLines;
exports.countPendingKitchenItems = countPendingKitchenItems;
exports.formatItemPreview = formatItemPreview;
function getItemState(item) {
    if (item.voided)
        return 'voided';
    if (item.served)
        return 'served';
    if (item.ready)
        return 'ready';
    if (item.sent)
        return 'sent';
    return 'pending';
}
function canTransitionTo(item, target) {
    const current = getItemState(item);
    const order = ['pending', 'sent', 'ready', 'served', 'voided'];
    return order.indexOf(target) > order.indexOf(current);
}
function isPending(item) {
    return getItemState(item) === 'pending';
}
function isInKitchen(item) {
    const state = getItemState(item);
    return state === 'sent' || state === 'ready';
}
function hasUnsentItems(items) {
    return items.some(i => isPending(i));
}
function hasPendingItems(items) {
    return items.some(i => getItemState(i) === 'sent');
}
function countPendingLines(items) {
    return items.filter(i => !i.sent && !i.voided).length;
}
function countPendingKitchenItems(floor) {
    return Object.values(floor.orders || {}).reduce((sum, o) => sum + o.items.filter(i => i.sent && !i.ready).length, 0);
}
function formatItemPreview(itemNames, max = 3) {
    const items = itemNames.slice(0, max).join(', ');
    const suffix = itemNames.length > max ? ` y ${itemNames.length - max} más` : '';
    return `${items}${suffix}`;
}
