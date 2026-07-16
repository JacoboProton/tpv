import { NextRequest, NextResponse } from 'next/server';
import { eq, and, asc } from 'drizzle-orm';
import { getDb } from '../../../../lib/drizzle';
import { getTenantId } from '../../../../lib/tenant';
import { registerSaleInFiskaly } from '../../../../lib/fiskaly';
import { generateRegistroFactura } from '../../../../lib/verifactu';
import { verifactuRegistros, sales } from '../../../../db/schema';

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const simulados = await db.select().from(verifactuRegistros)
      .where(and(eq(verifactuRegistros.estado, 'simulado'), eq(verifactuRegistros.tenantId, tenantId)))
      .orderBy(asc(verifactuRegistros.id));

    if (simulados.length === 0) {
      return NextResponse.json({
        message: 'No hay registros simulados para reintentar',
        total: 0,
        retried: 0,
      });
    }

    const results = [];

    for (const reg of simulados) {
      try {
        const saleRows = await db.select().from(sales)
          .where(and(eq(sales.id, reg.saleId), eq(sales.tenantId, tenantId)))
          .limit(1);
        if (saleRows.length === 0) {
          results.push({ saleId: reg.saleId, success: false, error: 'Venta no encontrada' });
          continue;
        }

        const sale = {
          id: saleRows[0].id, closedAt: saleRows[0].closedAt ? Number(saleRows[0].closedAt) : Date.now(),
          totalWithTip: saleRows[0].totalWithTip ? Number(saleRows[0].totalWithTip) : Number(saleRows[0].total),
          total: saleRows[0].total ? Number(saleRows[0].total) : 0,
          tableName: saleRows[0].tableName ?? undefined,
          items: (saleRows[0].items ?? []) as any[],
        };

        const fiskalyResult = await registerSaleInFiskaly(sale, reg.numSerie);

        const localResult = generateRegistroFactura(sale, reg.huellaAnterior, reg.numSerie, {
          importeTotal: Number(reg.importeTotal),
          baseImponible: Number(reg.baseImponible),
          cuotaIGIC: Number(reg.cuotaIva),
          fechaExpedicion: reg.fechaExpedicion,
        });

        await db.update(verifactuRegistros)
          .set({
            estado: 'registrado',
            fiskalyInvoiceId: (fiskalyResult as any).fiskalyInvoiceId,
            verificationUrl: (fiskalyResult as any).verificationUrl,
            qrUrl: (fiskalyResult as any).qrUrl,
            huella: localResult.hash,
            xmlRegistro: localResult.xml,
            fechaHoraFirma: localResult.fechaHoraFirma,
          })
          .where(and(eq(verifactuRegistros.id, reg.id), eq(verifactuRegistros.tenantId, tenantId)));

        results.push({
          saleId: reg.saleId,
          numSerie: reg.numSerie,
          success: true,
          fiskalyInvoiceId: (fiskalyResult as any).fiskalyInvoiceId,
        });
      } catch (err) {
        results.push({
          saleId: reg.saleId,
          numSerie: reg.numSerie,
          success: false,
          error: (err as Error).message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return NextResponse.json({
      message: `Reintentados ${results.length} registros. ${successCount} exitosos, ${results.length - successCount} fallaron.`,
      total: simulados.length,
      retried: results.length,
      success: successCount,
      failed: results.length - successCount,
      results,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
