import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../../../../lib/drizzle';
import { getTenantId } from '../../../../lib/tenant';
import { getCachedSettings, setCachedSettings } from '../../../../lib/settings-cache';
import { settings, sales } from '../../../../db/schema';

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

function loadFont(doc: any) {
  (doc as any).setFont(FONT);
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const { saleId, sale: inlineSale } = await req.json() as any;
    let sale;
    if (inlineSale) {
      sale = inlineSale;
    } else if (saleId) {
      const rows = await db.select().from(sales)
        .where(and(eq(sales.id, saleId), eq(sales.tenantId, tenantId)))
        .limit(1);
      if (rows.length === 0) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
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
      return NextResponse.json({ error: 'saleId o sale requerido' }, { status: 400 });
    }

    const settingsData = await getSettings(tenantId) as Record<string, string>;
    const cif = settingsData?.companyCif || '';
    const address = settingsData?.companyAddress || '';
    const phone = settingsData?.companyPhone || '';
    const name = settingsData?.restaurantName || 'FACTURA';
    const footer = settingsData?.footerText || 'Gracias por su visita';

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    loadFont(doc);
    const pageW = 210;

    (doc as any).setFontSize(18);
    (doc as any).text(name, pageW / 2, 20, { align: 'center' });
    (doc as any).setFontSize(8);
    let y = 27;
    if (cif) { (doc as any).text(`CIF/NIF: ${cif}`, pageW / 2, y, { align: 'center' }); y += 4; }
    if (address) { (doc as any).text(address, pageW / 2, y, { align: 'center' }); y += 4; }
    if (phone) { (doc as any).text(`Tel: ${phone}`, pageW / 2, y, { align: 'center' }); y += 4; }

    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    (doc as any).line(14, y + 2, pageW - 14, y + 2);
    y += 6;

    (doc as any).setFontSize(13);
    (doc as any).setFont(FONT, 'bold');
    (doc as any).text(sale.invoiceNumber || sale.id, pageW / 2, y, { align: 'center' });
    y += 6;
    (doc as any).setFont(FONT, 'normal');
    (doc as any).setFontSize(10);
    const dateStr = new Date(sale.closedAt).toLocaleDateString('es-ES', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    (doc as any).text(dateStr, pageW / 2, y, { align: 'center' });
    y += 8;

    const clientLines = [];
    clientLines.push(`Cliente: ${sale.invoiceName || '—'}`);
    clientLines.push(`NIF: ${sale.invoiceNif || '—'}`);
    if (sale.invoiceAddress) clientLines.push(`Dirección: ${sale.invoiceAddress}`);
    clientLines.push(`Mesa: ${sale.tableName}  ·  Camarero: ${sale.employeeName || '—'}`);

    doc.setFillColor(245, 245, 245);
    doc.roundedRect(14, y, pageW - 28, 4 + clientLines.length * 4.5, 2, 2, 'F');
    (doc as any).setFontSize(9);
    let cy = y + 3;
    for (const line of clientLines) {
      (doc as any).text(line, 18, cy);
      cy += 4.5;
    }
    y = cy + 6;

    const items = (sale.items || []).filter((i: any) => !i.voided);
    const bodyRows = items.map((i: any) => [
      i.name?.slice(0, 40) || '',
      String(i.qty || 1),
      `${(i.price || 0).toFixed(2)}`,
      `${((i.price || 0) * (i.qty || 0)).toFixed(2)}`,
    ]);

    const total = sale.totalWithTip || sale.total || 0;
    const base = total / 1.07;
    const igic = total - base;

    (doc as any).autoTable({
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
      didParseCell: (data: any) => {
        if (data.section === 'foot' && data.row.index === 2) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 10;
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    if (sale.tip > 0) {
      (doc as any).setFontSize(9);
      (doc as any).text(`Propina (NO fiscal): +${sale.tip.toFixed(2)} €`, pageW - 14, y, { align: 'right' });
      y += 5;
    }
    if (sale.discount > 0) {
      (doc as any).setFontSize(9);
      (doc as any).text(`Descuento aplicado: ${sale.discount}%`, pageW - 14, y, { align: 'right' });
      y += 5;
    }
    if (sale.invoiceEmail) {
      (doc as any).setFontSize(8);
      (doc as any).text(`Enviada a: ${sale.invoiceEmail}`, 14, y);
      y += 5;
    }

    (doc as any).setDrawSize(0.3);
    (doc as any).line(14, y + 2, pageW - 14, y + 2);
    (doc as any).setFontSize(8);
    (doc as any).setTextColor(136, 136, 136);
    (doc as any).text(footer, pageW / 2, y + 6, { align: 'center' });

    const pdfBuffer = Buffer.from((doc as any).output('arraybuffer'));
    const base64 = pdfBuffer.toString('base64');

    return NextResponse.json({
      ok: true,
      pdf: base64,
      filename: `factura_${sale.invoiceNumber || sale.id}.pdf`,
      saleId: sale.id,
    });
  } catch (err: any) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
