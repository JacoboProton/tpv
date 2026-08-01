import { NextRequest } from 'next/server';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../../../../lib/drizzle';
import { getTenantId } from '../../../../lib/tenant';
import { getCachedSettings, setCachedSettings } from '../../../../lib/settings-cache';
import { apiOk, apiError, apiBadRequest, apiNotFound, apiUnauthorized } from '../../../../lib/infrastructure/response';
import { requireRole } from '../../../../lib/rbac';
import { settings, sales } from '../../../../db/schema';
import { InvoicePdfBody } from '@/lib/schemas/api-schemas';

interface JsPDFWithPlugins extends jsPDF {
  autoTable: (options: Record<string, unknown>) => jsPDF;
  lastAutoTable: { finalY: number };
}

function d(doc: jsPDF): JsPDFWithPlugins {
  return doc as unknown as JsPDFWithPlugins;
}

async function getSettings(tenantId: string) {
  const cached = getCachedSettings();
  if (cached) return cached;
  const db = getDb();
  const rows = await db.select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(eq(settings.tenantId, tenantId));
  const result: Record<string, unknown> = {};
  for (const r of rows) result[r.key] = r.value;
  setCachedSettings(result);
  return result;
}

const FONT = 'Helvetica';

export async function POST(req: NextRequest) {
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const parsed = InvoicePdfBody.safeParse(await req.json());
    if (!parsed.success) return apiBadRequest(parsed.error.message);
    const { saleId, sale: inlineSale } = parsed.data;
    let sale;
    if (inlineSale) {
      sale = inlineSale;
    } else if (saleId) {
      const rows = await db.select().from(sales)
        .where(and(eq(sales.id, saleId), eq(sales.tenantId, tenantId)))
        .limit(1);
      if (rows.length === 0) return apiNotFound('Venta no encontrada');
      const r = rows[0];
      sale = {
        id: r.id, tableName: r.tableName, employeeName: r.employeeName,
        items: r.items, total: Number(r.total), tip: Number(r.tip || 0),
        discount: Number(r.discount || 0),
        invoiceNumber: r.invoiceNumber || r.id,
        invoiceName: r.invoiceName, invoiceNif: r.invoiceNif,
        invoiceAddress: r.invoiceAddress, invoiceEmail: r.invoiceEmail,
        closedAt: Number(r.closedAt), paymentMethod: r.paymentMethod,
        totalWithTip: Number(r.totalWithTip || r.total || 0),
      };
    } else {
      return apiBadRequest('saleId o sale requerido');
    }

    const settingsData = await getSettings(tenantId) as Record<string, string>;
    const cif = settingsData?.companyCif || '';
    const address = settingsData?.companyAddress || '';
    const phone = settingsData?.companyPhone || '';
    const name = settingsData?.restaurantName || 'FACTURA';
    const footer = settingsData?.footerText || 'Gracias por su visita';

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const p = d(doc);
    const pageW = 210;

    p.setFontSize(18);
    p.text(name, pageW / 2, 20, { align: 'center' });
    p.setFontSize(8);
    let y = 27;
    if (cif) { p.text(`CIF/NIF: ${cif}`, pageW / 2, y, { align: 'center' }); y += 4; }
    if (address) { p.text(address, pageW / 2, y, { align: 'center' }); y += 4; }
    if (phone) { p.text(`Tel: ${phone}`, pageW / 2, y, { align: 'center' }); y += 4; }

    p.setDrawColor(0);
    p.setLineWidth(0.5);
    p.line(14, y + 2, pageW - 14, y + 2);
    y += 6;

    p.setFontSize(13);
    p.setFont(FONT, 'bold');
    p.text(sale.invoiceNumber || sale.id, pageW / 2, y, { align: 'center' });
    y += 6;
    p.setFont(FONT, 'normal');
    p.setFontSize(10);
    const dateStr = new Date(sale.closedAt).toLocaleDateString('es-ES', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    p.text(dateStr, pageW / 2, y, { align: 'center' });
    y += 8;

    const clientLines = [];
    clientLines.push(`Cliente: ${sale.invoiceName || '—'}`);
    clientLines.push(`NIF: ${sale.invoiceNif || '—'}`);
    if (sale.invoiceAddress) clientLines.push(`Dirección: ${sale.invoiceAddress}`);
    clientLines.push(`Mesa: ${sale.tableName}  ·  Camarero: ${sale.employeeName || '—'}`);

    p.setFillColor(245, 245, 245);
    p.roundedRect(14, y, pageW - 28, 4 + clientLines.length * 4.5, 2, 2, 'F');
    p.setFontSize(9);
    let cy = y + 3;
    for (const line of clientLines) {
      p.text(line, 18, cy);
      cy += 4.5;
    }
    y = cy + 6;

    const items = ((sale.items || []) as Array<{ voided?: boolean; name?: string; qty?: number; price?: number }>)
      .filter((i) => !i.voided);
    const bodyRows = items.map((i) => [
      i.name?.slice(0, 40) || '',
      String(i.qty || 1),
      `${(i.price || 0).toFixed(2)}`,
      `${((i.price || 0) * (i.qty || 0)).toFixed(2)}`,
    ]);

    const total = sale.totalWithTip || sale.total || 0;
    const base = total / 1.07;
    const igic = total - base;

    p.autoTable({
      startY: y,
      head: [['Artículo', 'Ud.', 'Precio', 'Importe']],
      body: bodyRows,
      foot: [
        ['', '', 'Base Imponible', `${base.toFixed(2)}`],
        ['', '', 'IGIC 7%', `${igic.toFixed(2)}`],
        ['', '', 'TOTAL', `${total.toFixed(2)}`],
      ],
      theme: 'plain',
      headStyles: { font: FONT, fontSize: 8, lineWidth: 0.5, lineColor: [0, 0, 0] },
      bodyStyles: { font: FONT, fontSize: 9 },
      footStyles: { font: FONT, fontSize: 9, lineWidth: 0.5, lineColor: [0, 0, 0] },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
      },
      didParseCell: (data: { section?: string; row?: { index: number }; cell?: { styles?: Record<string, unknown> } }) => {
        if (data.section === 'foot' && data.row?.index === 2) {
          if (data.cell?.styles) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fontSize = 10;
          }
        }
      },
    });
    y = p.lastAutoTable.finalY + 6;

    if (sale.tip > 0) {
      p.setFontSize(9);
      p.text(`Propina (NO fiscal): +${sale.tip.toFixed(2)} €`, pageW - 14, y, { align: 'right' });
      y += 5;
    }
    if (sale.discount > 0) {
      p.setFontSize(9);
      p.text(`Descuento aplicado: ${sale.discount}%`, pageW - 14, y, { align: 'right' });
      y += 5;
    }
    if (sale.invoiceEmail) {
      p.setFontSize(8);
      p.text(`Enviada a: ${sale.invoiceEmail}`, 14, y);
      y += 5;
    }

    p.setLineWidth(0.3);
    p.line(14, y + 2, pageW - 14, y + 2);
    p.setFontSize(8);
    p.setTextColor(136, 136, 136);
    p.text(footer, pageW / 2, y + 6, { align: 'center' });

    const pdfBuffer = Buffer.from(p.output('arraybuffer'));
    const base64 = pdfBuffer.toString('base64');

    return apiOk({
      pdf: base64,
      filename: `factura_${sale.invoiceNumber || sale.id}.pdf`,
      saleId: sale.id,
    });
  } catch (err) { return apiError(err); }
}
