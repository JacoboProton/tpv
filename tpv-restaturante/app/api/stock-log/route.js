import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';

// GET /api/stock-log → devuelve entradas del stock log
export async function GET(req) {
  try {
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500);
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0'), 0);

    const [rows, countResult] = await Promise.all([
      sql`
        SELECT id, product_id AS "productId", product_name AS "productName",
               old_stock AS "oldStock", new_stock AS "newStock",
               change_amount AS "changeAmount", reason,
               employee_name AS "employeeName", created_at AS "createdAt"
        FROM stock_log
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      sql`SELECT COUNT(*)::int AS total FROM stock_log WHERE tenant_id = ${tenantId}`,
    ]);

    return NextResponse.json({
      rows,
      total: countResult[0].total,
      limit,
      offset,
      hasMore: offset + limit < countResult[0].total,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/stock-log → crea una entrada
export async function POST(req) {
  try {
    const tenantId = getTenantId(req);
    const { productId, productName, oldStock, newStock, reason, employeeName } = await req.json();

    const changeAmount = newStock - oldStock;

    const [record] = await sql`
      INSERT INTO stock_log (product_id, product_name, old_stock, new_stock, change_amount, reason, employee_name, created_at, tenant_id)
      VALUES (${productId}, ${productName}, ${oldStock}, ${newStock}, ${changeAmount}, ${reason}, ${employeeName}, ${Date.now()}, ${tenantId})
      RETURNING id, product_id AS "productId", product_name AS "productName",
                old_stock AS "oldStock", new_stock AS "newStock",
                change_amount AS "changeAmount", reason,
                employee_name AS "employeeName", created_at AS "createdAt"
    `;

    return NextResponse.json(record);
  } catch (err) {
    console.error('Error creando stock log:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
