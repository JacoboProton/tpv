"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleCuentaStatus = toggleCuentaStatus;
const constants_1 = require("@/components/constants");
function toggleCuentaStatus(floor, tableId) {
    const next = (0, constants_1.clone)(floor);
    const table = next.tables.find((t) => t.id === tableId);
    if (!table)
        return null;
    table.status = table.status === 'cuenta' ? 'ocupada' : 'cuenta';
    return next;
}
