import { NextRequest } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '../../../../lib/drizzle';
import { getTenantId } from '../../../../lib/tenant';
import { requireAdminPin } from '../../../../lib/rbac';
import { registerSaleInFiskaly, type FiskalyInvoiceResult } from '../../../../lib/fiskaly';
import { generateRegistroFactura, formatFecha } from '../../../../lib/verifactu';
import { verifactuRegistros, sales, backups } from '../../../../db/schema';
import { apiOk, apiError, apiBadRequest, apiUnauthorized } from '../../../../lib/infrastructure/response';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function toItems(v: unknown): Record<string, unknown>[] {
  const list: unknown[] = Array.isArray(v) ? v : [];
  return list.flatMap((i) => isRecord(i) ? [i] : []);
}

// SIN requireRole — usa requireAdminPin (autenticación por PIN de administrador)
// porque es una operación sensible (regenera registros Verifactu ante la AEAT) que
// requiere confirmación explícita con PIN. La llama el admin desde Gestoría →
// Verifactu cuando un registro falló y necesita reenviarse.
export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json() as Record<string, unknown>;
    const adminPin = typeof body.adminPin === 'string' ? body.adminPin : '';
    const adminCheck = await requireAdminPin(req, adminPin);
    if (!adminCheck.authorized) {
      return apiUnauthorized(adminCheck.error);
    }

    const tenantId = getTenantId(req);

    const existingRegs = await db.select().from(verifactuRegistros)
      .where(eq(verifactuRegistros.tenantId, tenantId));
    if (existingRegs.length > 0) {
      const backupId = 'backup_verifactu_' + Date.now();
      await db.insert(backups).values({
        id: backupId,
        data: existingRegs,
        createdAt: Date.now(),
      }).onConflictDoNothing();
    }

    const allSales = await db.select().from(sales)
      .where(eq(sales.tenantId, tenantId))
      .orderBy(sales.closedAt);

    if (allSales.length === 0) {
      return apiBadRequest('No hay ventas para regenerar');
    }

    await db.delete(verifactuRegistros)
      .where(eq(verifactuRegistros.tenantId, tenantId));

    const results: Array<{ saleId: string; success: boolean; numSerie?: string; error?: string }> = [];
    let previousHash = '0';
    const year = new Date().getFullYear();

    for (let i = 0; i < allSales.length; i++) {
      const sale = allSales[i];
      try {
        const seq = i + 1;
        const numSerie = `VERI-${year}-${String(seq).padStart(6, '0')}`;

        const total = Number(sale.total ?? sale.totalWithTip ?? 0);
        const importeTotal = Number(total.toFixed(2));
        const baseImponible = Number((importeTotal / 1.07).toFixed(2));
        const cuotaIva = Number((importeTotal - baseImponible).toFixed(2));

        const closedAt = sale.closedAt ? Number(sale.closedAt) : Date.now();
        const fechaExpedicion = formatFecha(closedAt);
        const now = Date.now();

        let fiskalyInvoiceId: string | null = null;
        let verificationUrl: string | null = null;
        let qrUrl: string | null = null;
        let estado = 'pendiente';
        let hash = '0';
        let xml = '';
        let fechaHoraFirma: string | null = null;

        try {
          const fiskalySale = {
            id: sale.id, total: Number(sale.total ?? 0), totalWithTip: Number(sale.totalWithTip ?? sale.total ?? 0),
            closedAt: sale.closedAt ? Number(sale.closedAt) : Date.now(),
            items: toItems(sale.items),
          };
          const fiskalyResult = await registerSaleInFiskaly(fiskalySale, numSerie);
          fiskalyInvoiceId = fiskalyResult.fiskalyInvoiceId ?? null;
          verificationUrl = fiskalyResult.verificationUrl ?? null;
          qrUrl = fiskalyResult.qrUrl ?? null;
          estado = 'registrado';

          const saleForVerifactu = {
            id: sale.id, closedAt: sale.closedAt ? Number(sale.closedAt) : Date.now(),
            totalWithTip: sale.totalWithTip ? Number(sale.totalWithTip) : Number(sale.total),
            total: sale.total ? Number(sale.total) : 0,
            tableName: sale.tableName ?? undefined,
            items: toItems(sale.items),
          };

          const localResult = generateRegistroFactura(saleForVerifactu, previousHash, numSerie);
          hash = localResult.hash;
          xml = localResult.xml;
          fechaHoraFirma = localResult.fechaHoraFirma;
          if (!qrUrl) qrUrl = localResult.qrUrl;
        } catch (fkErr) {
          console.error(`Fiskaly fallback a simulación local para venta ${sale.id}:`, (fkErr instanceof Error ? fkErr.message : String(fkErr)));

          const saleForVerifactu = {
            id: sale.id, closedAt: sale.closedAt ? Number(sale.closedAt) : Date.now(),
            totalWithTip: sale.totalWithTip ? Number(sale.totalWithTip) : Number(sale.total),
            total: sale.total ? Number(sale.total) : 0,
            tableName: sale.tableName ?? undefined,
            items: toItems(sale.items),
          };

          const fallback = generateRegistroFactura(saleForVerifactu, previousHash, numSerie);
          hash = fallback.hash;
          xml = fallback.xml;
          fechaHoraFirma = fallback.fechaHoraFirma;
          qrUrl = fallback.qrUrl;
          estado = 'simulado';
        }

        const inserted = await db.insert(verifactuRegistros).values({
          saleId: sale.id,
          numSerie,
          fechaExpedicion,
          importeTotal: String(importeTotal),
          baseImponible: String(baseImponible),
          cuotaIva: String(cuotaIva),
          huellaAnterior: previousHash,
          huella: hash,
          xmlRegistro: xml,
          qrUrl: qrUrl || '',
          estado,
          createdAt: now,
          fiskalyInvoiceId,
          verificationUrl,
          fechaHoraFirma,
          paymentIntentId: sale.paymentIntentId ?? '',
          tenantId,
        }).returning();

        previousHash = hash;
        results.push({ saleId: sale.id, success: true, numSerie });
      } catch (err) {
        results.push({ saleId: sale.id, success: false, error: (err instanceof Error ? err.message : String(err)) });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return apiOk({
      message: `Regenerados ${successCount}/${allSales.length} registros Verifactu`,
      total: allSales.length,
      success: successCount,
      failed: allSales.length - successCount,
      results,
    });
  } catch (err) { return apiError(err); }
}
