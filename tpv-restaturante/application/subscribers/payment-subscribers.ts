import { eventBus, type PaymentRefundedEvent, type PaymentCompletedEvent } from '@/lib/event-bus'
import { euros } from '@/components/constants'
import { enqueueMutation } from '@/lib/offline'

export function registerPaymentSubscribers(deps: {
  showToast: (msg: string) => void
}) {
  eventBus.on('payment:refunded', async (data: PaymentRefundedEvent) => {
    const refundBody = {
      saleId: data.saleId,
      refund: { ...data, amount: data.amount, reason: data.reason, employeeName: data.employeeName },
    }
    try {
      const res = await fetch('/api/sales/refund', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(refundBody),
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
      enqueueMutation({ key: '/api/sales/refund', method: 'PUT', payload: refundBody, idempotencyKey: `refund:${data.saleId}:${data.amount}:${data.timestamp || Date.now()}` })
      deps.showToast('Sin conexión — la devolución se guardará cuando vuelva la red')
    }
  })

  eventBus.on('payment:completed', async (data: PaymentCompletedEvent) => {
    const body = { saleId: data.saleId, payments: data.payments }
    try {
      await fetch('/api/sales', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch {
      enqueueMutation({ key: '/api/sales', method: 'PATCH', payload: body, idempotencyKey: `payments:${data.saleId}` })
    }
    deps.showToast('Bizum confirmado')
  })
}
