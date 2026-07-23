import { NextRequest } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { requireRole } from '../../../lib/rbac';

function qr(db: ReturnType<typeof getDb>, q: any) {
  return db.execute(q).then((r: any) => r.rows as any[]);
}

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero'])(req);
  if (!auth.authorized) return Response.json({ error: auth.error }, { status: auth.status });
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const url = new URL(req.url);
    const scope = url.searchParams.get('scope') || 'sessions';

    if (scope === 'config') {
      const [config] = await qr(db, sql`SELECT * FROM buffet_config WHERE id = 'default' AND tenant_id = ${tenantId}`);
      return Response.json(config || null);
    }

    if (scope === 'table_session') {
      const tableId = url.searchParams.get('tableId');
      if (!tableId) return Response.json(null);
      const [session] = await qr(db, sql`SELECT * FROM buffet_sessions WHERE table_id = ${tableId} AND status = 'active' AND tenant_id = ${tenantId}`);
      if (!session) return Response.json(null);
      const [cfg] = await qr(db, sql`SELECT * FROM buffet_config WHERE id = 'default' AND tenant_id = ${tenantId}`);
      return Response.json({ session, config: cfg || null });
    }

    if (scope === 'rounds') {
      const sessionId = url.searchParams.get('sessionId');
      if (!sessionId) return Response.json([]);
      const rounds = await qr(db, sql`SELECT * FROM buffet_rounds WHERE session_id = ${sessionId} AND tenant_id = ${tenantId} ORDER BY round_number DESC`);
      return Response.json(rounds);
    }

    const sessions = await qr(db, sql`SELECT * FROM buffet_sessions WHERE status = 'active' AND tenant_id = ${tenantId} ORDER BY started_at DESC`);
    const [config] = await qr(db, sql`SELECT * FROM buffet_config WHERE id = 'default' AND tenant_id = ${tenantId}`);
    return Response.json({ sessions, config: config || null });
  } catch (e: any) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero'])(req);
  if (!auth.authorized) return Response.json({ error: auth.error }, { status: auth.status });

  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const body = await req.json() as any;
    const { action } = body;

    if (action === 'open') {
      const { tableId, tableName, adults, children, seniors, employeeName } = body;

      const [existing] = await qr(db, sql`SELECT id FROM buffet_sessions WHERE table_id = ${tableId} AND status = 'active' AND tenant_id = ${tenantId}`);
      if (existing) return Response.json({ error: 'La mesa ya tiene una sesión de buffet activa' }, { status: 409 });

      const [cfg] = await qr(db, sql`SELECT * FROM buffet_config WHERE id = 'default' AND tenant_id = ${tenantId}`);
      if (!cfg?.enabled) return Response.json({ error: 'El buffet no está habilitado' }, { status: 400 });
      if (cfg.paused_until > Date.now()) return Response.json({ error: 'El buffet está en pausa' }, { status: 400 });

      const id = 'bf_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      const startedAt = Date.now();
      const orderId = 'bo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

      const orderItems = [
        { id: 'cvr_' + Date.now(), productId: 'buffet_cover', name: `Buffet cubierto (${adults || 1} adultos)`, price: Number(cfg.cover_price), qty: adults || 1, sent: true, ready: true, sentAt: startedAt, notes: '', modifiers: [], course: 'buffet' },
      ];
      if (children > 0) orderItems.push({ id: 'cvr_' + Date.now() + '_1', productId: 'buffet_child', name: `Buffet niños (${children})`, price: Number(cfg.child_price), qty: children, sent: true, ready: true, sentAt: startedAt, notes: '', modifiers: [], course: 'buffet' });
      if (seniors > 0) orderItems.push({ id: 'cvr_' + Date.now() + '_2', productId: 'buffet_senior', name: `Buffet mayores (${seniors})`, price: Number(cfg.senior_price), qty: seniors, sent: true, ready: true, sentAt: startedAt, notes: '', modifiers: [], course: 'buffet' });

      await db.execute(sql`INSERT INTO orders (id, table_id, items, created_at, employee_name, source, tenant_id) VALUES (${orderId}, ${tableId}, ${JSON.stringify(orderItems)}, ${startedAt}, ${employeeName || 'Buffet'}, 'buffet', ${tenantId})`);
      await db.execute(sql`UPDATE tables SET status = 'ocupada', order_id = ${orderId}, order_ids = ${JSON.stringify([orderId])} WHERE id = ${tableId} AND tenant_id = ${tenantId}`);
      await db.execute(sql`INSERT INTO buffet_sessions (id, table_id, table_name, adult_count, child_count, senior_count, started_at, cover_price_snapshot, child_price_snapshot, senior_price_snapshot, round, status, order_id, tenant_id) VALUES (${id}, ${tableId}, ${tableName}, ${adults || 1}, ${children || 0}, ${seniors || 0}, ${startedAt}, ${cfg.cover_price}, ${cfg.child_price}, ${cfg.senior_price}, 0, 'active', ${orderId}, ${tenantId})`);

      return Response.json({ id, startedAt, orderId });
    }

    if (action === 'pause') {
      const minutes = body.minutes || 5;
      const pausedUntil = Date.now() + minutes * 60000;
      await db.execute(sql`UPDATE buffet_config SET paused_until = ${pausedUntil}, updated_at = ${Date.now()} WHERE id = 'default' AND tenant_id = ${tenantId}`);
      return Response.json({ pausedUntil });
    }

    if (action === 'resume') {
      await db.execute(sql`UPDATE buffet_config SET paused_until = 0, updated_at = ${Date.now()} WHERE id = 'default' AND tenant_id = ${tenantId}`);
      return Response.json({ ok: true });
    }

    if (action === 'close') {
      const { sessionId, adults, children, seniors, employeeName } = body;
      const [session] = await qr(db, sql`SELECT * FROM buffet_sessions WHERE id = ${sessionId} AND tenant_id = ${tenantId}`);
      if (!session) return Response.json({ error: 'Sesión no encontrada' }, { status: 404 });

      const a = adults ?? session.adult_count;
      const c = children ?? session.child_count;
      const s = seniors ?? session.senior_count;
      const coverEffective = session.override_cover_price > 0 ? session.override_cover_price : session.cover_price_snapshot;
      const estimated = a * Number(coverEffective) + c * Number(session.child_price_snapshot) + s * Number(session.senior_price_snapshot) + Number(session.waste_amount);

      if (session.order_id) {
        const [existingOrder] = await qr(db, sql`SELECT * FROM orders WHERE id = ${session.order_id} AND tenant_id = ${tenantId}`);
        if (existingOrder) {
          let items = (existingOrder.items || []).filter((i: any) => i.productId !== 'buffet_cover' && i.productId !== 'buffet_child' && i.productId !== 'buffet_senior');
          items.push({ id: 'cvr_' + Date.now(), productId: 'buffet_cover', name: `Buffet cubierto ${a} adulto${a !== 1 ? 's' : ''}`, price: Number(coverEffective), qty: a, sent: true, ready: true, sentAt: existingOrder.created_at, notes: '', modifiers: [], course: 'buffet' });
          if (c > 0) items.push({ id: 'cvr_' + Date.now() + '_1', productId: 'buffet_child', name: `Buffet ${c} niño${c !== 1 ? 's' : ''}`, price: Number(session.child_price_snapshot), qty: c, sent: true, ready: true, sentAt: existingOrder.created_at, notes: '', modifiers: [], course: 'buffet' });
          if (s > 0) items.push({ id: 'cvr_' + Date.now() + '_2', productId: 'buffet_senior', name: `Buffet ${s} mayor${s !== 1 ? 'es' : ''}`, price: Number(session.senior_price_snapshot), qty: s, sent: true, ready: true, sentAt: existingOrder.created_at, notes: '', modifiers: [], course: 'buffet' });
          if (Number(session.waste_amount) > 0) items.push({ id: 'wst_' + Date.now(), productId: 'buffet_waste', name: 'Desperdicio buffet', price: Number(session.waste_amount), qty: 1, sent: true, ready: true, sentAt: Date.now(), notes: '', modifiers: [], course: 'buffet' });
          await db.execute(sql`UPDATE orders SET items = ${JSON.stringify(items)} WHERE id = ${session.order_id} AND tenant_id = ${tenantId}`);
        }
      }

      await db.execute(sql`UPDATE buffet_sessions SET status = 'closed', closed_at = ${Date.now()}, closed_by = ${employeeName || null}, adult_count = ${a}, child_count = ${c}, senior_count = ${s}, estimated_total = ${estimated} WHERE id = ${sessionId} AND tenant_id = ${tenantId}`);
      await db.execute(sql`UPDATE tables SET status = 'cuenta' WHERE id = ${session.table_id} AND tenant_id = ${tenantId}`);
      return Response.json({ estimated });
    }

    if (action === 'void') {
      const { sessionId, reason, employeeName } = body;
      const [session] = await qr(db, sql`SELECT * FROM buffet_sessions WHERE id = ${sessionId} AND tenant_id = ${tenantId}`);
      if (!session) return Response.json({ error: 'Sesión no encontrada' }, { status: 404 });

      await db.execute(sql`UPDATE buffet_sessions SET status = 'voided', void_reason = ${reason || 'sin motivo'}, voided_by = ${employeeName || null}, closed_at = ${Date.now()} WHERE id = ${sessionId} AND tenant_id = ${tenantId}`);
      if (session.order_id) await db.execute(sql`DELETE FROM orders WHERE id = ${session.order_id} AND tenant_id = ${tenantId}`);
      await db.execute(sql`UPDATE tables SET status = 'libre', order_id = NULL, order_ids = '[]' WHERE id = ${session.table_id} AND tenant_id = ${tenantId}`);
      return Response.json({ ok: true });
    }

    if (action === 'adjust_guests') {
      const { sessionId, adults, children, seniors } = body;
      await db.execute(sql`UPDATE buffet_sessions SET adult_count = ${adults}, child_count = ${children}, senior_count = ${seniors} WHERE id = ${sessionId} AND tenant_id = ${tenantId}`);
      return Response.json({ ok: true });
    }

    if (action === 'override') {
      const { sessionId, timeLimit, cooldown, roundCap, coverPrice } = body;
      await db.execute(sql`UPDATE buffet_sessions SET override_time_limit = ${timeLimit || 0}, override_cooldown = ${cooldown || 0}, override_round_cap = ${roundCap || 0}, override_cover_price = ${coverPrice || 0} WHERE id = ${sessionId} AND tenant_id = ${tenantId}`);
      return Response.json({ ok: true });
    }

    if (action === 'add_waste') {
      const { sessionId, tableId, productId, productName, charge, employeeId } = body;
      const id = 'bw_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      await db.execute(sql`INSERT INTO buffet_waste (id, session_id, table_id, product_id, product_name, charge, created_at, employee_id, tenant_id) VALUES (${id}, ${sessionId}, ${tableId}, ${productId}, ${productName}, ${charge}, ${Date.now()}, ${employeeId || null}, ${tenantId})`);
      await db.execute(sql`UPDATE buffet_sessions SET waste_amount = waste_amount + ${charge} WHERE id = ${sessionId} AND tenant_id = ${tenantId}`);
      return Response.json({ id });
    }

    if (action === 'batch') {
      const { batchAction, sessionIds, employeeName } = body;

      if (batchAction === 'close_all') {
        for (const sid of sessionIds) {
          const [s] = await qr(db, sql`SELECT * FROM buffet_sessions WHERE id = ${sid} AND tenant_id = ${tenantId}`);
          if (!s) continue;
          const coverEff = s.override_cover_price > 0 ? s.override_cover_price : s.cover_price_snapshot;
          const est = s.adult_count * Number(coverEff) + s.child_count * Number(s.child_price_snapshot) + s.senior_count * Number(s.senior_price_snapshot) + Number(s.waste_amount);
          if (s.order_id) {
            const [o] = await qr(db, sql`SELECT * FROM orders WHERE id = ${s.order_id} AND tenant_id = ${tenantId}`);
            if (o) {
              let items = (o.items || []).filter((i: any) => i.productId !== 'buffet_cover' && i.productId !== 'buffet_child' && i.productId !== 'buffet_senior');
              items.push({ id: 'cvr_' + Date.now(), productId: 'buffet_cover', name: `Buffet cubierto ${s.adult_count} adultos`, price: Number(coverEff), qty: s.adult_count, sent: true, ready: true, sentAt: o.created_at, notes: '', modifiers: [], course: 'buffet' });
              if (s.child_count > 0) items.push({ id: 'cvr_' + Date.now() + '_1', productId: 'buffet_child', name: `Buffet ${s.child_count} niños`, price: Number(s.child_price_snapshot), qty: s.child_count, sent: true, ready: true, sentAt: o.created_at, notes: '', modifiers: [], course: 'buffet' });
              if (s.senior_count > 0) items.push({ id: 'cvr_' + Date.now() + '_2', productId: 'buffet_senior', name: `Buffet ${s.senior_count} mayores`, price: Number(s.senior_price_snapshot), qty: s.senior_count, sent: true, ready: true, sentAt: o.created_at, notes: '', modifiers: [], course: 'buffet' });
              if (Number(s.waste_amount) > 0) items.push({ id: 'wst_' + Date.now(), productId: 'buffet_waste', name: 'Desperdicio buffet', price: Number(s.waste_amount), qty: 1, sent: true, ready: true, sentAt: Date.now(), notes: '', modifiers: [], course: 'buffet' });
              await db.execute(sql`UPDATE orders SET items = ${JSON.stringify(items)} WHERE id = ${s.order_id} AND tenant_id = ${tenantId}`);
            }
          }
          await db.execute(sql`UPDATE buffet_sessions SET status = 'closed', closed_at = ${Date.now()}, closed_by = ${employeeName || null}, estimated_total = ${est} WHERE id = ${sid} AND tenant_id = ${tenantId}`);
          await db.execute(sql`UPDATE tables SET status = 'cuenta' WHERE id = ${s.table_id} AND tenant_id = ${tenantId}`);
        }
        return Response.json({ ok: true });
      }

      if (batchAction === 'reset_cooldown') {
        for (const sid of sessionIds) {
          await db.execute(sql`UPDATE buffet_sessions SET cooldown_until = 0 WHERE id = ${sid} AND tenant_id = ${tenantId}`);
        }
        return Response.json({ ok: true });
      }

      return Response.json({ error: 'Acción batch desconocida' }, { status: 400 });
    }

    if (action === 'create_round') {
      const { tableId, items, employeeName } = body;
      const [session] = await qr(db, sql`SELECT * FROM buffet_sessions WHERE table_id = ${tableId} AND status = 'active' AND tenant_id = ${tenantId}`);
      if (!session) return Response.json({ error: 'Esta mesa no tiene una sesión de buffet activa' }, { status: 400 });

      const [cfg] = await qr(db, sql`SELECT * FROM buffet_config WHERE id = 'default' AND tenant_id = ${tenantId}`);
      if (cfg?.paused_until > Date.now()) return Response.json({ error: 'El buffet está en pausa' }, { status: 400 });
      if (session.cooldown_until > Date.now()) return Response.json({ error: `Espera ${Math.ceil((session.cooldown_until - Date.now()) / 1000)}s antes de pedir otra ronda` }, { status: 400 });

      const cap = session.override_round_cap > 0 ? session.override_round_cap : (cfg?.round_cap || 3);
      const totalPeople = session.adult_count + session.child_count + session.senior_count;
      const maxItems = cap * totalPeople;
      if (items.length > maxItems) return Response.json({ error: `Máximo ${maxItems} items por ronda (${cap} × ${totalPeople} personas)` }, { status: 400 });

      const roundId = 'br_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      const newRound = session.round + 1;
      const cooldownMin = session.override_cooldown > 0 ? session.override_cooldown : (cfg?.cooldown || 5);
      const cooldownUntil = Date.now() + cooldownMin * 60000;

      await db.execute(sql`INSERT INTO buffet_rounds (id, session_id, round_number, items, item_count, requested_at, status, tenant_id) VALUES (${roundId}, ${session.id}, ${newRound}, ${JSON.stringify(items)}, ${items.length}, ${Date.now()}, 'pending', ${tenantId})`);
      await db.execute(sql`UPDATE buffet_sessions SET round = ${newRound}, cooldown_until = ${cooldownUntil} WHERE id = ${session.id} AND tenant_id = ${tenantId}`);

      const orderId = 'bo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      const orderItems = items.map((i: any) => ({
        id: i.id || 'bi_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        productId: i.productId, name: i.name, price: 0, qty: i.qty || 1,
        sent: true, ready: false, sentAt: Date.now(), notes: i.notes || '',
        course: i.course || 'buffet', modifiers: i.modifiers || [], buffetRound: roundId,
      }));

      await db.execute(sql`INSERT INTO orders (id, table_id, items, created_at, employee_name, source, tenant_id) VALUES (${orderId}, ${tableId}, ${JSON.stringify(orderItems)}, ${Date.now()}, ${employeeName || 'Buffet'}, 'buffet', ${tenantId})`);
      return Response.json({ roundId, orderId, round: newRound, cooldownUntil });
    }

    if (action === 'deliver_round') {
      const { roundId } = body;
      const [round] = await qr(db, sql`SELECT * FROM buffet_rounds WHERE id = ${roundId} AND tenant_id = ${tenantId}`);
      if (!round) return Response.json({ error: 'Ronda no encontrada' }, { status: 404 });
      await db.execute(sql`UPDATE buffet_rounds SET status = 'delivered', delivered_at = ${Date.now()} WHERE id = ${roundId} AND tenant_id = ${tenantId}`);
      return Response.json({ ok: true });
    }

    if (action === 'call_customer') {
      const { sessionId } = body;
      const [session] = await qr(db, sql`SELECT * FROM buffet_sessions WHERE id = ${sessionId} AND tenant_id = ${tenantId}`);
      if (!session) return Response.json({ error: 'Sesión no encontrada' }, { status: 404 });
      const [qrOrder] = await qr(db, sql`SELECT customer_name FROM qr_orders WHERE table_id = ${session.table_id} AND tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT 1`);
      return Response.json({ ok: true, customerName: qrOrder?.customer_name || null });
    }

    if (action === 'update_config') {
      const { enabled, timeLimit, cooldown, roundCap, coverPrice, childPrice, seniorPrice, childMaxAge, seniorMinAge, staffOpensTable } = body;
      await db.execute(sql`UPDATE buffet_config SET enabled = ${enabled ?? false}, time_limit = ${timeLimit ?? 90}, cooldown = ${cooldown ?? 5}, round_cap = ${roundCap ?? 3}, cover_price = ${coverPrice ?? 25.00}, child_price = ${childPrice ?? 12.50}, senior_price = ${seniorPrice ?? 18.00}, child_max_age = ${childMaxAge ?? 12}, senior_min_age = ${seniorMinAge ?? 65}, staff_opens_table = ${staffOpensTable ?? true}, updated_at = ${Date.now()} WHERE id = 'default' AND tenant_id = ${tenantId}`);
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Acción desconocida' }, { status: 400 });
  } catch (e: any) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
