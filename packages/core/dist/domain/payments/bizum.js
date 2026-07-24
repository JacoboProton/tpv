export function confirmBizumPayments(sale) {
    const payments = (sale.payments || []).map((p) => p.method === 'bizum' ? Object.assign(Object.assign({}, p), { confirmed: true }) : p);
    return Object.assign(Object.assign({}, sale), { payments, hasPendingBizum: undefined });
}
//# sourceMappingURL=bizum.js.map