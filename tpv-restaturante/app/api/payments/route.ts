import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const method = searchParams.get('method');
    const employee = searchParams.get('employee');
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');
    const status = searchParams.get('status');

    let base = sql`SELECT * FROM sales WHERE tenant_id = ${tenantId}`;
    const conds: any[] = [];

    if (from) conds.push(sql`closed_at >= ${BigInt(from)}`);
    if (to) conds.push(sql`closed_at <= ${BigInt(to)}`);
    if (method) conds.push(sql`payment_method ILIKE ${'%' + method + '%'}`);
    if (employee) conds.push(sql`employee_name ILIKE ${'%' + employee + '%'}`);
    if (minAmount) conds.push(sql`total_with_tip >= ${parseFloat(minAmount)}`);
    if (maxAmount) conds.push(sql`total_with_tip <= ${parseFloat(maxAmount)}`);
    if (status) {
      if (status === 'disputed') conds.push(sql`dispute_status != '' AND dispute_status != 'dispute_won'`);
      else if (status === 'unconfirmed') conds.push(sql`stripe_confirmed = false AND payment_intent_id != ''`);
      else if (status === 'refunded') conds.push(sql`refunds != '[]'::jsonb AND refunds IS NOT NULL`);
      else if (status === 'stripe') conds.push(sql`payment_intent_id != ''`);
      else if (status === 'fiado') conds.push(sql`is_fiado = true`);
    }

    if (conds.length > 0) base = sql`${base} AND ${conds.reduce((a: any, c: any) => sql`${a} AND ${c}`)}`;
    base = sql`${base} ORDER BY closed_at DESC LIMIT 500`;
    const rows = await base;

    const totalByMethod: Record<string, number> = {};
    let grandTotal = 0;
    let grandCount = 0;

    const mapped = (rows as any[]).map(r => {
      const total = Number(r.total_with_tip || r.total || 0);
      const methodLabel = r.payment_method || 'desconocido';
      const date = r.closed_at ? new Date(Number(r.closed_at)).toISOString() : '';

      totalByMethod[methodLabel] = (totalByMethod[methodLabel] || 0) + total;
      grandTotal += total;
      grandCount++;

      return {
        id: r.id,
        tableName: r.table_name,
        employeeName: r.employee_name,
        paymentMethod: methodLabel,
        total,
        tip: Number(r.tip || 0),
        closedAt: Number(r.closed_at),
        date,
        hasInvoice: r.invoice_created || false,
        invoiceNumber: r.invoice_number,
        paymentIntentId: r.payment_intent_id || '',
        stripeConfirmed: !!r.stripe_confirmed,
        disputeStatus: r.dispute_status || '',
        hasRefunds: (r.refunds || []).length > 0,
        refundCount: (r.refunds || []).length,
        isFiado: r.is_fiado || false,
        isDebtPayment: r.is_debt_payment || false,
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
