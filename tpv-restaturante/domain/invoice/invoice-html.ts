import { euros } from '@/components/constants'
import { calculateIgic } from '@/domain/invoice/invoice'

import type { Sale } from '../types'

export function buildInvoiceHtml(ticketSettings: Record<string, any>, sale: Sale): string {
  const { restaurantName, companyCif, companyAddress, companyPhone, footerText } = ticketSettings
  const totalConIva = sale.total || 0
  const { baseImponible, cuotaIgic } = calculateIgic(totalConIva)
  const itemsHtml = (sale.items || []).filter((i: any) => !i.voided).map((i: any) =>
    `<tr><td style="padding:3px 0">${i.name.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td><td style="text-align:center;width:40px">${i.qty}</td><td style="text-align:right;width:70px">${euros(i.price)}</td><td style="text-align:right;width:80px">${euros((i.price || 0) * (i.qty || 0))}</td></tr>`
  ).join('')
  return `<html><head><meta charset="utf-8"><style>
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
}
