import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { computeHash, formatHora } from '../../../../lib/verifactu';

const NIF_EMISOR = process.env.FISKALY_TAXPAYER_NIF || 'B12345678';

export async function POST(req) {
  try {
    const { saleId } = await req.json();
    if (!saleId) {
      return NextResponse.json({ error: 'saleId es requerido' }, { status: 400 });
    }

    const rows = await sql`
      SELECT * FROM verifactu_registros WHERE sale_id = ${saleId} LIMIT 1
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 });
    }

    const r = rows[0];

    // Obtener la venta original para tener closedAt exacto
    const sales = await sql`
      SELECT * FROM sales WHERE id = ${r.sale_id} LIMIT 1
    `;
    if (sales.length === 0) {
      return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
    }
    const sale = sales[0];

    // Verificar cadena: recalcular hash con los mismos datos originales
    const ts = sale.closed_at ? Number(sale.closed_at) : Number(r.created_at);
    const fechaExpedicion = r.fecha_expedicion;
    const hora = formatHora(ts);
    const fechaHoraFirma = `${fechaExpedicion}T${hora}`;

    const registroData = {
      nif: NIF_EMISOR,
      numSerie: r.num_serie,
      fechaExpedicion,
      tipoFactura: 'F1',
      cuotaTotal: Number(r.cuota_iva),
      importeTotal: Number(r.importe_total),
      huellaAnterior: r.huella_anterior,
      fechaHoraFirma,
    };

    const expectedHash = computeHash(registroData);
    const isValid = expectedHash === r.huella;

    return NextResponse.json({
      saleId: r.sale_id,
      numSerie: r.num_serie,
      importeTotal: r.importe_total,
      estado: r.estado,
      qrUrl: r.qr_url || null,
      verificationUrl: r.verification_url || null,
      fiskalyInvoiceId: r.fiskaly_invoice_id || null,
      huella: r.huella,
      valid: isValid,
      details: {
        expectedHash,
        actualHash: r.huella,
        huellaAnterior: r.huella_anterior,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
