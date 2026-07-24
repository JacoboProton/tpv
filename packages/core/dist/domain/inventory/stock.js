export function deductStock(stockByLocation, ubicacion, qty) {
    const locs = Object.keys(stockByLocation || {});
    const location = locs.length > 0 ? locs[0] : ubicacion;
    const entry = (stockByLocation || {})[location] || { stock: 0 };
    const newStock = Math.max(0, (entry.stock || 0) - qty);
    const result = Object.assign(Object.assign({}, (stockByLocation || {})), { [location]: Object.assign(Object.assign({}, entry), { stock: newStock }) });
    return { stockByLocation: result, newStock };
}
export function getStockEntry(stockByLocation, ubicacion) {
    const locs = Object.keys(stockByLocation || {});
    const location = locs.length > 0 ? locs[0] : ubicacion;
    return (stockByLocation || {})[location] || { stock: 0 };
}
export function isLowStock(entry) {
    return entry.stock <= (entry.lowStock || 0);
}
//# sourceMappingURL=stock.js.map