import { NextRequest } from 'next/server';
import { and, desc, eq, gte, inArray, like, lte, sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { sales, verifactuRegistros, ticketCounters } from '../../../db/schema';
import { apiOk, apiError, apiBadRequest } from '../../../lib/infrastructure/response';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const year = searchParams.get('year');
    const ticketNumber = searchParams.get('ticketNumber');

    const conditions: ReturnType<typeof eq>[] = [];
    if (tenantId !== 'all') conditions.push(eq(sales.tenantId, tenantId));

    if (ticketNumber) {
      conditions.push(eq(sales.ticketNumber, parseInt(ticketNumber, 10)));
    } else {
      if (year) {
        const y = parseInt(year, 10);
        conditions.push(gte(sales.closedAt, new Date(y, 0, 1).getTime()));
        conditions.push(lte(sales.closedAt, new Date(y + 1, 0, 1).getTime() - 1));
      } else {
        if (from) conditions.push(gte(sales.closedAt, Number(from)));
        if (to) conditions.push(lte(sales.closedAt, Number(to)));
      }
    }

    const rows = await db.select().from(sales)
      .where(and(...conditions))
      .orderBy(desc(sales.closedAt));

    const saleIds = rows.map(r => r.id);
    let verifactuMap: Record<string, { estado: string; numSerie: string }> = {};
    if (saleIds.length > 0) {
      const verifactuRows = await db
        .select({ saleId: verifactuRegistros.saleId, estado: verifactuRegistros.estado, numSerie: verifactuRegistros.numSerie })
        .from(verifactuRegistros)
        .where(inArray(verifactuRegistros.saleId, saleIds));
      for (const v of verifactuRows) {
        verifactuMap[v.saleId] = { estado: v.estado, numSerie: v.numSerie };
      }
    }

    const mapped = rows.map(r => ({
      id: r.id, tableId: r.tableId, tableName: r.tableName,
      items: r.items, subtotal: Number(r.subtotal),
      discount: Number(r.discount), discountAmount: Number(r.discountAmount),
      total: Number(r.total), tip: Number(r.tip), totalWithTip: Number(r.totalWithTip),
      payments: r.payments, paymentMethod: r.paymentMethod, tipMethod: r.tipMethod,
      isFiado: r.isFiado, isDebtPayment: r.isDebtPayment,
      employeeId: r.employeeId, employeeName: r.employeeName,
      closedAt: Number(r.closedAt),
      invoiceNif: r.invoiceNif, invoiceName: r.invoiceName,
      invoiceAddress: r.invoiceAddress, invoiceEmail: r.invoiceEmail,
      invoiceNumber: r.invoiceNumber, invoiceCreated: r.invoiceCreated,
      invoiceCreatedAt: r.invoiceCreatedAt ? Number(r.invoiceCreatedAt) : null,
      refunds: r.refunds || [],
      paymentIntentId: r.paymentIntentId || '',
      stripeConfirmed: !!r.stripeConfirmed,
      disputeStatus: r.disputeStatus || '',
      disputeData: r.disputeData || {},
      verifactuStatus: verifactuMap[r.id]?.estado || '',
      verifactuNumSerie: verifactuMap[r.id]?.numSerie || '',
      ticketNumber: r.ticketNumber,
    }));
    return apiOk(mapped);
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const s = await req.json() as any;
    const tenantId = getTenantId(req);

    const year = new Date(Number(s.closedAt || Date.now())).getFullYear();
    const [counterRow] = await db.insert(ticketCounters).values({
      tenantId, year, counter: 1,
    }).onConflictDoUpdate({
      target: [ticketCounters.tenantId, ticketCounters.year],
      set: { counter: sql`ticket_counters.counter + 1` },
    }).returning({ counter: ticketCounters.counter });
    const ticketNumber = counterRow.counter;

    if (s.paymentIntentId) {
      const [stub] = await db.select({ id: sales.id }).from(sales)
        .where(and(eq(sales.paymentIntentId, s.paymentIntentId), like(sales.id, 'stub_%')))
        .limit(1);
      if (stub) {
        await db.update(sales).set({
          tenantId, id: s.id, tableId: s.tableId, tableName: s.tableName,
          items: s.items,
          subtotal: s.subtotal, discount: s.discount ?? 0, discountAmount: s.discountAmount ?? 0,
          total: s.total, tip: s.tip ?? 0, totalWithTip: s.totalWithTip,
          payments: s.payments, paymentMethod: s.paymentMethod, tipMethod: s.tipMethod ?? '',
          isFiado: s.isFiado ?? false, isDebtPayment: s.isDebtPayment ?? false,
          employeeId: s.employeeId ?? null, employeeName: s.employeeName ?? null,
          closedAt: s.closedAt,
          invoiceNif: s.invoiceNif ?? '', invoiceName: s.invoiceName ?? '',
          invoiceAddress: s.invoiceAddress ?? '', invoiceEmail: s.invoiceEmail ?? '',
          invoiceNumber: s.invoiceNumber ?? '', invoiceCreated: s.invoiceCreated ?? false,
          invoiceCreatedAt: s.invoiceCreatedAt ?? null,
          stripeConfirmed: true,
          ticketNumber,
        }).where(eq(sales.id, stub.id));
        return apiOk({ upgradedStub: true, ticketNumber });
      }
    }

    await db.insert(sales).values({
      tenantId, id: s.id, tableId: s.tableId, tableName: s.tableName,
      items: s.items,
      subtotal: s.subtotal, discount: s.discount ?? 0, discountAmount: s.discountAmount ?? 0,
      total: s.total, tip: s.tip ?? 0, totalWithTip: s.totalWithTip,
      payments: s.payments, paymentMethod: s.paymentMethod, tipMethod: s.tipMethod ?? '',
      isFiado: s.isFiado ?? false, isDebtPayment: s.isDebtPayment ?? false,
      employeeId: s.employeeId ?? null, employeeName: s.employeeName ?? null,
      closedAt: s.closedAt,
      invoiceNif: s.invoiceNif ?? '', invoiceName: s.invoiceName ?? '',
      invoiceAddress: s.invoiceAddress ?? '', invoiceEmail: s.invoiceEmail ?? '',
      invoiceNumber: s.invoiceNumber ?? '', invoiceCreated: s.invoiceCreated ?? false,
      invoiceCreatedAt: s.invoiceCreatedAt ?? null,
      paymentIntentId: s.paymentIntentId ?? '',
      ticketNumber,
    }).onConflictDoNothing();
    return apiOk({ ticketNumber });
  } catch (err) { return apiError(err); }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json() as { saleId: string; payments: unknown };
    const { saleId, payments } = body;
    if (!saleId || !payments) {
      return apiBadRequest('saleId and payments required');
    }
    await db.update(sales).set({ payments }).where(eq(sales.id, saleId));
    return apiOk();
  } catch (err) { return apiError(err); }
}
