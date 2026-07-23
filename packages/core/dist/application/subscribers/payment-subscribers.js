"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPaymentSubscribers = registerPaymentSubscribers;
const event_bus_1 = require("@/lib/event-bus");
const constants_1 = require("@/components/constants");
const offline_1 = require("@/lib/offline");
function registerPaymentSubscribers(deps) {
    event_bus_1.eventBus.on('payment:refunded', async (data) => {
        const refundBody = JSON.stringify({
            saleId: data.saleId,
            refund: Object.assign(Object.assign({}, data), { amount: data.amount, reason: data.reason, employeeName: data.employeeName }),
        });
        try {
            const res = await fetch('/api/sales/refund', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: refundBody,
            });
            if (!res.ok) {
                const errData = await res.json();
                deps.showToast(`Error en devolución: ${errData.error}`);
            }
            else {
                const resData = await res.json();
                if (resData.stripeRefundId) {
                    deps.showToast(`Devolución de ${(0, constants_1.euros)(data.amount)} procesada en Stripe (${resData.stripeRefundId})`);
                }
                else {
                    deps.showToast(`Devolución de ${(0, constants_1.euros)(data.amount)} registrada (efectivo/offline)`);
                }
            }
        }
        catch (_a) {
            (0, offline_1.enqueueMutation)('/api/sales/refund', refundBody);
            deps.showToast('Sin conexión — la devolución se guardará cuando vuelva la red');
        }
    });
    event_bus_1.eventBus.on('payment:completed', async (data) => {
        try {
            await fetch('/api/sales', {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ saleId: data.saleId, payments: data.payments }),
            });
        }
        catch (_a) {
            (0, offline_1.enqueueMutation)('/api/sales', JSON.stringify({ saleId: data.saleId, payments: data.payments }));
        }
        deps.showToast('Bizum confirmado');
    });
}
