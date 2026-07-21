import { eventBus, type OrderClosedEvent } from '@/lib/event-bus'
import { registerVerifactu } from '@/lib/api'
import { isPrinterConnected, printESCPOS, escposOpenDrawer } from '@/lib/thermal-printer'

export function registerOrderSubscribers(deps: {
  showToast: (msg: string) => void
}) {
  eventBus.on('order:closed', async (data: OrderClosedEvent) => {
    registerVerifactu(data.saleId, { ...data, items: data.items }).then(() => {
      deps.showToast(`✅ Factura electrónica registrada (${data.invoiceNumber || data.saleId})`)
    }).catch(err => {
      console.warn('Verifactu:', err)
      deps.showToast('⚠️ Error al registrar factura electrónica — revisa Gestoría')
    })

    if (data.payments.some((p: any) => p.method === 'efectivo') && isPrinterConnected()) {
      printESCPOS(escposOpenDrawer()).catch(() => {})
    }
  })
}
