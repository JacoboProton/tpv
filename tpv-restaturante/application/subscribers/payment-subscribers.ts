import { eventBus, type PaymentRefundedEvent, type PaymentCompletedEvent } from '@/lib/event-bus'
import { euros } from '@/components/constants'
import { enqueueMutation } from '@/lib/offline'

export function registerPaymentSubscribers(deps: {
  showToast: (msg: string) => void
}) {
  eventBus.on('payment:refunded', async (data: PaymentRefundedEvent) => {
    const refundBody = JSON.stringify({
      saleId: data.saleId,
      refund: { ...data, amount: data.amount, reason: data.reason, employeeName: data.employeeName },
    })
    try {
      const res = await fetch('/api/sales/refund', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: refundBody,
      })
      if (!res.ok) {
        const errData = await res.json()
        deps.showToast(`Error en devolución: ${errData.error}`)
      } else {
        const resData = await res.json()
        if (resData.stripeRefundId) {
          deps.showToast(`Devolución de ${euros(data.amount)} procesada en Stripe (${resData.stripeRefundId})`)
        } else {
          deps.showToast(`Devolución de ${euros(data.amount)} registrada (efectivo/offline)`)
        }
      }
    } catch {
      enqueueMutation('/api/sales/refund', refundBody)
      deps.showToast('Sin conexión — la devolución se guardará cuando vuelva la red')
    }
  })

  eventBus.on('payment:completed', async (data: PaymentCompletedEvent) => {
    try {
      await fetch('/api/sales', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saleId: data.saleId, payments: data.payments }),
      })
    } catch {
      enqueueMutation('/api/sales', JSON.stringify({ saleId: data.saleId, payments: data.payments }))
    }
    deps.showToast('Bizum confirmado')
  })
}
