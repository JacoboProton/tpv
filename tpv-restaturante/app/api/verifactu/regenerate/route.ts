import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '../../../../lib/drizzle';
import { getTenantId } from '../../../../lib/tenant';
import { requireAdminPin } from '../../../../lib/rbac';
import { registerSaleInFiskaly } from '../../../../lib/fiskaly';
import { generateRegistroFactura, formatFecha } from '../../../../lib/verifactu';
import { verifactuRegistros, sales, backups } from '../../../../db/schema';

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json() as any;
    const adminCheck = await requireAdminPin(req, body.adminPin);
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
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
      return NextResponse.json({ error: 'No hay ventas para regenerar' }, { status: 400 });
    }

    await db.delete(verifactuRegistros)
      .where(eq(verifactuRegistros.tenantId, tenantId));

    const results = [];
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

        let fiskalyInvoiceId = null;
        let verificationUrl = null;
        let qrUrl = null;
        let estado = 'pendiente';
        let hash = '0';
        let xml = '';
        let fechaHoraFirma = null;

        try {
          const fiskalySale = {
            id: sale.id, total: Number(sale.total ?? 0), totalWithTip: Number(sale.totalWithTip ?? sale.total ?? 0),
            closedAt: sale.closedAt ? Number(sale.closedAt) : Date.now(),
            items: (sale.items ?? []) as any[],
          };
          const fiskalyResult = await registerSaleInFiskaly(fiskalySale, numSerie);
          fiskalyInvoiceId = (fiskalyResult as any).fiskalyInvoiceId;
          verificationUrl = (fiskalyResult as any).verificationUrl;
          qrUrl = (fiskalyResult as any).qrUrl;
          estado = 'registrado';

          const saleForVerifactu = {
            id: sale.id, closedAt: sale.closedAt ? Number(sale.closedAt) : Date.now(),
            totalWithTip: sale.totalWithTip ? Number(sale.totalWithTip) : Number(sale.total),
            total: sale.total ? Number(sale.total) : 0,
            tableName: sale.tableName ?? undefined,
            items: (sale.items ?? []) as any[],
          };

          const localResult = generateRegistroFactura(saleForVerifactu, previousHash, numSerie);
          hash = localResult.hash;
          xml = localResult.xml;
          fechaHoraFirma = localResult.fechaHoraFirma;
          if (!qrUrl) qrUrl = localResult.qrUrl;
        } catch (fkErr) {
          console.error(`Fiskaly fallback a simulación local para venta ${sale.id}:`, (fkErr as Error).message);

          const saleForVerifactu = {
            id: sale.id, closedAt: sale.closedAt ? Number(sale.closedAt) : Date.now(),
            totalWithTip: sale.totalWithTip ? Number(sale.totalWithTip) : Number(sale.total),
            total: sale.total ? Number(sale.total) : 0,
            tableName: sale.tableName ?? undefined,
            items: (sale.items ?? []) as any[],
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
        results.push({ saleId: sale.id, success: false, error: (err as Error).message });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return NextResponse.json({
      message: `Regenerados ${successCount}/${allSales.length} registros Verifactu`,
      total: allSales.length,
      success: successCount,
      failed: allSales.length - successCount,
      results,
    });
  } catch (err) {
    const msg = (err as Error).message;
    const cause = (err as Error).cause;
    return NextResponse.json({ error: cause ? `${msg}: ${cause}` : msg }, { status: 500 });
  }
}
