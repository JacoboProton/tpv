import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { suppliers } from '../../../db/schema';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const rows = await db.select().from(suppliers)
      .where(eq(suppliers.tenantId, tenantId));
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const body = await req.json() as any;
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
        return NextResponse.json({ ok: true, id: newId });
      }
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
