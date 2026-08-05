import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql, gte, lt } from 'drizzle-orm';
import { getDb } from '../../../../lib/drizzle';
import { getTenantId } from '../../../../lib/tenant';
import { sales } from '../../../../db/schema';
import ExcelJS from 'exceljs';
import { apiOk, apiError, apiBadRequest, apiNotFound, apiUnauthorized } from '../../../../lib/infrastructure/response';
import { requireRole } from '../../../../lib/rbac';

type Row = Record<string, unknown>;

function num(v: unknown, fallback = 0): number {
  return Number(v) || fallback;
}

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
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

    const rows = result.map((s) => {
      const itemsArr = typeof s.items === 'string' ? JSON.parse(s.items) : (s.items || []);
      const date = new Date(s.closedAt).toLocaleDateString('es-ES');
      return {
        Fecha: date,
        Mesa: s.tableName || '',
        'Tipo de pago': s.paymentMethod || '',
        Empleado: s.employeeName || '',
        'Nº artículos': (itemsArr as Array<Record<string, unknown>>).reduce((sum: number, i: Row) => sum + num(i.qty, 1), 0),
        Total: Number(s.totalWithTip) || 0,
        Descuento: Number(s.discount) || 0,
        Propina: Number(s.tip) || 0,
      };
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Ventas');
    ws.columns = [
      { header: 'Fecha', key: 'Fecha', width: 14 },
      { header: 'Mesa', key: 'Mesa', width: 10 },
      { header: 'Tipo de pago', key: 'Tipo de pago', width: 14 },
      { header: 'Empleado', key: 'Empleado', width: 18 },
      { header: 'Nº artículos', key: 'Nº artículos', width: 12 },
      { header: 'Total', key: 'Total', width: 12 },
      { header: 'Descuento', key: 'Descuento', width: 12 },
      { header: 'Propina', key: 'Propina', width: 12 },
    ];
    ws.addRows(rows);
    ws.getRow(1).font = { bold: true };
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columns.length } };

    const buf = await wb.xlsx.writeBuffer();

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=ventas_${year}.xlsx`,
      },
    });
  } catch (err) { return apiError(err); }
}
