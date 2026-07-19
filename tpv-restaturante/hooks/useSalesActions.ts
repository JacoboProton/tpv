'use client'

import { useCallback } from 'react'
import { enqueueMutation } from '../lib/offline'
import { clone, euros } from '../components/constants'
import { eventBus } from '../lib/event-bus'
import { addRefundToSale } from '../domain/payments/refund'
import { confirmBizumPayments } from '../domain/payments/bizum'

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
    addRefundToSale(sale, refund, currentUser?.name || '—')
    setSales(next)
    eventBus.emit('payment:refunded', {
      saleId, amount: refund.amount, reason: refund.reason || '',
      employeeName: currentUser?.name || '—', timestamp: Date.now(),
    })
    const refundBody = JSON.stringify({ saleId, refund: { ...refund, employeeName: currentUser?.name || '—' } })
    fetch('/api/sales/refund', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: refundBody,
    }).then(async (res) => {
      if (!res.ok) { const data = await res.json(); showToast(`Error en devolución: ${data.error}`) }
      else {
        const data = await res.json()
        if (data.stripeRefundId) showToast(`Devolución de ${euros(refund.amount)} procesada en Stripe (${data.stripeRefundId})`)
        else showToast(`Devolución de ${euros(refund.amount)} registrada (efectivo/offline)`)
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
    const updated = confirmBizumPayments(sale)
    next[next.indexOf(sale)] = updated
    setSales(next)
    eventBus.emit('payment:completed', {
      saleId, tableId: sale.tableId || '', amount: sale.totalWithTip || sale.total || 0,
      method: 'bizum', employeeName: currentUser?.name || null, timestamp: Date.now(),
    })
    fetch('/api/sales', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saleId, payments: updated.payments }),
    }).catch(() => enqueueMutation('/api/sales', JSON.stringify({ saleId, payments: updated.payments })))
    showToast('Bizum confirmado')
  }, [sales, setSales, showToast])

  return { handleRefund, handleConfirmBizum }
}
