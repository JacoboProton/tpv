export function getItemState(item) {
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
export function canTransitionTo(item, target) {
    const current = getItemState(item);
    const order = ['pending', 'sent', 'ready', 'served', 'voided'];
    return order.indexOf(target) > order.indexOf(current);
}
export function isPending(item) {
    return getItemState(item) === 'pending';
}
export function isInKitchen(item) {
    const state = getItemState(item);
    return state === 'sent' || state === 'ready';
}
export function hasUnsentItems(items) {
    return items.some(i => isPending(i));
}
export function hasPendingItems(items) {
    return items.some(i => getItemState(i) === 'sent');
}
export function countPendingLines(items) {
    return items.filter(i => !i.sent && !i.voided).length;
}
export function countPendingKitchenItems(floor) {
    return Object.values(floor.orders || {}).reduce((sum, o) => sum + o.items.filter(i => i.sent && !i.ready).length, 0);
}
export function formatItemPreview(itemNames, max = 3) {
    const items = itemNames.slice(0, max).join(', ');
    const suffix = itemNames.length > max ? ` y ${itemNames.length - max} más` : '';
    return `${items}${suffix}`;
}
//# sourceMappingURL=kitchen.js.map