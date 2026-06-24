import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { generateRegistroFactura } from '../../../lib/verifactu';

// ---------- GET /api/verifactu ----------
export async function GET() {
  try {
    const rows = await sql`
      SELECT * FROM verifactu_registros ORDER BY id DESC
    `;
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Verifactu GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ---------- POST /api/verifactu ----------
export async function POST(req) {
  try {
    const { saleId, sale } = await req.json();

    if (!saleId || !sale) {
      return NextResponse.json({ error: 'saleId y sale son requeridos' }, { status: 400 });
    }

    // Comprobar si ya existe un registro para esta venta
    const existing = await sql`
      SELECT id FROM verifactu_registros WHERE sale_id = ${saleId}
    `;
    if (existing.length > 0) {
      const row = await sql`
        SELECT * FROM verifactu_registros WHERE sale_id = ${saleId} LIMIT 1
      `;
      return NextResponse.json(row[0], { status: 200 });
    }

    // Obtener el último registro para encadenar el hash
    const lastRows = await sql`
      SELECT huella, num_serie FROM verifactu_registros ORDER BY id DESC LIMIT 1
    `;

    const previousHash = lastRows.length > 0 ? lastRows[0].huella : '0';

    // Calcular el siguiente número de secuencia
    const countRows = await sql`
      SELECT COUNT(*) as cnt FROM verifactu_registros
    `;
    const seq      = parseInt(countRows[0].cnt, 10) + 1;
    const year     = new Date(sale.closedAt ?? Date.now()).getFullYear();
    const numSerie = `VERI-${year}-${String(seq).padStart(6, '0')}`;

    // Generar el registro Verifactu
    const { xml, hash, qrUrl, registroData } = generateRegistroFactura(sale, previousHash, numSerie);

    const importeTotal  = Number(registroData.importeTotal.toFixed(2));
    // IGIC Canarias: 7%  →  base = total / 1.07
    const baseImponible = Number((importeTotal / 1.07).toFixed(2));
    const cuotaIva      = Number((importeTotal - baseImponible).toFixed(2));
    const now           = Date.now();

    // Guardar en BD
    const inserted = await sql`
      INSERT INTO verifactu_registros
        (sale_id, num_serie, fecha_expedicion, importe_total, base_imponible,
         cuota_iva, huella_anterior, huella, xml_registro, qr_url, estado, created_at)
      VALUES (
        ${saleId}, ${numSerie}, ${registroData.fechaExpedicion},
        ${importeTotal}, ${baseImponible}, ${cuotaIva},
        ${previousHash}, ${hash}, ${xml}, ${qrUrl}, 'simulado', ${now}
      )
      RETURNING *
    `;

    return NextResponse.json(inserted[0], { status: 201 });
  } catch (err) {
    console.error('Verifactu POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
