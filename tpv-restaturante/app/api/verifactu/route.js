import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';
import { registerSaleInFiskaly } from '../../../lib/fiskaly';
import { generateRegistroFactura, formatFecha } from '../../../lib/verifactu';

export async function GET(req) {
  try {
    const tenantId = getTenantId(req);
    const rows = await sql`
      SELECT * FROM verifactu_registros WHERE tenant_id = ${tenantId} ORDER BY id DESC
    `;
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const tenantId = getTenantId(req);
    const { saleId, sale } = await req.json();
    if (!saleId || !sale) {
      return NextResponse.json({ error: 'saleId y sale son requeridos' }, { status: 400 });
    }

    const existing = await sql`
      SELECT id FROM verifactu_registros WHERE sale_id = ${saleId} AND tenant_id = ${tenantId}
    `;
    if (existing.length > 0) {
      const row = await sql`
        SELECT * FROM verifactu_registros WHERE sale_id = ${saleId} AND tenant_id = ${tenantId} LIMIT 1
      `;
      return NextResponse.json(row[0], { status: 200 });
    }

    const year = new Date(sale.closedAt ?? Date.now()).getFullYear();
    const countRows = await sql`
      SELECT COUNT(*) as cnt FROM verifactu_registros
      WHERE num_serie LIKE ${'VERI-' + year + '-%'} AND tenant_id = ${tenantId}
    `;
    const seq = parseInt(countRows[0].cnt, 10) + 1;
    const numSerie = `VERI-${year}-${String(seq).padStart(6, '0')}`;

    // La propina no es fiscal, se excluye de la base imponible
    const importeTotal = Number((sale.total ?? sale.totalWithTip ?? 0).toFixed(2));
    const baseImponible = Number((importeTotal / 1.07).toFixed(2));
    const cuotaIva = Number((importeTotal - baseImponible).toFixed(2));
    const fechaExpedicion = formatFecha(sale.closedAt ?? Date.now());
    const now = Date.now();

    let fiskalyInvoiceId = null;
    let verificationUrl = null;
    let qrUrl = null;
    let estado = 'pendiente';
    let hash = '0';
    let xml = '';
    let fechaHoraFirma = null; // se persiste para poder verificar la cadena después

    const lastRows = await sql`
      SELECT huella FROM verifactu_registros WHERE tenant_id = ${tenantId} ORDER BY id DESC LIMIT 1
    `;
    const previousHash = lastRows.length > 0 ? lastRows[0].huella : '0';

    try {
      const fiskalyResult = await registerSaleInFiskaly(sale, numSerie);
      fiskalyInvoiceId = fiskalyResult.fiskalyInvoiceId;
      verificationUrl = fiskalyResult.verificationUrl;
      qrUrl = fiskalyResult.qrUrl;
      estado = 'registrado';

      const localResult = generateRegistroFactura(sale, previousHash, numSerie, {
        importeTotal,
        baseImponible,
        cuotaIGIC: cuotaIva,
        fechaExpedicion,
      });
      hash = localResult.hash;
      xml = localResult.xml;
      fechaHoraFirma = localResult.fechaHoraFirma;
      if (!qrUrl) qrUrl = localResult.qrUrl;
    } catch (fkErr) {
      console.warn('Fiskaly fallback a simulación local:', fkErr.message);
      const fallback = generateRegistroFactura(sale, previousHash, numSerie, {
        importeTotal,
        baseImponible,
        cuotaIGIC: cuotaIva,
        fechaExpedicion,
      });
      hash = fallback.hash;
      xml = fallback.xml;
      fechaHoraFirma = fallback.fechaHoraFirma;
      qrUrl = fallback.qrUrl;
      estado = 'simulado';
    }

    const inserted = await sql`
      INSERT INTO verifactu_registros
        (sale_id, num_serie, fecha_expedicion, importe_total, base_imponible,
         cuota_iva, huella_anterior, huella, xml_registro, qr_url, estado, created_at,
         fiskaly_invoice_id, verification_url, fecha_hora_firma, payment_intent_id, tenant_id)
      VALUES (
        ${saleId}, ${numSerie}, ${fechaExpedicion},
        ${importeTotal}, ${baseImponible}, ${cuotaIva},
        ${previousHash}, ${hash}, ${xml}, ${qrUrl || ''}, ${estado}, ${now},
        ${fiskalyInvoiceId}, ${verificationUrl}, ${fechaHoraFirma},
        ${sale.paymentIntentId ?? ''}, ${tenantId}
      )
      RETURNING *
    `;

    return NextResponse.json(inserted[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
