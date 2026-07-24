export async function processSalesQueue(queue, processingRef, deps) {
    var _a;
    if (processingRef.current || queue.length === 0)
        return;
    processingRef.current = true;
    while (queue.length > 0) {
        const sale = queue[0];
        let ok = false;
        let lastErr = '';
        let ticketNumber = null;
        try {
            const res = await deps.addSale(sale);
            ok = res && res.ok;
            if (res && res.ticketNumber)
                ticketNumber = res.ticketNumber;
            if (!ok)
                lastErr = 'respuesta vacía';
        }
        catch (e) {
            lastErr = e instanceof Error ? e.message : String(e);
            (_a = deps.log) === null || _a === void 0 ? void 0 : _a.call(deps, 'addSale error: ' + lastErr);
        }
        if (ok) {
            if (ticketNumber) {
                deps.setSales((prev) => prev.map((s) => s.id === sale.id ? Object.assign(Object.assign({}, s), { ticketNumber }) : s));
                deps.cacheSet('sales', null);
            }
            queue.shift();
        }
        else {
            deps.showToast(`Error venta: ${lastErr}. Reintentando...`);
            await deps.wait(2000);
            try {
                const res = await deps.addSale(sale);
                if (res && res.ok) {
                    queue.shift();
                }
                else {
                    deps.showToast(`Error venta: ${lastErr}. No se pudo guardar`);
                    queue.shift();
                }
            }
            catch (e2) {
                deps.showToast(`Error venta: ${e2 instanceof Error ? e2.message : String(e2)}. No se pudo guardar`);
                queue.shift();
            }
        }
    }
    processingRef.current = false;
}
//# sourceMappingURL=sales-queue.js.map