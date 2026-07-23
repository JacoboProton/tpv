"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerOrderCreatedSubscribers = registerOrderCreatedSubscribers;
const event_bus_1 = require("@/lib/event-bus");
function registerOrderCreatedSubscribers(deps) {
    event_bus_1.eventBus.on('order:created', (data) => {
        const itemSummary = data.items.slice(0, 2).map(i => `${i.qty}x ${i.name}`).join(', ');
        const suffix = data.items.length > 2 ? ` y ${data.items.length - 2} más` : '';
        const tableInfo = data.tableName ? ` en ${data.tableName}` : '';
        deps.showToast(`🆕 ${itemSummary}${suffix}${tableInfo}`);
    });
}
