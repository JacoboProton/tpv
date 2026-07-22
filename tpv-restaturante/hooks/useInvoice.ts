'use client'

import { useCallback } from 'react'
import type { Sale } from '@/domain/types'
import { buildInvoiceHtml } from '@/domain/invoice/invoice-html'
import { b64ToBlob } from '@/lib/encoding'

interface UseInvoiceProps {
  ticketSettings: Record<string, any>
  showToast: (msg: string) => void
}

export function useInvoice({ ticketSettings, showToast }: UseInvoiceProps) {

  const printInvoice = useCallback(async (sale: Sale) => {
    if (!sale) return
    const html = buildInvoiceHtml(ticketSettings, sale)
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    document.body.appendChild(iframe)
    iframe.contentWindow!.document.open()
    iframe.contentWindow!.document.write(html)
    iframe.contentWindow!.document.close()
    iframe.contentWindow!.focus()
    iframe.contentWindow!.print()
    setTimeout(() => document.body.removeChild(iframe), 1000)
  }, [ticketSettings])

  const handleDownloadPdf = useCallback(async (sale: Sale) => {
    if (!sale) return
    try {
      const res = await fetch('/api/invoice/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sale }),
      })
      if (!res.ok) { showToast('Error al generar PDF'); return }
      const data = await res.json()
      const blob = b64ToBlob(data.pdf, 'application/pdf')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = data.filename
      a.click(); URL.revokeObjectURL(url)
      showToast('PDF descargado')
    } catch { showToast('Error al descargar PDF') }
  }, [showToast])

  const handleSendInvoiceEmail = useCallback(async (sale: Sale) => {
    if (!sale || !sale.invoiceEmail) { showToast('El cliente no tiene email registrado'); return }
    try {
      const pdfRes = await fetch('/api/invoice/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sale }),
      })
      if (!pdfRes.ok) { showToast('Error al generar PDF'); return }
      const pdfData = await pdfRes.json()
      const sendRes = await fetch('/api/invoice/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saleId: sale.id, pdfBase64: pdfData.pdf, filename: pdfData.filename, to: sale.invoiceEmail }),
      })
      const sendData = await sendRes.json()
      if (sendData.method === 'smtp') showToast('Factura enviada por email')
      else if (sendData.method === 'download') { handleDownloadPdf(sale); showToast('Email no configurado — PDF descargado') }
      else showToast('Error al enviar: ' + (sendData.error || 'desconocido'))
    } catch { showToast('Error al enviar factura') }
  }, [showToast, handleDownloadPdf])

  return {
    printInvoice,
    handleDownloadPdf,
    handleSendInvoiceEmail,
  }
}
