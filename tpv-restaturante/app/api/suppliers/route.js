import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export async function GET() {
  try {
    const rows = await sql`SELECT * FROM suppliers ORDER BY name`;
    return NextResponse.json(rows.map(r => ({
      id: r.id, name: r.name, contact: r.contact, phone: r.phone,
      email: r.email, nif: r.nif, address: r.address, paymentTerms: r.payment_terms || '',
      notes: r.notes, active: r.active, createdAt: Number(r.created_at),
    })));
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    if (body.action === 'save') {
      const { id, name, contact, phone, email, nif, address, paymentTerms, notes, active } = body;
      if (id) {
        await sql`UPDATE suppliers SET name=${name}, contact=${contact || ''}, phone=${phone || ''},
          email=${email || ''}, nif=${nif || ''}, address=${address || ''},
          payment_terms=${paymentTerms || ''}, notes=${notes || ''},
          active=${active !== false} WHERE id=${id}`;
      } else {
        const newId = 'sup_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        await sql`INSERT INTO suppliers (id, name, contact, phone, email, nif, address, payment_terms, notes, active, created_at)
          VALUES (${newId}, ${name}, ${contact || ''}, ${phone || ''}, ${email || ''}, ${nif || ''},
          ${address || ''}, ${paymentTerms || ''}, ${notes || ''}, ${active !== false}, ${Date.now()})`;
        return NextResponse.json({ ok: true, id: newId });
      }
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
