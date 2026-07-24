export function euros(n) {
    return (n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
export function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}
export function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
//# sourceMappingURL=utils.js.map