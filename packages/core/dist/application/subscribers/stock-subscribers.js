"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerStockSubscribers = registerStockSubscribers;
const event_bus_1 = require("@/lib/event-bus");
function registerStockSubscribers(_deps) {
    event_bus_1.eventBus.on('stock:changed', (data) => {
        if (data.newStock <= 0) {
            _deps.showToast(`⚠️ ${data.productName} agotado (${data.ubicacion})`);
        }
    });
}
