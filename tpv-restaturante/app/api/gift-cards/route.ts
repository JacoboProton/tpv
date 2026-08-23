import { NextRequest } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { requireRole, getSessionEmployee } from '../../../lib/rbac';
import { apiOk, apiError, apiBadRequest, apiUnauthorized, apiNotFound, apiCreated } from '../../../lib/infrastructure/response';
import { giftCards } from '../../../db/schema';

function genCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 16; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (code) {
    const emp = await getSessionEmployee(req);
    if (!emp) return apiUnauthorized();
    try {
      const db = getDb();
      const rows = await db.select().from(giftCards)
        .where(eq(giftCards.code, code.toUpperCase().trim())).limit(1);
      if (rows.length === 0) return apiNotFound('Tarjeta no encontrada');
      const r = rows[0];
      return apiOk({
        id: r.id, code: r.code, balance: round2(Number(r.balance)),
        status: r.status, holderName: r.holderName ?? null,
        expiresAt: r.expiresAt ? new Date(r.expiresAt).toISOString() : null,
      });
    } catch (e) { return apiError(e); }
  }
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const rows = await db.select().from(giftCards)
      .where(eq(giftCards.tenantId, tenantId))
      .orderBy(sql`${giftCards.createdAt} DESC`);
    return apiOk(rows.map(r => ({
      id: r.id, code: r.code, balance: round2(Number(r.balance)),
      initialBalance: round2(Number(r.initialBalance)), status: r.status,
      holderName: r.holderName ?? null,
      expiresAt: r.expiresAt ? new Date(r.expiresAt).toISOString() : null,
      notes: r.notes ?? null, createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
    })));
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; } catch { return apiBadRequest('JSON inválido'); }
  const action = body?.action;

  const db = getDb();
  const tenantId = getTenantId(req);

  if (action === 'redeem') {
    const emp = await getSessionEmployee(req);
    if (!emp) return apiUnauthorized();
    const code = String(body?.code ?? '').toUpperCase().trim();
    const amount = Number(body?.amount);
    if (!code) return apiBadRequest('Código requerido');
    if (!(amount > 0)) return apiBadRequest('Importe inválido');
    try {
      const rows = await db.select().from(giftCards).where(eq(giftCards.code, code)).limit(1);
      if (rows.length === 0) return apiNotFound('Tarjeta no encontrada');
      const r = rows[0];
      if (r.status !== 'active') return apiBadRequest('Tarjeta no activa');
      if (r.expiresAt && new Date(r.expiresAt).getTime() < Date.now()) return apiBadRequest('Tarjeta caducada');
      const balance = round2(Number(r.balance));
      if (balance < amount - 0.001) return apiBadRequest(`Saldo insuficiente (disponible ${balance} €)`);
      const newBalance = round2(balance - amount);
      await db.update(giftCards).set({
        balance: String(newBalance),
        status: newBalance <= 0.001 ? 'redeemed' : r.status,
      }).where(eq(giftCards.code, code));
      return apiOk({ id: r.id, code, balance: newBalance, status: newBalance <= 0.001 ? 'redeemed' : 'active' });
    } catch (e) { return apiError(e); }
  }

  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);

  if (action === 'issue') {
    const amount = Number(body?.amount);
    if (!(amount > 0)) return apiBadRequest('Importe inicial inválido');
    let code = String(body?.code ?? '').toUpperCase().trim();
    if (!code) code = genCode();
    try {
      const id = 'gc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      await db.insert(giftCards).values({
        id, code, balance: String(round2(amount)), initialBalance: String(round2(amount)),
        status: 'active', holderName: body?.holderName ? String(body.holderName) : null,
        expiresAt: typeof body?.expiresAt === 'string' && body.expiresAt ? new Date(body.expiresAt) : null,
        notes: body?.notes ? String(body.notes) : null,
        createdBy: auth.employee?.id ?? null, tenantId,
      });
      return apiCreated({ id, code, balance: round2(amount), status: 'active' });
    } catch (e) {
      if (errText(e).includes('duplicate') || errText(e).includes('unique')) {
        return apiBadRequest('El código ya existe');
      }
      return apiError(e);
    }
  }

  if (action === 'recharge') {
    const code = String(body?.code ?? '').toUpperCase().trim();
    const amount = Number(body?.amount);
    if (!code) return apiBadRequest('Código requerido');
    if (!(amount > 0)) return apiBadRequest('Importe inválido');
    try {
      const rows = await db.select().from(giftCards).where(eq(giftCards.code, code)).limit(1);
      if (rows.length === 0) return apiNotFound('Tarjeta no encontrada');
      const r = rows[0];
      const newBalance = round2(Number(r.balance) + amount);
      await db.update(giftCards).set({ balance: String(newBalance), status: 'active' }).where(eq(giftCards.code, code));
      return apiOk({ id: r.id, code, balance: newBalance, status: 'active' });
    } catch (e) { return apiError(e); }
  }

  return apiBadRequest('Acción no soportada');
}
