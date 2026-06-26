import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

// GET /api/catalog → { categories: {id, name}[], products: Product[] }
export async function GET() {
  try {
    const [rows, catRows, stockRows] = await Promise.all([
      sql`SELECT id, name, category, price::float AS price, ubicacion, course, image, allergens, description, featured FROM products ORDER BY category, name`,
      sql`SELECT id, name FROM categories ORDER BY name`,
      sql`SELECT * FROM product_stock ORDER BY product_id, location`,
    ]);
    const stockByProduct = {};
    for (const s of stockRows) {
      if (!stockByProduct[s.product_id]) stockByProduct[s.product_id] = {};
      stockByProduct[s.product_id][s.location] = { stock: s.stock, lowStock: s.low_stock };
    }
    const products = rows.map(p => ({
      ...p,
      stockByLocation: stockByProduct[p.id] || {},
    }));
    return NextResponse.json({
      categories: catRows,
      products,
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

    for (const cat of categories) {
      const name = typeof cat === 'string' ? cat : cat.name;
      queries.push(sql`INSERT INTO categories (name) VALUES (${name}) ON CONFLICT (name) DO NOTHING`);
    }

    for (const p of products) {
      queries.push(sql`
        INSERT INTO products (id, name, category, price, ubicacion, course, image, allergens, description, featured)
        VALUES (${p.id}, ${p.name}, ${p.category}, ${p.price}, ${p.ubicacion ?? 'Bar'}, ${p.course ?? ''}, ${p.image ?? null}, ${p.allergens ?? []}, ${p.description ?? null}, ${p.featured ?? false})
        ON CONFLICT (id) DO UPDATE SET
          name      = EXCLUDED.name,
          category  = EXCLUDED.category,
          price     = EXCLUDED.price,
          ubicacion = EXCLUDED.ubicacion,
          course    = EXCLUDED.course,
          image     = EXCLUDED.image,
          allergens = EXCLUDED.allergens,
          description = EXCLUDED.description,
          featured    = EXCLUDED.featured
      `);
      // Stock por ubicación
      const sbl = p.stockByLocation || {};
      const locs = Object.keys(sbl);
      if (locs.length > 0) {
        const locations = locs.length > 0 ? locs : [p.ubicacion || 'Bar'];
        for (const loc of locations) {
          const entry = sbl[loc] || { stock: 0, lowStock: 5 };
          queries.push(sql`
            INSERT INTO product_stock (product_id, location, stock, low_stock)
            VALUES (${p.id}, ${loc}, ${entry.stock ?? 0}, ${entry.lowStock ?? 5})
            ON CONFLICT (product_id, location) DO UPDATE SET
              stock = EXCLUDED.stock,
              low_stock = EXCLUDED.low_stock
          `);
        }
      }
    }

    if (queries.length > 0) {
      await sql.transaction(queries);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
