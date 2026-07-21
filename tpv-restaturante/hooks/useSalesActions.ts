'use client'

import { useCallback } from 'react'
import { clone } from '../components/constants'
import { eventBus } from '../lib/event-bus'
import { addRefundToSale } from '../domain/payments/refund'
import { confirmBizumPayments } from '../domain/payments/bizum'

interface UseSalesActionsProps {
  sales: any[]
  setSales: (s: any[]) => void
  currentUser: any
}

export function useSalesActions({ sales, setSales, currentUser }: UseSalesActionsProps) {

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
  }, [sales, setSales, currentUser])

  const handleConfirmBizum = useCallback((saleId: string) => {
    const next = clone(sales)
    const sale = next.find((s: any) => s.id === saleId)
    if (!sale) return
    const updated = confirmBizumPayments(sale)
    next[next.indexOf(sale)] = updated
    setSales(next)
    eventBus.emit('payment:completed', {
      saleId, tableId: sale.tableId || '', amount: sale.totalWithTip || sale.total || 0,
      method: 'bizum', payments: updated.payments,
      employeeName: currentUser?.name || null, timestamp: Date.now(),
    })
  }, [sales, setSales, currentUser])

  return { handleRefund, handleConfirmBizum }
}
