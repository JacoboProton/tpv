import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { getTenantId } from '../../../../lib/tenant';

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const products = await sql`
      SELECT id, name, category, price::float AS price, active, show_tpv, show_qr, agotado, description
      FROM products WHERE tenant_id = ${tenantId} ORDER BY category, name
    `;
    const header = 'id,nombre,precio,categoria,activo,tpv,qr,agotado,descripcion';
    const rows = products.map(p =>
      [
        p.id,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        p.price.toFixed(2),
        `"${(p.category || '').replace(/"/g, '""')}"`,
        p.active ? '1' : '0',
        p.show_tpv ? '1' : '0',
        p.show_qr ? '1' : '0',
        p.agotado ? '1' : '0',
        `"${(p.description || '').replace(/"/g, '""')}"`,
      ].join(',')
    ).join('\n');

    return new NextResponse('\uFEFF' + header + '\n' + rows, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="carta.csv"',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const text = await req.text();
    const lines = text.split('\n').filter(Boolean);
    if (lines.length < 2) return NextResponse.json({ ok: true, imported: 0 });

    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const idIdx = header.indexOf('id');
    const nameIdx = header.indexOf('nombre');
    const priceIdx = header.indexOf('precio');
    const catIdx = header.indexOf('categoria');
    const activeIdx = header.indexOf('activo');
    const tpvIdx = header.indexOf('tpv');
    const qrIdx = header.indexOf('qr');
    const agotadoIdx = header.indexOf('agotado');

    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      const id = cols[idIdx];
      const name = cols[nameIdx];
      const price = parseFloat(cols[priceIdx]);
      const category = cols[catIdx];
      if (!id || !name || isNaN(price)) continue;

      const active = activeIdx >= 0 ? cols[activeIdx] === '1' : true;
      const showTpv = tpvIdx >= 0 ? cols[tpvIdx] === '1' : true;
      const showQr = qrIdx >= 0 ? cols[qrIdx] === '1' : true;
      const agotado = agotadoIdx >= 0 ? cols[agotadoIdx] === '1' : false;

      await sql`
        INSERT INTO products (tenant_id, id, name, category, price, active, show_tpv, show_qr, agotado)
        VALUES (${tenantId}, ${id}, ${name}, ${category}, ${price}, ${active}, ${showTpv}, ${showQr}, ${agotado})
        ON CONFLICT (tenant_id, id) DO UPDATE SET
          name = EXCLUDED.name, category = EXCLUDED.category,
          price = EXCLUDED.price, active = EXCLUDED.active,
          show_tpv = EXCLUDED.show_tpv, show_qr = EXCLUDED.show_qr,
          agotado = EXCLUDED.agotado
      `;
      imported++;
    }
    return NextResponse.json({ ok: true, imported });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
