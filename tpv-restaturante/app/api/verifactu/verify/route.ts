import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../../../../lib/drizzle';
import { getTenantId } from '../../../../lib/tenant';
import { computeHash } from '../../../../lib/verifactu';
import { verifactuRegistros } from '../../../../db/schema';
import { apiOk, apiError, apiBadRequest, apiNotFound } from '../../../../lib/infrastructure/response';

const NIF_EMISOR = process.env.FISKALY_TAXPAYER_NIF || 'B12345678';

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const { saleId } = await req.json() as any;
    if (!saleId) {
      return apiBadRequest('saleId es requerido');
    }

    const rows = await db.select().from(verifactuRegistros)
      .where(and(eq(verifactuRegistros.saleId, saleId), eq(verifactuRegistros.tenantId, tenantId)))
      .limit(1);
    if (rows.length === 0) {
      return apiNotFound('Registro no encontrado');
    }

    const r = rows[0];

    const fechaHoraFirma = r.fechaHoraFirma;
    console.log('[Verifactu Verify]', {
      saleId: r.saleId,
      numSerie: r.numSerie,
      fechaExpedicion: r.fechaExpedicion,
      fechaHoraFirma,
      cuotaTotal: Number(r.cuotaIva),
      importeTotal: Number(r.importeTotal),
      huellaAnterior: r.huellaAnterior,
      huella: r.huella,
      estado: r.estado,
    });
    if (!fechaHoraFirma) {
      return apiOk({
        saleId: r.saleId,
        numSerie: r.numSerie,
        importeTotal: r.importeTotal,
        estado: r.estado,
        qrUrl: r.qrUrl || null,
        verificationUrl: r.verificationUrl || null,
        fiskalyInvoiceId: r.fiskalyInvoiceId || null,
        huella: r.huella,
        valid: null,
        details: {
          reason: 'sin fecha de firma persistida',
          hint: 'Re-firma este registro (regenerate) para poder verificarlo.',
          huellaAnterior: r.huellaAnterior,
        },
      });
    }

    const fechaExpedicion = r.fechaExpedicion;
    const registroData = {
      nif: NIF_EMISOR,
      numSerie: r.numSerie,
      fechaExpedicion,
      tipoFactura: 'F1',
      cuotaTotal: Number(r.cuotaIva),
      importeTotal: Number(r.importeTotal),
      huellaAnterior: r.huellaAnterior,
      fechaHoraFirma,
    };

    const expectedHash = computeHash(registroData);
    const isValid = expectedHash === r.huella;

    return apiOk({
      saleId: r.saleId,
      numSerie: r.numSerie,
      importeTotal: r.importeTotal,
      estado: r.estado,
      qrUrl: r.qrUrl || null,
      verificationUrl: r.verificationUrl || null,
      fiskalyInvoiceId: r.fiskalyInvoiceId || null,
      huella: r.huella,
      valid: isValid,
      details: {
        expectedHash,
        actualHash: r.huella,
        huellaAnterior: r.huellaAnterior,
        fechaHoraFirma,
      },
    });
  } catch (err) { return apiError(err); }
}
