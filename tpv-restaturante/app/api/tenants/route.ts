import { NextRequest } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { tenants } from '../../../db/schema';
import { apiOk, apiError, apiBadRequest, apiNotFound, apiUnauthorized, apiServerError } from '../../../lib/infrastructure/response';
import { requireRole } from '../../../lib/rbac';

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const db = getDb();
    const rows = await db.select().from(tenants).orderBy(tenants.name);
    return apiOk(rows.map(r => ({
      id: r.id, name: r.name, slug: r.slug,
      logoUrl: r.logoUrl, address: r.address, phone: r.phone,
      email: r.email, nif: r.nif, active: r.active,
      config: r.config, createdAt: r.createdAt,
    })));
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);

  try {
    const body = await req.json() as any;
    const { name, slug } = body;
    if (!name || !slug) return apiBadRequest('name and slug required');
    const db = getDb();

    const id = 'tnt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await db.insert(tenants).values({
      id, name, slug,
      address: body.address || '', phone: body.phone || '',
      email: body.email || '', nif: body.nif || '',
      active: true, config: {}, createdAt: Date.now(),
    });
    return apiOk({ id, ok: true });
  } catch (err) { return apiError(err); }
}

export async function PUT(req: NextRequest) {
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);

  try {
    const body = await req.json() as any;
    const { id, name, address, phone, email, nif, active } = body;
    if (!id) return apiBadRequest('id required');
    const db = getDb();

    await db.update(tenants).set({
      name: sql`COALESCE(${name}, name)`,
      address: sql`COALESCE(${address}, address)`,
      phone: sql`COALESCE(${phone}, phone)`,
      email: sql`COALESCE(${email}, email)`,
      nif: sql`COALESCE(${nif}, nif)`,
      active: sql`COALESCE(${active}, active)`,
    }).where(eq(tenants.id, id));
    return apiOk();
  } catch (err) { return apiError(err); }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);

  try {
    const { id } = await req.json() as any;
    if (!id || id === 'default') return apiBadRequest('cannot delete default tenant');
    const db = getDb();
    await db.delete(tenants).where(eq(tenants.id, id));
    return apiOk();
  } catch (err) { return apiError(err); }
}
