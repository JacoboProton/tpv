import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { getDb } from '../../../lib/drizzle';
import { getTenantId, DEFAULT_TENANT } from '../../../lib/tenant';
import { employees, categories, products, tables, floorPlan, apiKeys } from '../../../db/schema';
import { seedCatalog, seedFloor, seedEmployees } from '../../../lib/seed';
import { hashApiKey } from '../../../lib/auth/api-keys';
import { apiOk, apiError, apiUnauthorized } from '../../../lib/infrastructure/response';

export const dynamic = 'force-dynamic';

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

// SIN requireRole: lo invoca el propio arranque (Docker / Render) con el
// CRON_SECRET como Bearer. Solo siembra datos cuando la BD está vacía (idempotente).
export async function POST(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return apiUnauthorized('CRON_SECRET no configurado');
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${expected}`) return apiUnauthorized('Unauthorized');

  try {
    const tenantId = getTenantId(req) || DEFAULT_TENANT;
    const db = getDb();
    const seeded: string[] = [];

    const empRows = await db.select({ id: employees.id }).from(employees)
      .where(eq(employees.tenantId, tenantId)).limit(1);
    if (empRows.length === 0) {
      for (const e of seedEmployees()) {
        await db.insert(employees).values({
          tenantId, id: e.id, name: e.name, pin: '',
          pinHash: bcrypt.hashSync(sha256(e.pin), 10),
          role: e.role || 'camarero',
          personalDiscountEnabled: e.personalDiscountEnabled,
          monthlyLimit: String(e.monthlyLimit ?? 0),
          monthlyUsed: String(e.monthlyUsed ?? 0),
          monthlyUsedMonth: e.monthlyUsedMonth || '',
          position: '', workType: '', workPct: '100', dni: '', notes: '',
          whatsappCode: '', whatsappLinked: false, createdAt: Date.now(),
        }).onConflictDoNothing({
          target: [employees.id, employees.tenantId],
        });
      }
      seeded.push('employees');
    }

    const prodRows = await db.select({ id: products.id }).from(products)
      .where(eq(products.tenantId, tenantId)).limit(1);
    if (prodRows.length === 0) {
      const { categories: cats, products: prods } = seedCatalog();
      for (const c of cats) {
        await db.insert(categories).values({
          id: c.id, name: c.name, sortOrder: 0, active: true, printerZone: '', showQr: true, tenantId,
        }).onConflictDoNothing({
          target: [categories.id, categories.tenantId],
        });
      }
      for (const p of prods) {
        await db.insert(products).values({
          tenantId, id: p.id, name: p.name, category: p.category, price: String(p.price),
          stock: p.stock ?? 0, lowStock: p.lowStock ?? 5, ubicacion: p.ubicacion ?? 'Bar',
          discount: String(p.discount ?? 0), course: p.course ?? '', image: p.image ?? null,
          allergens: p.allergens ?? [], description: p.description ?? null, featured: p.featured ?? false,
        }).onConflictDoNothing({
          target: [products.id, products.tenantId],
        });
      }
      seeded.push('catalog');
    }

    const tableRows = await db.select({ id: tables.id }).from(tables)
      .where(eq(tables.tenantId, tenantId)).limit(1);
    if (tableRows.length === 0) {
      const floor = seedFloor();
      for (const t of floor.tables) {
        await db.insert(tables).values({
          tenantId, id: t.id, name: t.name, status: t.status ?? 'libre', orderId: null,
          orderIds: [], reserved: null, isFiado: !!t.isFiado, type: t.type ?? 'mesa',
          posX: t.x, posY: t.y, tableWidth: t.width, tableHeight: t.height,
          tableRadius: t.radius, tableShape: t.shape ?? 'rect', rotation: t.rotation ?? 0,
          seats: t.seats ?? 4, zone: t.zone ?? '', layer: t.layer ?? 0, tableColor: t.color ?? '',
          reservedFor: '',
        }).onConflictDoNothing({
          target: [tables.id, tables.tenantId],
        });
      }
      await db.insert(floorPlan).values({
        id: 1, zones: floor.zones ?? [], background: floor.background ?? null,
      }).onConflictDoNothing({
        target: [floorPlan.id],
      });
      seeded.push('floor');
    }

    const tpvKey = process.env.TPV_API_KEY || process.env.NEXT_PUBLIC_TPV_API_KEY;
    if (tpvKey) {
      const keyHash = hashApiKey(tpvKey);
      const keyRows = await db.select({ id: apiKeys.id }).from(apiKeys)
        .where(and(eq(apiKeys.tenantId, tenantId), eq(apiKeys.keyHash, keyHash))).limit(1);
      if (keyRows.length === 0) {
        await db.insert(apiKeys).values({
          id: 'ak_demo_pos', tenantId, clientType: 'pos', label: 'POS web demo',
          keyHash, keyPrefix: tpvKey.slice(0, 12) + '…', active: true, createdAt: Date.now(),
        }).onConflictDoNothing({
          target: [apiKeys.tenantId, apiKeys.keyHash],
        });
        seeded.push('api-key');
      }
    }

    return apiOk({ ok: true, seeded, empty: seeded.length === 0 });
  } catch (err) {
    console.error('Error sembrando datos demo:', err);
    return apiError(err);
  }
}