import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { computeHash } from '../../../../lib/verifactu';

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

    // La fechaHoraFirma es uno de los 8 campos del hash SHA-256 y NO se puede
    // recalcular a partir de closed_at (la firma ocurre en un instante distinto
    // al cierre de la venta). Se persiste al crear/regenerar y aquí se lee tal cual.
    const fechaHoraFirma = r.fecha_hora_firma;
    if (!fechaHoraFirma) {
      // Registro previo al fix: no podemos recuperar la hora exacta de la firma.
      return NextResponse.json({
        saleId: r.sale_id,
        numSerie: r.num_serie,
        importeTotal: r.importe_total,
        estado: r.estado,
        qrUrl: r.qr_url || null,
        verificationUrl: r.verification_url || null,
        fiskalyInvoiceId: r.fiskaly_invoice_id || null,
        huella: r.huella,
        valid: null,
        details: {
          reason: 'sin fecha de firma persistida',
          hint: 'Re-firma este registro (regenerate) para poder verificarlo.',
          huellaAnterior: r.huella_anterior,
        },
      });
    }

    // Verificar cadena: recalcular hash con los datos originales persistidos.
    const fechaExpedicion = r.fecha_expedicion;
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
        fechaHoraFirma,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
