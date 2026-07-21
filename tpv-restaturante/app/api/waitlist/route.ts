import { NextRequest } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { waitlist, settings } from '../../../db/schema';
import { apiOk, apiError, apiBadRequest, apiNotFound, apiUnauthorized, apiServerError } from '../../../lib/infrastructure/response';

function makeId() { return 'wl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

async function getSettings(tenantId: string) {
  const db = getDb();
  const rows = await db.select().from(settings)
    .where(sql`${settings.key} LIKE 'waitlist%' AND ${eq(settings.tenantId, tenantId)}`);
  const s: Record<string, any> = {};
  for (const r of rows) s[r.key] = r.value;
  return s;
}

async function sendTwilioSms(accountSid: string, authToken: string, from: string, to: string, body: string) {
  const cred = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const params = new URLSearchParams({ To: to, From: from, Body: body });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${cred}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('[Twilio] Error:', res.status, text);
  }
}

async function sendNotifications(entry: any, s: Record<string, any>, tenantId: string) {
  const sid = s.waitlistTwilioSid;
  const token = s.waitlistTwilioToken;
  const twilioPhone = s.waitlistTwilioPhone;
  const twilioWhatsApp = s.waitlistTwilioWhatsApp;
  if (!sid || !token) return;
  if (!entry.phone) return;

  const db = getDb();
  const name = entry.name || 'Cliente';
  const [row] = await db.select().from(settings)
    .where(sql`${eq(settings.key, 'restaurantName')} AND ${eq(settings.tenantId, tenantId)}`).limit(1);
  const restaurant = row?.value || 'Restaurante';
  const msg = `¡${name}, su mesa en ${restaurant} está lista! Por favor, acérquese al mostrador.`;

  if (s.waitlistSmsEnabled === 'true' && twilioPhone) {
    sendTwilioSms(sid, token, twilioPhone, entry.phone, msg).catch(() => {});
  }
  if (s.waitlistWhatsAppEnabled === 'true' && twilioWhatsApp) {
    sendTwilioSms(sid, token, `whatsapp:${twilioWhatsApp}`, `whatsapp:${entry.phone}`, msg).catch(() => {});
  }
}

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const rows = await db.select().from(waitlist)
      .where(eq(waitlist.tenantId, tenantId))
      .orderBy(waitlist.position, waitlist.createdAt);
    return apiOk(rows.map(r => ({
      id: r.id, name: r.name, phone: r.phone, pax: r.pax,
      status: r.status, calledCount: r.calledCount, calledAt: r.calledAt,
      seatedAt: r.seatedAt, tableId: r.tableId,
      position: r.position, notes: r.notes, source: r.source,
      createdAt: r.createdAt, updatedAt: r.updatedAt,
    })));
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const body = await req.json() as any;
    const { action } = body;

    if (action === 'join' || action === undefined) {
      const { name, phone, pax, notes, source } = body;
      const [maxPos] = await db.execute(sql`
        SELECT COALESCE(MAX(position), 0) + 1 AS pos FROM waitlist WHERE status = 'waiting' AND tenant_id = ${tenantId}
      `).then(r => r.rows as any[]);
      const pos = maxPos.pos;
      const id = makeId();
      if (action === 'join') {
        await db.insert(waitlist).values({
          id, name, phone: phone || '', pax: pax || 2, status: 'waiting',
          position: pos, source: source || 'manual',
          createdAt: Date.now(), updatedAt: Date.now(), tenantId,
        });
      } else {
        await db.insert(waitlist).values({
          id, name, phone: phone || '', pax: pax || 2, status: 'waiting',
          position: pos, notes: notes || '', source: source || 'manual',
          createdAt: Date.now(), updatedAt: Date.now(), tenantId,
        });
      }
      return apiOk({ ok: true, id, position: pos });
    }

    if (action === 'call') {
      const { id } = body;
      const [entry] = await db.select({ name: waitlist.name, phone: waitlist.phone }).from(waitlist)
        .where(and(eq(waitlist.id, id), eq(waitlist.tenantId, tenantId))).limit(1);
      await db.update(waitlist).set({
        status: 'called', calledCount: sql`called_count + 1`,
        calledAt: Date.now(), updatedAt: Date.now(),
      }).where(and(eq(waitlist.id, id), eq(waitlist.tenantId, tenantId)));
      if (entry) {
        const s = await getSettings(tenantId);
        sendNotifications({ name: entry.name, phone: entry.phone }, s, tenantId).catch(() => {});
      }
      return apiOk();
    }

    if (action === 'seat') {
      const { id, tableId } = body;
      await db.update(waitlist).set({
        status: 'seated', seatedAt: Date.now(), tableId: tableId || '',
        updatedAt: Date.now(),
      }).where(and(eq(waitlist.id, id), eq(waitlist.tenantId, tenantId)));
      return apiOk();
    }

    if (action === 'cancel') {
      const { id } = body;
      await db.update(waitlist).set({ status: 'cancelled', updatedAt: Date.now() })
        .where(and(eq(waitlist.id, id), eq(waitlist.tenantId, tenantId)));
      return apiOk();
    }

    if (action === 'noshow') {
      const { id } = body;
      await db.update(waitlist).set({ status: 'noshow', updatedAt: Date.now() })
        .where(and(eq(waitlist.id, id), eq(waitlist.tenantId, tenantId)));
      return apiOk();
    }

    if (action === 'reorder') {
      const { ids } = body;
      for (let i = 0; i < ids.length; i++) {
        await db.update(waitlist).set({ position: i + 1, updatedAt: Date.now() })
          .where(and(eq(waitlist.id, ids[i]), eq(waitlist.tenantId, tenantId)));
      }
      return apiOk();
    }

    return apiBadRequest('Unknown action');
  } catch (err) { return apiError(err); }
}
