import { NextRequest } from 'next/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { kdsPairings } from '../../../db/schema';
import { apiOk, apiError, apiBadRequest } from '../../../lib/infrastructure/response';
import { requireRole } from '../../../lib/rbac';

function makeId() { return 'k_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
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
    return apiOk(rows.map((r: any) => ({
      id: r.id, code: r.code, label: r.label, deviceId: r.deviceId,
      expiresAt: r.expiresAt, createdAt: r.createdAt, revoked: r.revoked,
    })));
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const { action } = body;

    if (action === 'verify') {
      const { code, label, deviceId } = body;
      const db = getDb();
      const allCodes = await db.select({ c: kdsPairings.code, r: kdsPairings.revoked, e: kdsPairings.expiresAt }).from(kdsPairings);
      const match = allCodes.find(r => r.c === code);
      const rows = await db.select().from(kdsPairings)
        .where(and(eq(kdsPairings.code, code), eq(kdsPairings.revoked, false)))
        .limit(1);
      if (match && !rows.length) {
        return apiOk({ _debug: 'code exists but revoked or expired', code: match.c, revoked: match.r, expiresAt: match.e, now: Date.now() });
      }
      if (rows.length === 0 || rows[0].expiresAt <= Date.now()) {
        if (!match) {
          return apiOk({ _debug: 'code not found in DB at all', searchedCode: code, allCodes: allCodes.map(r => r.c) });
        }
        return apiBadRequest('Código inválido o caducado');
      }
      const pairing = rows[0];
      const devId = deviceId || makeId() + '_dev';
      await db.update(kdsPairings).set({
        deviceId: devId, label: label || pairing.label,
      }).where(eq(kdsPairings.id, pairing.id));
      return apiOk({ deviceId: devId, tenantId: pairing.tenantId || 'default', pairing: { id: pairing.id, label: label || pairing.label } });
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
    const body = await req.json() as any;
    const { id } = body;
    if (!id) return apiBadRequest('id required');
    await db.update(kdsPairings).set({ revoked: true }).where(and(eq(kdsPairings.id, id), eq(kdsPairings.tenantId, tenantId)));
    return apiOk();
  } catch (err) { return apiError(err); }
}
