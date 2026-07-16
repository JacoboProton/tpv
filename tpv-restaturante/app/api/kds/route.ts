import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { kdsPairings } from '../../../db/schema';

function makeId() { return 'k_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId');

    if (deviceId) {
      const db = getDb();
      const rows = await db.select({
        id: kdsPairings.id, label: kdsPairings.label,
        deviceId: kdsPairings.deviceId, createdAt: kdsPairings.createdAt,
        revoked: kdsPairings.revoked,
      }).from(kdsPairings)
        .where(and(eq(kdsPairings.deviceId, deviceId), eq(kdsPairings.revoked, false)))
        .limit(1);
      if (rows.length > 0) {
        return NextResponse.json({ paired: true, pairing: rows[0] });
      }
      return NextResponse.json({ paired: false });
    }

    const db = getDb();
    const tenantId = getTenantId(req);
    const rows = await db.select().from(kdsPairings)
      .where(eq(kdsPairings.tenantId, tenantId))
      .orderBy(desc(kdsPairings.createdAt));
    return NextResponse.json(rows.map(r => ({
      id: r.id, code: r.code, label: r.label, deviceId: r.deviceId,
      expiresAt: r.expiresAt, createdAt: r.createdAt, revoked: r.revoked,
    })));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json() as any;
    const { action } = body;

    if (action === 'generate') {
      const tenantId = getTenantId(req);
      const code = generateCode();
      const id = makeId();
      const expiresAt = Date.now() + 10 * 60 * 1000;
      await db.insert(kdsPairings).values({
        id, code, label: body.label || '', deviceId: '',
        expiresAt, createdAt: Date.now(), revoked: false, tenantId,
      });
      return NextResponse.json({ ok: true, id, code, expiresAt });
    }

    if (action === 'verify') {
      const { code, label, deviceId } = body;
      const rows = await db.select().from(kdsPairings)
        .where(sql`${eq(kdsPairings.code, code)} AND ${eq(kdsPairings.revoked, false)} AND ${sql.raw('expires_at')} > ${Date.now()}`)
        .limit(1);
      if (rows.length === 0) {
        return NextResponse.json({ ok: false, error: 'Código inválido o caducado' }, { status: 400 });
      }
      const pairing = rows[0];
      const devId = deviceId || makeId() + '_dev';
      await db.update(kdsPairings).set({
        deviceId: devId, label: label || pairing.label,
      }).where(eq(kdsPairings.id, pairing.id));
      return NextResponse.json({ ok: true, deviceId: devId, tenantId: pairing.tenantId || 'default', pairing: { id: pairing.id, label: label || pairing.label } });
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const body = await req.json() as any;
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await db.update(kdsPairings).set({ revoked: true }).where(and(eq(kdsPairings.id, id), eq(kdsPairings.tenantId, tenantId)));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
