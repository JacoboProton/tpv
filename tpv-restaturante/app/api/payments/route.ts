import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, gte, lte, like, sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { sales } from '../../../db/schema';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const method = searchParams.get('method');
    const employee = searchParams.get('employee');
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');
    const status = searchParams.get('status');

    const conditions: any[] = [eq(sales.tenantId, tenantId)];

    if (from) conditions.push(gte(sales.closedAt, Number(from)));
    if (to) conditions.push(lte(sales.closedAt, Number(to)));
    if (method) conditions.push(like(sales.paymentMethod, `%${method}%`));
    if (employee) conditions.push(like(sales.employeeName, `%${employee}%`));
    if (minAmount) conditions.push(gte(sales.totalWithTip, String(parseFloat(minAmount))));
    if (maxAmount) conditions.push(lte(sales.totalWithTip, String(parseFloat(maxAmount))));
    if (status) {
      if (status === 'disputed') conditions.push(sql`${sales.disputeStatus} != '' AND ${sales.disputeStatus} != 'dispute_won'`);
      else if (status === 'unconfirmed') conditions.push(sql`${sales.stripeConfirmed} = false AND ${sales.paymentIntentId} != ''`);
      else if (status === 'refunded') conditions.push(sql`${sales.refunds} != '[]'::jsonb AND ${sales.refunds} IS NOT NULL`);
      else if (status === 'stripe') conditions.push(sql`${sales.paymentIntentId} != ''`);
      else if (status === 'fiado') conditions.push(eq(sales.isFiado, true));
    }

    const rows = await db.select().from(sales)
      .where(and(...conditions))
      .orderBy(desc(sales.closedAt))
      .limit(500);

    const totalByMethod: Record<string, number> = {};
    let grandTotal = 0;
    let grandCount = 0;

    const mapped = rows.map(r => {
      const total = Number(r.totalWithTip || r.total || 0);
      const methodLabel = r.paymentMethod || 'desconocido';
      const date = r.closedAt ? new Date(Number(r.closedAt)).toISOString() : '';

      totalByMethod[methodLabel] = (totalByMethod[methodLabel] || 0) + total;
      grandTotal += total;
      grandCount++;

      return {
        id: r.id,
        tableName: r.tableName,
        employeeName: r.employeeName,
        paymentMethod: methodLabel,
        total,
        tip: Number(r.tip || 0),
        closedAt: Number(r.closedAt),
        date,
        hasInvoice: r.invoiceCreated || false,
        invoiceNumber: r.invoiceNumber,
        paymentIntentId: r.paymentIntentId || '',
        stripeConfirmed: !!r.stripeConfirmed,
        disputeStatus: r.disputeStatus || '',
        hasRefunds: Array.isArray(r.refunds) && r.refunds.length > 0,
        refundCount: Array.isArray(r.refunds) ? r.refunds.length : 0,
        isFiado: r.isFiado || false,
        isDebtPayment: r.isDebtPayment || false,
      };
    });

    return NextResponse.json({
      payments: mapped,
      summary: {
        total: grandTotal,
        count: grandCount,
        byMethod: totalByMethod,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
