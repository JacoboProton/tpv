"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerOrderSubscribers = registerOrderSubscribers;
const event_bus_1 = require("@/lib/event-bus");
const api_1 = require("@/lib/api");
const thermal_printer_1 = require("@/lib/thermal-printer");
function registerOrderSubscribers(deps) {
    event_bus_1.eventBus.on('order:closed', async (data) => {
        (0, api_1.registerVerifactu)(data.saleId, Object.assign(Object.assign({}, data), { items: data.items })).then(() => {
            deps.showToast(`✅ Factura electrónica registrada (${data.invoiceNumber || data.saleId})`);
        }).catch(err => {
            console.warn('Verifactu:', err);
            deps.showToast('⚠️ Error al registrar factura electrónica — revisa Gestoría');
        });
        if (data.payments.some((p) => p.method === 'efectivo') && (0, thermal_printer_1.isPrinterConnected)()) {
            (0, thermal_printer_1.printESCPOS)((0, thermal_printer_1.escposOpenDrawer)()).catch(() => { });
        }
    });
}
