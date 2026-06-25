import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import * as XLSX from 'xlsx';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get('year')) || new Date().getFullYear();
    const from = `${year}-01-01`;
    const to = `${year}-12-31`;

    const sales = await sql`
      SELECT id, table_name, items, total_with_tip, payment_method, closed_at, employee_name, discount, tip
      FROM sales WHERE closed_at >= ${new Date(from).getTime()} AND closed_at < ${new Date(to + 'T23:59:59').getTime()}
      ORDER BY closed_at
    `;

    const rows = sales.map(s => {
      const items = typeof s.items === 'string' ? JSON.parse(s.items) : (s.items || []);
      const date = new Date(s.closed_at).toLocaleDateString('es-ES');
      return {
        Fecha: date,
        Mesa: s.table_name || '',
        'Tipo de pago': s.payment_method || '',
        Empleado: s.employee_name || '',
        'Nº artículos': items.reduce((sum, i) => sum + (i.qty || 1), 0),
        Total: parseFloat(s.total_with_tip) || 0,
        Descuento: parseFloat(s.discount) || 0,
        Propina: parseFloat(s.tip) || 0,
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
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
