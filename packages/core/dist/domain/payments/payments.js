"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPayments = buildPayments;
exports.isFiado = isFiado;
exports.hasPendingBizum = hasPendingBizum;
exports.formatPaymentMethod = formatPaymentMethod;
exports.isCardPayment = isCardPayment;
const METHOD_LABELS = {
    efectivo: 'Efectivo',
    tarjeta: 'Tarjeta',
    bizum: 'Bizum',
    fiado: 'Fiado',
};
function buildPayments(splits) {
    return splits.map(s => (Object.assign({ method: s.method, amount: round2(s.amount) }, (s.method === 'bizum' ? { confirmed: false } : {}))));
}
function isFiado(payments) {
    return payments.some(p => p.method === 'fiado');
}
function hasPendingBizum(payments) {
    return payments.some(p => p.method === 'bizum' && p.confirmed === false);
}
function formatPaymentMethod(payments) {
    return payments.map(p => METHOD_LABELS[p.method] || p.method).join(' + ');
}
function isCardPayment(payments) {
    return payments.some(p => p.method === 'tarjeta');
}
function round2(n) {
    return Math.round(n * 100) / 100;
}
