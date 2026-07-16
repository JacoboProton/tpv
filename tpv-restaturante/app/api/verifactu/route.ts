import { NextRequest, NextResponse } from 'next/server';
import { eq, and, like, desc, sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { registerSaleInFiskaly } from '../../../lib/fiskaly';
import { generateRegistroFactura, formatFecha } from '../../../lib/verifactu';
import { verifactuRegistros } from '../../../db/schema';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const rows = await db.select().from(verifactuRegistros)
      .where(eq(verifactuRegistros.tenantId, tenantId))
      .orderBy(desc(verifactuRegistros.id));
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const { saleId, sale } = await req.json() as any;
    if (!saleId || !sale) {
      return NextResponse.json({ error: 'saleId y sale son requeridos' }, { status: 400 });
    }

    const existing = await db.select({ id: verifactuRegistros.id }).from(verifactuRegistros)
      .where(and(eq(verifactuRegistros.saleId, saleId), eq(verifactuRegistros.tenantId, tenantId)));
    if (existing.length > 0) {
      const row = await db.select().from(verifactuRegistros)
        .where(and(eq(verifactuRegistros.saleId, saleId), eq(verifactuRegistros.tenantId, tenantId)))
        .limit(1);
      return NextResponse.json(row[0], { status: 200 });
    }

    const year = new Date(sale.closedAt ?? Date.now()).getFullYear();
    const countRows = await db.select({ cnt: sql<string>`COUNT(*)` }).from(verifactuRegistros)
      .where(and(
        like(verifactuRegistros.numSerie, `VERI-${year}-%`),
        eq(verifactuRegistros.tenantId, tenantId)
      ));
    const seq = parseInt(countRows[0].cnt, 10) + 1;
    const numSerie = `VERI-${year}-${String(seq).padStart(6, '0')}`;

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
    let fechaHoraFirma = null;

    const lastRows = await db.select({ huella: verifactuRegistros.huella }).from(verifactuRegistros)
      .where(eq(verifactuRegistros.tenantId, tenantId))
      .orderBy(desc(verifactuRegistros.id))
      .limit(1);
    const previousHash = lastRows.length > 0 ? lastRows[0].huella : '0';

    try {
      const fiskalyResult = await registerSaleInFiskaly(sale, numSerie);
      fiskalyInvoiceId = (fiskalyResult as any).fiskalyInvoiceId;
      verificationUrl = (fiskalyResult as any).verificationUrl;
      qrUrl = (fiskalyResult as any).qrUrl;
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
      console.warn('Fiskaly fallback a simulación local:', (fkErr as Error).message);
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

    const inserted = await db.insert(verifactuRegistros).values({
      saleId,
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

    return NextResponse.json(inserted[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
