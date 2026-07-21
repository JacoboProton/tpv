import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../../../../lib/drizzle';
import { getTenantId } from '../../../../lib/tenant';
import { products } from '../../../../db/schema';
import { apiOk, apiError, apiBadRequest, apiNotFound, apiUnauthorized } from '../../../../lib/infrastructure/response';

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const db = getDb();
    const result = await db.select({
      id: products.id, name: products.name, category: products.category,
      price: products.price, active: products.active, showTpv: products.showTpv,
      showQr: products.showQr, agotado: products.agotado, description: products.description,
    }).from(products)
      .where(eq(products.tenantId, tenantId))
      .orderBy(products.category, products.name);

    const header = 'id,nombre,precio,categoria,activo,tpv,qr,agotado,descripcion';
    const rows = result.map(p =>
      [
        p.id,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        Number(p.price).toFixed(2),
        `"${(p.category || '').replace(/"/g, '""')}"`,
        p.active ? '1' : '0',
        p.showTpv ? '1' : '0',
        p.showQr ? '1' : '0',
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
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const db = getDb();
    const text = await req.text();
    const lines = text.split('\n').filter(Boolean);
    if (lines.length < 2) return apiOk({ ok: true, imported: 0 });

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

      await db.insert(products).values({
        tenantId, id, name, category, price: String(price),
        active, showTpv, showQr, agotado,
      }).onConflictDoUpdate({
        target: [products.tenantId, products.id],
        set: {
          name: sql`EXCLUDED.name`, category: sql`EXCLUDED.category`,
          price: sql`EXCLUDED.price`, active: sql`EXCLUDED.active`,
          showTpv: sql`EXCLUDED.show_tpv`, showQr: sql`EXCLUDED.show_qr`,
          agotado: sql`EXCLUDED.agotado`,
        },
      });
      imported++;
    }
    return apiOk({ ok: true, imported });
  } catch (err) { return apiError(err); }
}
