import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { computeHash } from '../../../../lib/verifactu';

// ---------- POST /api/verifactu/verify ----------
export async function POST(req) {
  try {
    const { saleId } = await req.json();

    if (!saleId) {
      return NextResponse.json({ error: 'saleId es requerido' }, { status: 400 });
    }

    // Obtener el registro que queremos verificar
    const rows = await sql`
      SELECT * FROM verifactu_registros WHERE sale_id = ${saleId} LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 });
    }

    const registro = rows[0];

    // Recalcular la huella con los datos almacenados
    const registroData = {
      nif:              'B12345678',
      numSerie:         registro.num_serie,
      fechaExpedicion:  registro.fecha_expedicion,
      tipoFactura:      'F1',
      cuotaTotal:       Number(registro.cuota_iva),
      importeTotal:     Number(registro.importe_total),
      huellaAnterior:   registro.huella_anterior,
      fechaHoraFirma:   extractFechaHoraFromXml(registro.xml_registro),
    };

    const expectedHash = computeHash(registroData);
    const storedHash   = registro.huella;
    const valid        = expectedHash === storedHash;

    return NextResponse.json({
      valid,
      details: {
        saleId,
        numSerie:        registro.num_serie,
        fechaExpedicion: registro.fecha_expedicion,
        importeTotal:    registro.importe_total,
        storedHash,
        expectedHash,
        hashMatch:       valid,
        estado:          registro.estado,
      },
    });
  } catch (err) {
    console.error('Verifactu verify error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * Extrae el valor de FechaHoraHusoHorarioFirma del XML almacenado.
 * Fallback a string vacío si no se encuentra.
 */
function extractFechaHoraFromXml(xml) {
  if (!xml) return '';
  const match = xml.match(/<FechaHoraHusoHorarioFirma>([^<]+)<\/FechaHoraHusoHorarioFirma>/);
  return match ? match[1] : '';
}
