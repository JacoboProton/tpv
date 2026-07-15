import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const year = searchParams.get('year');
    const ticketNumber = searchParams.get('ticketNumber');

    const baseClauses: any[] = [];
    if (tenantId !== 'all') baseClauses.push(sql`tenant_id = ${tenantId}`);
    let base = baseClauses.length > 0
      ? sql`SELECT * FROM sales WHERE ${baseClauses.reduce((a: any, c: any) => sql`${a} AND ${c}`)}`
      : sql`SELECT * FROM sales`;
    const conds: any[] = [];

    if (ticketNumber) {
      conds.push(sql`ticket_number = ${parseInt(ticketNumber, 10)}`);
    } else {
      if (year) {
        const y = parseInt(year, 10);
        const start = new Date(y, 0, 1).getTime();
        const end = new Date(y + 1, 0, 1).getTime();
        conds.push(sql`closed_at >= ${start}`);
        conds.push(sql`closed_at < ${end}`);
      } else {
        if (from) conds.push(sql`closed_at >= ${BigInt(from)}`);
        if (to) conds.push(sql`closed_at <= ${BigInt(to)}`);
      }
    }

    if (conds.length > 0) base = sql`${base} AND ${conds.reduce((a: any, c: any) => sql`${a} AND ${c}`)}`;
    base = sql`${base} ORDER BY closed_at DESC`;
    const rows: any[] = await base;

    const saleIds = rows.map((r: any) => r.id);
    let verifactuMap: Record<string, { estado: string; numSerie: string }> = {};
    if (saleIds.length > 0) {
      const verifactuRows = await sql`
        SELECT sale_id, estado, num_serie FROM verifactu_registros
        WHERE sale_id = ANY(${saleIds})
      `;
      for (const v of verifactuRows as any[]) {
        verifactuMap[v.sale_id] = { estado: v.estado, numSerie: v.num_serie };
      }
    }

    const mapped = rows.map((r: any) => ({
      id: r.id, tableId: r.table_id, tableName: r.table_name,
      items: r.items, subtotal: Number(r.subtotal),
      discount: Number(r.discount), discountAmount: Number(r.discount_amount),
      total: Number(r.total), tip: Number(r.tip), totalWithTip: Number(r.total_with_tip),
      payments: r.payments, paymentMethod: r.payment_method, tipMethod: r.tip_method,
      isFiado: r.is_fiado, isDebtPayment: r.is_debt_payment,
      employeeId: r.employee_id, employeeName: r.employee_name,
      closedAt: Number(r.closed_at),
      invoiceNif: r.invoice_nif, invoiceName: r.invoice_name,
      invoiceAddress: r.invoice_address, invoiceEmail: r.invoice_email,
      invoiceNumber: r.invoice_number, invoiceCreated: r.invoice_created,
      invoiceCreatedAt: r.invoice_created_at ? Number(r.invoice_created_at) : null,
      refunds: r.refunds || [],
      paymentIntentId: r.payment_intent_id || '',
      stripeConfirmed: !!r.stripe_confirmed,
      disputeStatus: r.dispute_status || '',
      disputeData: r.dispute_data || {},
      verifactuStatus: verifactuMap[r.id]?.estado || '',
      verifactuNumSerie: verifactuMap[r.id]?.numSerie || '',
      ticketNumber: r.ticket_number,
    }));
    return NextResponse.json(mapped);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const s = await req.json() as any;
    const tenantId = getTenantId(req);

    const year = new Date(Number(s.closedAt || Date.now())).getFullYear();
    const result = await sql`
      INSERT INTO ticket_counters (tenant_id, year, counter)
      VALUES (${tenantId}, ${year}, 1)
      ON CONFLICT (tenant_id, year) DO UPDATE SET counter = ticket_counters.counter + 1
      RETURNING counter
    `;
    const ticketNumber = (result as any[])[0].counter;

    if (s.paymentIntentId) {
      const stub = await sql`
        SELECT id FROM sales WHERE payment_intent_id = ${s.paymentIntentId} AND id LIKE 'stub_%' LIMIT 1
      `;
      if ((stub as any[]).length > 0) {
        await sql`
          UPDATE sales SET
            tenant_id = ${tenantId}, id = ${s.id}, table_id = ${s.tableId}, table_name = ${s.tableName},
            items = ${JSON.stringify(s.items)},
            subtotal = ${s.subtotal}, discount = ${s.discount ?? 0}, discount_amount = ${s.discountAmount ?? 0},
            total = ${s.total}, tip = ${s.tip ?? 0}, total_with_tip = ${s.totalWithTip},
            payments = ${JSON.stringify(s.payments)}, payment_method = ${s.paymentMethod}, tip_method = ${s.tipMethod ?? ''},
            is_fiado = ${s.isFiado ?? false}, is_debt_payment = ${s.isDebtPayment ?? false},
            employee_id = ${s.employeeId ?? null}, employee_name = ${s.employeeName ?? null},
            closed_at = ${s.closedAt},
            invoice_nif = ${s.invoiceNif ?? ''}, invoice_name = ${s.invoiceName ?? ''},
            invoice_address = ${s.invoiceAddress ?? ''}, invoice_email = ${s.invoiceEmail ?? ''},
            invoice_number = ${s.invoiceNumber ?? ''}, invoice_created = ${s.invoiceCreated ?? false},
            invoice_created_at = ${s.invoiceCreatedAt ?? null},
            stripe_confirmed = true,
            ticket_number = ${ticketNumber}
          WHERE id = ${(stub as any[])[0].id}
        `;
        return NextResponse.json({ ok: true, upgradedStub: true, ticketNumber });
      }
    }

    await sql`
      INSERT INTO sales (
        tenant_id, id, table_id, table_name, items, subtotal, discount, discount_amount,
        total, tip, total_with_tip, payments, payment_method, tip_method,
        is_fiado, is_debt_payment, employee_id, employee_name, closed_at,
        invoice_nif, invoice_name, invoice_address, invoice_email,
        invoice_number, invoice_created, invoice_created_at,
        payment_intent_id, ticket_number
      ) VALUES (
        ${tenantId}, ${s.id}, ${s.tableId}, ${s.tableName}, ${JSON.stringify(s.items)},
        ${s.subtotal}, ${s.discount ?? 0}, ${s.discountAmount ?? 0},
        ${s.total}, ${s.tip ?? 0}, ${s.totalWithTip},
        ${JSON.stringify(s.payments)}, ${s.paymentMethod}, ${s.tipMethod ?? ''},
        ${s.isFiado ?? false}, ${s.isDebtPayment ?? false},
        ${s.employeeId ?? null}, ${s.employeeName ?? null}, ${s.closedAt},
        ${s.invoiceNif ?? ''}, ${s.invoiceName ?? ''}, ${s.invoiceAddress ?? ''}, ${s.invoiceEmail ?? ''},
        ${s.invoiceNumber ?? ''}, ${s.invoiceCreated === true || s.invoiceCreated === 'true'}, ${s.invoiceCreatedAt ?? null},
        ${s.paymentIntentId ?? ''}, ${ticketNumber}
      )
      ON CONFLICT (id) DO NOTHING
    `;
    return NextResponse.json({ ok: true, ticketNumber });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as { saleId: string; payments: unknown };
    const { saleId, payments } = body;
    if (!saleId || !payments) {
      return NextResponse.json({ error: 'saleId and payments required' }, { status: 400 });
    }
    await sql`UPDATE sales SET payments = ${JSON.stringify(payments)} WHERE id = ${saleId}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
