import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { suppliers } from '../../../db/schema';
import { apiOk, apiError, apiBadRequest, apiNotFound, apiUnauthorized, apiServerError } from '../../../lib/infrastructure/response';
import { requireRole } from '../../../lib/rbac';
import { SupplierBody } from '@/lib/schemas/api-schemas';

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const rows = await db.select().from(suppliers)
      .where(eq(suppliers.tenantId, tenantId));
    return apiOk(rows);
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const parsed = SupplierBody.safeParse(await req.json());
    if (!parsed.success) return apiBadRequest(parsed.error.message);
    const body = parsed.data;
    if (body.action === 'save') {
      const { id, name, contact, phone, email, nif, address, paymentTerms, notes, active } = body;
      if (id) {
        await db.update(suppliers).set({
          name, contact: contact || '', phone: phone || '',
          email: email || '', nif: nif || '', address: address || '',
          paymentTerms: paymentTerms || '', notes: notes || '',
          active: active !== false,
        }).where(eq(suppliers.id, id));
      } else {
        const newId = 'sup_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        await db.insert(suppliers).values({
          id: newId, name, contact: contact || '', phone: phone || '',
          email: email || '', nif: nif || '', address: address || '',
          paymentTerms: paymentTerms || '', notes: notes || '',
          active: active !== false, createdAt: Date.now(), tenantId,
        });
        return apiOk({ ok: true, id: newId });
      }
      return apiOk();
    }
    return apiBadRequest('Unknown action');
  } catch (err) { return apiError(err); }
}
