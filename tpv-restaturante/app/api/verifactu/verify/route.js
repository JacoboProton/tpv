import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

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

    return NextResponse.json({
      saleId: r.sale_id,
      numSerie: r.num_serie,
      importeTotal: r.importe_total,
      estado: r.estado,
      qrUrl: r.qr_url || null,
      verificationUrl: r.verification_url || null,
      fiskalyInvoiceId: r.fiskaly_invoice_id || null,
      huella: r.huella,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
