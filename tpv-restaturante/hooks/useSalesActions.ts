'use client'

import { useCallback } from 'react'
import { enqueueMutation } from '../lib/offline'
import { clone, euros } from '../components/constants'
import { eventBus } from '../lib/event-bus'

interface UseSalesActionsProps {
  sales: any[]
  setSales: (s: any[]) => void
  currentUser: any
  showToast: (msg: string) => void
}

export function useSalesActions({ sales, setSales, currentUser, showToast }: UseSalesActionsProps) {

  const handleRefund = useCallback((saleId: string, refund: any) => {
    const next = clone(sales)
    const sale = next.find((s: any) => s.id === saleId)
    if (!sale) return
    if (!sale.refunds) sale.refunds = []
    const refundWithEmployee = { ...refund, employeeName: currentUser?.name || '—' }
    sale.refunds.push(refundWithEmployee)
    setSales(next)
    eventBus.emit('payment:refunded', {
      saleId, amount: refundWithEmployee.amount, reason: refundWithEmployee.reason || '',
      employeeName: currentUser?.name || '—', timestamp: Date.now(),
    })
    const refundBody = JSON.stringify({ saleId, refund: refundWithEmployee })
    fetch('/api/sales/refund', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: refundBody,
    }).then(async (res) => {
      if (!res.ok) { const data = await res.json(); showToast(`Error en devolución: ${data.error}`) }
      else {
        const data = await res.json()
        if (data.stripeRefundId) showToast(`Devolución de ${euros(refundWithEmployee.amount)} procesada en Stripe (${data.stripeRefundId})`)
        else showToast(`Devolución de ${euros(refundWithEmployee.amount)} registrada (efectivo/offline)`)
      }
    }).catch(() => {
      enqueueMutation('/api/sales/refund', refundBody)
      showToast('Sin conexión — la devolución se guardará cuando vuelva la red')
    })
  }, [sales, setSales, currentUser, showToast])

  const handleConfirmBizum = useCallback((saleId: string) => {
    const next = clone(sales)
    const sale = next.find((s: any) => s.id === saleId)
    if (!sale) return
    const confirmed = (sale.payments || []).map((p: any) =>
      p.method === 'bizum' ? { ...p, confirmed: true } : p
    )
    sale.payments = confirmed
    delete sale.hasPendingBizum
    setSales(next)
    eventBus.emit('payment:completed', {
      saleId, tableId: sale.tableId || '', amount: sale.totalWithTip || sale.total || 0,
      method: 'bizum', employeeName: currentUser?.name || null, timestamp: Date.now(),
    })
    fetch('/api/sales', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saleId, payments: confirmed }),
    }).catch(() => enqueueMutation('/api/sales', JSON.stringify({ saleId, payments: confirmed })))
    showToast('Bizum confirmado')
  }, [sales, setSales, showToast])

  return { handleRefund, handleConfirmBizum }
}
