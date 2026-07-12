import { NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { sql } from '../../../../lib/db';
import { getTenantId } from '../../../../lib/tenant';
import { getCachedSettings, setCachedSettings } from '../../../../lib/settings-cache';

async function getSettings(tenantId) {
  const cached = getCachedSettings();
  if (cached) return cached;
  const rows = await sql`SELECT key, value FROM settings WHERE tenant_id = ${tenantId}`;
  const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
  setCachedSettings(settings);
  return settings;
}

const FONT = 'Helvetica';

function loadFont(doc) {
  doc.setFont(FONT);
}

// POST /api/invoice/pdf
// body: { saleId } or { sale }
export async function POST(req) {
  try {
    const tenantId = getTenantId(req);
    const { saleId, sale: inlineSale } = await req.json();
    let sale;
    if (inlineSale) {
      sale = inlineSale;
    } else if (saleId) {
      const rows = await sql`SELECT * FROM sales WHERE id = ${saleId} AND tenant_id = ${tenantId} LIMIT 1`;
      if (rows.length === 0) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
      const r = rows[0];
      sale = {
        id: r.id, tableName: r.table_name, employeeName: r.employee_name,
        items: r.items, total: Number(r.total), tip: Number(r.tip || 0),
        discount: Number(r.discount || 0),
        invoiceNumber: r.invoice_number || r.id,
        invoiceName: r.invoice_name, invoiceNif: r.invoice_nif,
        invoiceAddress: r.invoice_address, invoiceEmail: r.invoice_email,
        closedAt: Number(r.closed_at), paymentMethod: r.payment_method,
        totalWithTip: Number(r.total_with_tip || r.total || 0),
      };
    } else {
      return NextResponse.json({ error: 'saleId o sale requerido' }, { status: 400 });
    }

    const settings = await getSettings(tenantId);
    const cif = settings?.companyCif || '';
    const address = settings?.companyAddress || '';
    const phone = settings?.companyPhone || '';
    const name = settings?.restaurantName || 'FACTURA';
    const footer = settings?.footerText || 'Gracias por su visita';

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    loadFont(doc);
    const pageW = 210;

    // ---- Header ----
    doc.setFontSize(18);
    doc.text(name, pageW / 2, 20, { align: 'center' });
    doc.setFontSize(8);
    let y = 27;
    if (cif) { doc.text(`CIF/NIF: ${cif}`, pageW / 2, y, { align: 'center' }); y += 4; }
    if (address) { doc.text(address, pageW / 2, y, { align: 'center' }); y += 4; }
    if (phone) { doc.text(`Tel: ${phone}`, pageW / 2, y, { align: 'center' }); y += 4; }

    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(14, y + 2, pageW - 14, y + 2);
    y += 6;

    // Invoice number + date
    doc.setFontSize(13);
    doc.setFont(FONT, 'bold');
    doc.text(sale.invoiceNumber || sale.id, pageW / 2, y, { align: 'center' });
    y += 6;
    doc.setFont(FONT, 'normal');
    doc.setFontSize(10);
    const dateStr = new Date(sale.closedAt).toLocaleDateString('es-ES', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    doc.text(dateStr, pageW / 2, y, { align: 'center' });
    y += 8;

    // ---- Client box ----
    const clientLines = [];
    clientLines.push(`Cliente: ${sale.invoiceName || '—'}`);
    clientLines.push(`NIF: ${sale.invoiceNif || '—'}`);
    if (sale.invoiceAddress) clientLines.push(`Dirección: ${sale.invoiceAddress}`);
    clientLines.push(`Mesa: ${sale.tableName}  ·  Camarero: ${sale.employeeName || '—'}`);

    doc.setFillColor(245, 245, 245);
    doc.roundedRect(14, y, pageW - 28, 4 + clientLines.length * 4.5, 2, 2, 'F');
    doc.setFontSize(9);
    let cy = y + 3;
    for (const line of clientLines) {
      doc.text(line, 18, cy);
      cy += 4.5;
    }
    y = cy + 6;

    // ---- Items table ----
    const items = (sale.items || []).filter(i => !i.voided);
    const bodyRows = items.map(i => [
      i.name?.slice(0, 40) || '',
      String(i.qty || 1),
      `${(i.price || 0).toFixed(2)}`,
      `${((i.price || 0) * (i.qty || 0)).toFixed(2)}`,
    ]);

    const total = sale.totalWithTip || sale.total || 0;
    const base = total / 1.07;
    const igic = total - base;

    doc.autoTable({
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
      didParseCell: (data) => {
        if (data.section === 'foot' && data.row.index === 2) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 10;
        }
      },
    });
    y = doc.lastAutoTable.finalY + 6;

    // ---- Extra info ----
    if (sale.tip > 0) {
      doc.setFontSize(9);
      doc.text(`Propina (NO fiscal): +${sale.tip.toFixed(2)} €`, pageW - 14, y, { align: 'right' });
      y += 5;
    }
    if (sale.discount > 0) {
      doc.setFontSize(9);
      doc.text(`Descuento aplicado: ${sale.discount}%`, pageW - 14, y, { align: 'right' });
      y += 5;
    }
    if (sale.invoiceEmail) {
      doc.setFontSize(8);
      doc.text(`Enviada a: ${sale.invoiceEmail}`, 14, y);
      y += 5;
    }

    // ---- Footer ----
    doc.setDrawSize(0.3);
    doc.line(14, y + 2, pageW - 14, y + 2);
    doc.setFontSize(8);
    doc.setTextColor(136, 136, 136);
    doc.text(footer, pageW / 2, y + 6, { align: 'center' });

    // ---- Generate ----
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    const base64 = pdfBuffer.toString('base64');

    return NextResponse.json({
      ok: true,
      pdf: base64,
      filename: `factura_${sale.invoiceNumber || sale.id}.pdf`,
      saleId: sale.id,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}