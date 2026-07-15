import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { getTenantId } from '../../../../lib/tenant';
import { registerSaleInFiskaly } from '../../../../lib/fiskaly';
import { generateRegistroFactura, formatFecha } from '../../../../lib/verifactu';

// POST /api/verifactu/retry
// Retries Fiskaly registration for all 'simulado' records
export async function POST(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const simulados = await sql`
      SELECT * FROM verifactu_registros WHERE estado = 'simulado' AND tenant_id = ${tenantId} ORDER BY id ASC
    `;

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
        // Fetch the original sale
        const sales = await sql`
          SELECT * FROM sales WHERE id = ${reg.sale_id} AND tenant_id = ${tenantId} LIMIT 1
        `;
        if (sales.length === 0) {
          results.push({ saleId: reg.sale_id, success: false, error: 'Venta no encontrada' });
          continue;
        }

        const sale = {
          ...sales[0],
          closedAt: sales[0].closed_at ? Number(sales[0].closed_at) : Date.now(),
          totalWithTip: sales[0].total_with_tip ? Number(sales[0].total_with_tip) : Number(sales[0].total),
          total: sales[0].total ? Number(sales[0].total) : 0,
          tableName: sales[0].table_name,
          items: sales[0].items || [],
        };

        const fiskalyResult = await registerSaleInFiskaly(sale, reg.num_serie);

        // Recalcular hash y XML con el nuevo estado
        const localResult = generateRegistroFactura(sale, reg.huella_anterior, reg.num_serie, {
          importeTotal: Number(reg.importe_total),
          baseImponible: Number(reg.base_imponible),
          cuotaIGIC: Number(reg.cuota_iva),
          fechaExpedicion: reg.fecha_expedicion,
        });

        await sql`
          UPDATE verifactu_registros SET
            estado = 'registrado',
            fiskaly_invoice_id = ${(fiskalyResult as any).fiskalyInvoiceId},
            verification_url = ${(fiskalyResult as any).verificationUrl},
            qr_url = ${(fiskalyResult as any).qrUrl},
            huella = ${localResult.hash},
            xml_registro = ${localResult.xml},
            fecha_hora_firma = ${localResult.fechaHoraFirma}
          WHERE id = ${reg.id} AND tenant_id = ${tenantId}
        `;

        results.push({
          saleId: reg.sale_id,
          numSerie: reg.num_serie,
          success: true,
          fiskalyInvoiceId: (fiskalyResult as any).fiskalyInvoiceId,
        });
      } catch (err) {
        results.push({
          saleId: reg.sale_id,
          numSerie: reg.num_serie,
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
