'use client'

import { useCallback } from 'react'
import { euros, round2 } from '../components/constants'

function btoa(str: string): string {
  if (typeof window.btoa === 'function') return window.btoa(str)
  return Buffer.from(str).toString('base64')
}

function b64ToBlob(b64: string, mime: string): Blob {
  const byteChars = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary')
  const byteNums = new Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i)
  return new Blob([new Uint8Array(byteNums)], { type: mime })
}

interface UseInvoiceProps {
  ticketSettings: Record<string, any>
  showToast: (msg: string) => void
}

export function useInvoice({ ticketSettings, showToast }: UseInvoiceProps) {

  const printInvoice = useCallback(async (sale: any) => {
    if (!sale) return
    const { restaurantName, companyCif, companyAddress, companyPhone, footerText } = ticketSettings
    const totalConIva = sale.total || 0
    const baseImponible = round2(totalConIva / 1.07)
    const cuotaIgic = round2(totalConIva - baseImponible)
    const itemsHtml = (sale.items || []).filter((i: any) => !i.voided).map((i: any) =>
      `<tr><td style="padding:3px 0">${i.name.replace(/</g,'&lt;')}</td><td style="text-align:center;width:40px">${i.qty}</td><td style="text-align:right;width:70px">${euros(i.price)}</td><td style="text-align:right;width:80px">${euros((i.price || 0) * (i.qty || 0))}</td></tr>`
    ).join('')
    const html = `<html><head><meta charset="utf-8"><style>
      @page { margin:8mm 12mm; size: A4; }
      body { font-family:'Segoe UI',Arial,sans-serif; font-size:11px; color:#222; margin:0; padding:0; }
      .header { text-align:center; margin-bottom:18px; border-bottom:2px solid #222; padding-bottom:12px; }
      .header h1 { margin:0; font-size:20px; letter-spacing:1px; }
      .header .info { font-size:10px; color:#555; margin-top:4px; }
      .header .numero { font-size:13px; font-weight:bold; margin-top:4px; }
      table { width:100%; border-collapse:collapse; margin:12px 0; }
      th { border-bottom:2px solid #222; padding:5px 4px; text-align:left; font-size:10px; text-transform:uppercase; }
      td { padding:3px 4px; border-bottom:1px solid #ddd; font-size:11px; }
      .r { text-align:right; }
      .g { border-top:2px solid #222; font-weight:bold; font-size:12px; }
      .igic-line { font-size:10px; color:#555; }
      .footer { margin-top:20px; font-size:9px; color:#888; text-align:center; border-top:1px solid #ddd; padding-top:10px; }
      .client-box { background:#f5f5f5; padding:8px 10px; border-radius:4px; margin:10px 0; font-size:10px; }
      .client-box p { margin:2px 0; }
    </style></head><body>
      <div class="header">
        <h1>${restaurantName || 'FACTURA'}</h1>
        <div class="info">
          ${companyCif ? `CIF/NIF: ${companyCif}<br>` : ''}
          ${companyAddress ? `${companyAddress}<br>` : ''}
          ${companyPhone ? `Tel: ${companyPhone}` : ''}
        </div>
        <div class="numero">${sale.invoiceNumber || sale.id} · Ticket #${sale.ticketNumber || '-'}</div>
        <div class="info">${new Date(sale.closedAt).toLocaleDateString('es-ES', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' as any })}</div>
      </div>
      <div class="client-box">
        <p><strong>Cliente:</strong> ${sale.invoiceName || '—'}</p>
        <p><strong>NIF:</strong> ${sale.invoiceNif || '—'}</p>
        ${sale.invoiceAddress ? `<p><strong>Dirección:</strong> ${sale.invoiceAddress}</p>` : ''}
        <p><strong>Mesa:</strong> ${sale.tableName} · <strong>Camarero:</strong> ${sale.employeeName || '—'}</p>
      </div>
      <table>
        <tr><th>Artículo</th><th style="text-align:center">Ud.</th><th style="text-align:right">Precio</th><th style="text-align:right">Importe</th></tr>
        ${itemsHtml}
        <tr><td colspan="3" style="border:none;padding:3px 4px;font-size:10px;color:#555;text-align:right">Base Imponible</td><td class="r igic-line">${euros(baseImponible)}</td></tr>
        <tr><td colspan="3" style="border:none;padding:1px 4px;font-size:10px;color:#555;text-align:right">IGIC 7%</td><td class="r igic-line">${euros(cuotaIgic)}</td></tr>
        <tr class="g"><td colspan="3" style="text-align:right;font-size:12px">TOTAL</td><td class="r" style="font-size:13px">${euros(totalConIva)}</td></tr>
      </table>
      ${sale.tip > 0 ? `<p style="font-size:10px;color:#888;text-align:right">Propina (NO fiscal): +${euros(sale.tip)}</p>` : ''}
      ${sale.discount > 0 ? `<p style="font-size:10px;color:#888;text-align:right">Descuento aplicado: ${sale.discount}%</p>` : ''}
      ${sale.invoiceEmail ? `<p style="font-size:9px;color:#888;margin-top:8px">Enviada a: ${sale.invoiceEmail}</p>` : ''}
      <div class="footer">${footerText || 'Gracias por su visita'}</div>
    </body></html>`
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

  const handleDownloadPdf = useCallback(async (sale: any) => {
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

  const handleSendInvoiceEmail = useCallback(async (sale: any) => {
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
