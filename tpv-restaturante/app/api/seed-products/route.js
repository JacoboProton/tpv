import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

const NEW_PRODUCTS = [
  { id: 'p17', name: 'Café solo',         category: 'Bebidas',    price: 1.8,  stock: 50, lowStock: 10, ubicacion: 'Bar',     discount: 0, course: '', allergens: [],      image: '/uploads/cafe-solo.svg' },
  { id: 'p18', name: 'Café con leche',    category: 'Bebidas',    price: 2.0,  stock: 50, lowStock: 10, ubicacion: 'Bar',     discount: 0, course: '', allergens: ['lacteos'], image: '/uploads/cafe-con-leche.svg' },
  { id: 'p19', name: 'Cerveza botellín',  category: 'Bebidas',    price: 2.5,  stock: 60, lowStock: 15, ubicacion: 'Bar',     discount: 0, course: '', allergens: ['gluten'],  image: '/uploads/cerveza-botellin.svg' },
  { id: 'p20', name: 'Zumo de naranja',   category: 'Bebidas',    price: 3.0,  stock: 30, lowStock: 8,  ubicacion: 'Bar',     discount: 0, course: '', allergens: [],      image: '/uploads/zumo-naranja.svg' },
  { id: 'p21', name: 'Tortilla de patatas', category: 'Tapas',    price: 5.0,  stock: 20, lowStock: 5,  ubicacion: 'Cocina',  discount: 0, course: 'Entrantes', allergens: ['huevos'], image: '/uploads/tortilla-patatas.svg' },
  { id: 'p22', name: 'Ensaladilla rusa',  category: 'Tapas',      price: 5.5,  stock: 18, lowStock: 5,  ubicacion: 'Cocina',  discount: 0, course: 'Entrantes', allergens: ['huevos', 'lacteos'], image: '/uploads/ensaladilla-rusa.svg' },
  { id: 'p23', name: 'Gambas al ajillo',  category: 'Tapas',      price: 9.0,  stock: 15, lowStock: 4,  ubicacion: 'Cocina',  discount: 0, course: 'Entrantes', allergens: ['crustaceos'], image: '/uploads/gambas-ajillo.svg' },
  { id: 'p24', name: 'Pulpo a la gallega', category: 'Tapas',     price: 11.0, stock: 12, lowStock: 3,  ubicacion: 'Cocina',  discount: 0, course: 'Entrantes', allergens: ['moluscos'], image: '/uploads/pulpo-gallega.svg' },
  { id: 'p25', name: 'Pollo asado',       category: 'Principales', price: 10.0, stock: 15, lowStock: 4, ubicacion: 'Cocina',  discount: 0, course: 'Principales', allergens: [],     image: '/uploads/pollo-asado.svg' },
  { id: 'p26', name: 'Merluza a la plancha', category: 'Principales', price: 13.0, stock: 10, lowStock: 3, ubicacion: 'Cocina', discount: 0, course: 'Principales', allergens: ['pescado'], image: '/uploads/merluza-plancha.svg' },
  { id: 'p27', name: 'Arroz negro',       category: 'Principales', price: 12.5, stock: 10, lowStock: 3, ubicacion: 'Cocina',  discount: 0, course: 'Principales', allergens: ['moluscos', 'crustaceos'], image: '/uploads/arroz-negro.svg' },
  { id: 'p28', name: 'Lasaña',            category: 'Principales', price: 10.5, stock: 12, lowStock: 4, ubicacion: 'Cocina',  discount: 0, course: 'Principales', allergens: ['gluten', 'lacteos', 'huevos'], image: '/uploads/lasana.svg' },
  { id: 'p29', name: 'Crema catalana',    category: 'Postres',    price: 4.0,  stock: 14, lowStock: 4,  ubicacion: 'Almacén', discount: 0, course: 'Postres', allergens: ['huevos', 'lacteos'], image: '/uploads/crema-catalana.svg' },
  { id: 'p30', name: 'Helado vainilla',   category: 'Postres',    price: 3.5,  stock: 18, lowStock: 5,  ubicacion: 'Almacén', discount: 0, course: 'Postres', allergens: ['lacteos'],   image: '/uploads/helado-vainilla.svg' },
];

export async function POST() {
  try {
    let added = 0;
    for (const p of NEW_PRODUCTS) {
      const existing = await sql`SELECT id FROM products WHERE id = ${p.id}`;
      if (existing.length === 0) {
        await sql`
          INSERT INTO products (id, name, category, price, stock, low_stock, ubicacion, discount, course, allergens, image)
          VALUES (${p.id}, ${p.name}, ${p.category}, ${p.price}, ${p.stock}, ${p.lowStock}, ${p.ubicacion}, ${p.discount}, ${p.course}, ${p.allergens}, ${p.image})
        `;
        added++;
      }
    }
    return NextResponse.json({ ok: true, added });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
