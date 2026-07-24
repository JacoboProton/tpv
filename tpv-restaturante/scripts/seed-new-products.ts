import { eq } from 'drizzle-orm'
import { getDb } from '../lib/drizzle'
import { products } from '../db/schema'
import { seedCatalog } from '../components/constants'

async function main() {
  const db = getDb()
  const tenantId = 'default'

  const seed = seedCatalog()
  const existing = await db.select({ id: products.id })
    .from(products)
    .where(eq(products.tenantId, tenantId))
  const existingIds = new Set(existing.map((r: any) => r.id))

  const newProds = seed.products.filter(p => !existingIds.has(p.id))

  if (newProds.length === 0) {
    console.log('No hay productos nuevos que insertar.')
    return
  }

  console.log(`Insertando ${newProds.length} productos nuevos...`)

  for (const p of newProds) {
    await db.insert(products).values({
      tenantId,
      id: p.id,
      name: p.name,
      category: p.category,
      price: String(p.price),
      stock: p.stock ?? 0,
      lowStock: p.lowStock ?? 5,
      ubicacion: p.ubicacion ?? 'Bar',
      discount: String(p.discount ?? 0),
      course: p.course ?? '',
      image: p.image ?? null,
      allergens: p.allergens ?? [],
      description: p.description ?? null,
      featured: p.featured ?? false,
    }).onConflictDoNothing({
      target: [products.id, products.tenantId],
    })
    console.log(`  ✓ ${p.id.padEnd(5)} ${p.name}`)
  }

  console.log(`¡Hecho! ${newProds.length} productos insertados.`)
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
