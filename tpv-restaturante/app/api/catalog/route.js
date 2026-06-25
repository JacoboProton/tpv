import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

// GET /api/catalog → { categories: string[], products: Product[] }
export async function GET() {
  try {
    const [rows, catRows] = await Promise.all([
      sql`SELECT id, name, category, price::float AS price, stock, low_stock AS "lowStock", ubicacion, course, image, allergens FROM products ORDER BY category, name`,
      sql`SELECT name FROM categories ORDER BY name`,
    ]);
    return NextResponse.json({
      categories: catRows.map(r => r.name),
      products: rows,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/catalog → body: { categories, products }  (reemplaza todo)
export async function PUT(req) {
  try {
    const { categories, products } = await req.json();

    const queries = [];

    for (const name of categories) {
      queries.push(sql`INSERT INTO categories (name) VALUES (${name}) ON CONFLICT (name) DO NOTHING`);
    }

    for (const p of products) {
      queries.push(sql`
        INSERT INTO products (id, name, category, price, stock, low_stock, ubicacion, course, image, allergens)
        VALUES (${p.id}, ${p.name}, ${p.category}, ${p.price}, ${p.stock}, ${p.lowStock ?? p.low_stock ?? 5}, ${p.ubicacion ?? 'Bar'}, ${p.course ?? ''}, ${p.image ?? null}, ${p.allergens ?? []})
        ON CONFLICT (id) DO UPDATE SET
          name      = EXCLUDED.name,
          category  = EXCLUDED.category,
          price     = EXCLUDED.price,
          stock     = EXCLUDED.stock,
          low_stock = EXCLUDED.low_stock,
          ubicacion = EXCLUDED.ubicacion,
          course    = EXCLUDED.course,
          image     = EXCLUDED.image,
          allergens = EXCLUDED.allergens
      `);
    }

    if (queries.length > 0) {
      await sql.transaction(queries);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
