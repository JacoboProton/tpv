"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerItemSubscribers = registerItemSubscribers;
const event_bus_1 = require("@/lib/event-bus");
function registerItemSubscribers(deps) {
    event_bus_1.eventBus.on('item:sent', (data) => {
        deps.showToast(`${data.productName} enviado a cocina`);
    });
}
