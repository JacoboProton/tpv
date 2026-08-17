import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { kdsPairings } from '../../../db/schema';
import { apiOk, apiError, apiBadRequest } from '../../../lib/infrastructure/response';
import { requireRole } from '../../../lib/rbac';
import { rateLimit, getClientIp } from '../../../lib/rate-limit';
import { KdsBody, IdBody } from '@/lib/schemas/api-schemas';

function makeId() { return 'k_' + Date.now().toString(36) + randomBytes(4).toString('hex'); }
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateCode() {
  const bytes = randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return code;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const deviceId = searchParams.get('deviceId');

  if (deviceId) {
    try {
      const db = getDb();
      const rows = await db.select({
        id: kdsPairings.id, label: kdsPairings.label,
        deviceId: kdsPairings.deviceId, createdAt: kdsPairings.createdAt,
        revoked: kdsPairings.revoked,
      }).from(kdsPairings)
        .where(and(eq(kdsPairings.deviceId, deviceId), eq(kdsPairings.revoked, false)))
        .limit(1);
      if (rows.length > 0) {
        return apiOk({ paired: true, pairing: rows[0] });
      }
      return apiOk({ paired: false });
    } catch (err) { return apiError(err); }
  }

  const auth = await requireRole(['admin', 'camarero', 'cocina'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const rows = await db.select().from(kdsPairings)
      .where(eq(kdsPairings.tenantId, tenantId))
      .orderBy(desc(kdsPairings.createdAt));
    return apiOk(rows.map((r: typeof kdsPairings.$inferSelect) => ({
      id: r.id, code: r.code, label: r.label, deviceId: r.deviceId,
      expiresAt: r.expiresAt, createdAt: r.createdAt, revoked: r.revoked,
    })));
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const parsed = KdsBody.safeParse(await req.json());
    if (!parsed.success) return apiBadRequest(parsed.error.message);
    const body = parsed.data;
    const { action } = body;

    if (action === 'verify') {
      const rl = await rateLimit(`kds-verify:${getClientIp(req)}`, 20, 60_000);
      if (!rl.allowed) return apiError(new Error('Demasiados intentos'), 429);
      const { code, label, deviceId } = body;
      if (!code) return apiBadRequest('code required');
      const db = getDb();
      const rows = await db.select().from(kdsPairings)
        .where(and(eq(kdsPairings.code, code), eq(kdsPairings.revoked, false)))
        .limit(1);
      if (rows.length === 0) {
        return NextResponse.json({ ok: false, error: 'Código inválido' }, { status: 400 });
      }
      const pairing = rows[0];
      const devId = deviceId || makeId() + '_dev';
      await db.update(kdsPairings).set({
        deviceId: devId, label: label || pairing.label,
      }).where(eq(kdsPairings.id, pairing.id));
      return NextResponse.json({ ok: true, deviceId: devId, tenantId: pairing.tenantId || 'default', pairing: { id: pairing.id, label: label || pairing.label } });
    }

    const auth = await requireRole(['admin', 'camarero', 'cocina'])(req);
    if (!auth.authorized) return apiError(new Error(auth.error), auth.status);

    if (action === 'generate') {
      const tenantId = getTenantId(req);
      const code = generateCode();
      const id = makeId();
      const expiresAt = Date.now() + 10 * 60 * 1000;
      const db = getDb();
      await db.insert(kdsPairings).values({
        id, code, label: body.label || '', deviceId: '',
        expiresAt, createdAt: Date.now(), revoked: false, tenantId,
      });
      return apiOk({ id, code, expiresAt });
    }

    return apiBadRequest('unknown action');
  } catch (err) { return apiError(err); }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero', 'cocina'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const parsed = IdBody.safeParse(await req.json());
    if (!parsed.success) return apiBadRequest(parsed.error.message);
    const { id } = parsed.data;
    await db.update(kdsPairings).set({ revoked: true }).where(and(eq(kdsPairings.id, id), eq(kdsPairings.tenantId, tenantId)));
    return apiOk();
  } catch (err) { return apiError(err); }
}
