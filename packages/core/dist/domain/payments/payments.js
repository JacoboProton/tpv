const METHOD_LABELS = {
    efectivo: 'Efectivo',
    tarjeta: 'Tarjeta',
    bizum: 'Bizum',
    fiado: 'Fiado',
    gift: 'Tarjeta regalo',
};
export function buildPayments(splits) {
    return splits.map(s => (Object.assign(Object.assign({ method: s.method, amount: round2(s.amount) }, (s.code ? { code: s.code } : {})), (s.method === 'bizum' ? { confirmed: false } : {}))));
}
export function isFiado(payments) {
    return payments.some(p => p.method === 'fiado');
}
export function hasPendingBizum(payments) {
    return payments.some(p => p.method === 'bizum' && p.confirmed === false);
}
export function formatPaymentMethod(payments) {
    return payments.map(p => METHOD_LABELS[p.method] || p.method).join(' + ');
}
export function isCardPayment(payments) {
    return payments.some(p => p.method === 'tarjeta');
}
function round2(n) {
    return Math.round(n * 100) / 100;
}
//# sourceMappingURL=payments.js.map