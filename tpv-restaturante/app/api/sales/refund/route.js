import { sql } from '../../../../lib/db';

export async function PUT(req) {
  try {
    const { saleId, refund } = await req.json();
    if (!saleId || !refund) {
      return Response.json({ error: 'saleId and refund required' }, { status: 400 });
    }
    const existing = await sql`SELECT refunds FROM sales WHERE id = ${saleId}`;
    if (existing.length === 0) {
      return Response.json({ error: 'Sale not found' }, { status: 404 });
    }
    const current = existing[0].refunds || [];
    const updated = [...current, refund];
    await sql`UPDATE sales SET refunds = ${JSON.stringify(updated)} WHERE id = ${saleId}`;
    return Response.json({ ok: true, refunds: updated });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
