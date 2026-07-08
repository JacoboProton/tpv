import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

function getTenantId(req) {
  return req.headers.get('x-tenant-id') || 'default';
}

// GET /api/payments?from=...&to=...&method=...&employee=...&minAmount=...&maxAmount=...
export async function GET(req) {
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

    let query = sql`SELECT * FROM sales WHERE tenant_id = ${tenantId}`;
    const conditions = [];

    if (from) conditions.push(`closed_at >= ${BigInt(from)}`);
    if (to) conditions.push(`closed_at <= ${BigInt(to)}`);
    if (method) conditions.push(`payment_method ILIKE '%' || ${method} || '%'`);
    if (employee) conditions.push(`employee_name ILIKE '%' || ${employee} || '%'`);
    if (minAmount) conditions.push(`total_with_tip >= ${parseFloat(minAmount)}`);
    if (maxAmount) conditions.push(`total_with_tip <= ${parseFloat(maxAmount)}`);
    if (status) {
      if (status === 'disputed') conditions.push(`dispute_status != '' AND dispute_status != 'dispute_won'`);
      else if (status === 'unconfirmed') conditions.push(`stripe_confirmed = false AND payment_intent_id != ''`);
      else if (status === 'refunded') conditions.push(`refunds != '[]'::jsonb AND refunds IS NOT NULL`);
      else if (status === 'stripe') conditions.push(`payment_intent_id != ''`);
      else if (status === 'fiado') conditions.push(`is_fiado = true`);
    }

    if (conditions.length > 0) {
      query = sql`${query} AND ${sql.unsafe(conditions.join(' AND '))}`;
    }
    query = sql`${query} ORDER BY closed_at DESC LIMIT 500`;

    const rows = await query;

    // Flat payment log: one entry per sale with extracted data
    const totalByMethod = {};
    let grandTotal = 0;
    let grandCount = 0;

    const mapped = rows.map(r => {
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}