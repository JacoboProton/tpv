export const IGIC_RATE = 0.07;
function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}
export function calculateBaseImponible(totalConIgic) {
    return round2(totalConIgic / (1 + IGIC_RATE));
}
export function calculateIgic(totalConIgic) {
    const baseImponible = calculateBaseImponible(totalConIgic);
    return {
        baseImponible,
        cuotaIgic: round2(totalConIgic - baseImponible),
    };
}
export function generateInvoiceNumber(now) {
    const d = now || new Date();
    return 'INV-' + d.getFullYear() + '-' + String(d.getTime()).slice(-5);
}
//# sourceMappingURL=invoice.js.map