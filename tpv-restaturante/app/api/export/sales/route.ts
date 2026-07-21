import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql, gte, lt } from 'drizzle-orm';
import { getDb } from '../../../../lib/drizzle';
import { getTenantId } from '../../../../lib/tenant';
import { sales } from '../../../../db/schema';
import * as XLSX from 'xlsx';
import { apiOk, apiError, apiBadRequest, apiNotFound, apiUnauthorized } from '../../../../lib/infrastructure/response';

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const from = `${year}-01-01`;
    const to = `${year}-12-31`;
    const db = getDb();

    const result = await db.select({
      id: sales.id, tableName: sales.tableName, items: sales.items,
      totalWithTip: sales.totalWithTip, paymentMethod: sales.paymentMethod,
      closedAt: sales.closedAt, employeeName: sales.employeeName,
      discount: sales.discount, tip: sales.tip,
    }).from(sales)
      .where(and(
        eq(sales.tenantId, tenantId),
        gte(sales.closedAt, new Date(from).getTime()),
        lt(sales.closedAt, new Date(to + 'T23:59:59').getTime()),
      ))
      .orderBy(sales.closedAt);

    const rows = result.map(s => {
      const itemsArr = typeof s.items === 'string' ? JSON.parse(s.items) : (s.items || []);
      const date = new Date(s.closedAt).toLocaleDateString('es-ES');
      return {
        Fecha: date,
        Mesa: s.tableName || '',
        'Tipo de pago': s.paymentMethod || '',
        Empleado: s.employeeName || '',
        'Nº artículos': (itemsArr as any[]).reduce((sum: number, i: any) => sum + (i.qty || 1), 0),
        Total: Number(s.totalWithTip) || 0,
        Descuento: Number(s.discount) || 0,
        Propina: Number(s.tip) || 0,
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=ventas_${year}.xlsx`,
      },
    });
  } catch (err) { return apiError(err); }
}
