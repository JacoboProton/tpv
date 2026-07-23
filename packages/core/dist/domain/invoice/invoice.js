"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IGIC_RATE = void 0;
exports.calculateBaseImponible = calculateBaseImponible;
exports.calculateIgic = calculateIgic;
exports.generateInvoiceNumber = generateInvoiceNumber;
exports.IGIC_RATE = 0.07;
function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}
function calculateBaseImponible(totalConIgic) {
    return round2(totalConIgic / (1 + exports.IGIC_RATE));
}
function calculateIgic(totalConIgic) {
    const baseImponible = calculateBaseImponible(totalConIgic);
    return {
        baseImponible,
        cuotaIgic: round2(totalConIgic - baseImponible),
    };
}
function generateInvoiceNumber(now) {
    const d = now || new Date();
    return 'INV-' + d.getFullYear() + '-' + String(d.getTime()).slice(-5);
}
