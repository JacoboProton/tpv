import { sql } from '../../../lib/db';

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const scope = url.searchParams.get('scope') || 'sessions';

    if (scope === 'config') {
      const [config] = await sql`SELECT * FROM buffet_config WHERE id = 'default'`;
      return Response.json(config || null);
    }

    if (scope === 'table_session') {
      const tableId = url.searchParams.get('tableId');
      if (!tableId) return Response.json(null);
      const [session] = await sql`
        SELECT * FROM buffet_sessions WHERE table_id = ${tableId} AND status = 'active'
      `;
      if (!session) return Response.json(null);
      const [cfg] = await sql`SELECT * FROM buffet_config WHERE id = 'default'`;
      return Response.json({ session, config: cfg || null });
    }

    if (scope === 'rounds') {
      const sessionId = url.searchParams.get('sessionId');
      if (!sessionId) return Response.json([]);
      const rounds = await sql`
        SELECT * FROM buffet_rounds WHERE session_id = ${sessionId} ORDER BY round_number DESC
      `;
      return Response.json(rounds);
    }

    const sessions = await sql`
      SELECT * FROM buffet_sessions
      WHERE status = 'active'
      ORDER BY started_at DESC
    `;

    const config = await sql`SELECT * FROM buffet_config WHERE id = 'default'`;
    return Response.json({ sessions, config: config[0] || null });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action } = body;

    // ===== OPEN SESSION =====
    if (action === 'open') {
      const { tableId, tableName, adults, children, seniors, employeeName } = body;

      const [existing] = await sql`
        SELECT id FROM buffet_sessions
        WHERE table_id = ${tableId} AND status = 'active'
      `;
      if (existing) {
        return Response.json({ error: 'La mesa ya tiene una sesión de buffet activa' }, { status: 409 });
      }

      const [cfg] = await sql`SELECT * FROM buffet_config WHERE id = 'default'`;

      if (!cfg?.enabled) {
        return Response.json({ error: 'El buffet no está habilitado' }, { status: 400 });
      }

      if (cfg.paused_until > Date.now()) {
        return Response.json({ error: 'El buffet está en pausa hasta las ' + new Date(cfg.paused_until).toLocaleTimeString() }, { status: 400 });
      }

      const id = 'bf_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      const startedAt = Date.now();
      const orderId = 'bo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

      // Create TPV order with cover items for billing
      const orderItems = [
        { id: 'cvr_' + Date.now(), productId: 'buffet_cover', name: `Buffet cubierto (${adults || 1} adultos)`, price: Number(cfg.cover_price), qty: adults || 1, sent: true, ready: true, sentAt: startedAt, notes: '', modifiers: [], course: 'buffet' },
      ];
      if (children > 0) {
        orderItems.push({ id: 'cvr_' + Date.now() + '_1', productId: 'buffet_child', name: `Buffet niños (${children})`, price: Number(cfg.child_price), qty: children, sent: true, ready: true, sentAt: startedAt, notes: '', modifiers: [], course: 'buffet' });
      }
      if (seniors > 0) {
        orderItems.push({ id: 'cvr_' + Date.now() + '_2', productId: 'buffet_senior', name: `Buffet mayores (${seniors})`, price: Number(cfg.senior_price), qty: seniors, sent: true, ready: true, sentAt: startedAt, notes: '', modifiers: [], course: 'buffet' });
      }

      await sql`
        INSERT INTO orders (id, table_id, items, created_at, employee_name, source)
        VALUES (${orderId}, ${tableId}, ${JSON.stringify(orderItems)}, ${startedAt}, ${employeeName || 'Buffet'}, 'buffet')
      `;

      await sql`UPDATE tables SET status = 'ocupada', order_id = ${orderId}, order_ids = ${JSON.stringify([orderId])} WHERE id = ${tableId}`;

      await sql`
        INSERT INTO buffet_sessions (id, table_id, table_name, adult_count, child_count, senior_count,
          started_at, cover_price_snapshot, child_price_snapshot, senior_price_snapshot, round, status, order_id)
        VALUES (${id}, ${tableId}, ${tableName}, ${adults || 1}, ${children || 0}, ${seniors || 0},
          ${startedAt}, ${cfg.cover_price}, ${cfg.child_price}, ${cfg.senior_price}, 0, 'active', ${orderId})
      `;

      return Response.json({ id, startedAt, orderId });
    }

    // ===== PAUSE =====
    if (action === 'pause') {
      const minutes = body.minutes || 5;
      const pausedUntil = Date.now() + minutes * 60000;

      await sql`UPDATE buffet_config SET paused_until = ${pausedUntil}, updated_at = ${Date.now()} WHERE id = 'default'`;

      return Response.json({ pausedUntil });
    }

    // ===== RESUME =====
    if (action === 'resume') {
      await sql`UPDATE buffet_config SET paused_until = 0, updated_at = ${Date.now()} WHERE id = 'default'`;
      return Response.json({ ok: true });
    }

    // ===== CLOSE SESSION =====
    if (action === 'close') {
      const { sessionId, adults, children, seniors, employeeName } = body;

      const [session] = await sql`SELECT * FROM buffet_sessions WHERE id = ${sessionId}`;
      if (!session) return Response.json({ error: 'Sesión no encontrada' }, { status: 404 });

      const a = adults ?? session.adult_count;
      const c = children ?? session.child_count;
      const s = seniors ?? session.senior_count;

      const coverEffective = session.override_cover_price > 0 ? session.override_cover_price : session.cover_price_snapshot;
      const estimated = a * Number(coverEffective) + c * Number(session.child_price_snapshot) + s * Number(session.senior_price_snapshot) + Number(session.waste_amount);

      // Update the TPV order with actual guest counts for billing
      if (session.order_id) {
        const [existingOrder] = await sql`SELECT * FROM orders WHERE id = ${session.order_id}`;
        if (existingOrder) {
          let items = existingOrder.items || [];
          items = items.filter(i => i.productId !== 'buffet_cover' && i.productId !== 'buffet_child' && i.productId !== 'buffet_senior');
          items.push({ id: 'cvr_' + Date.now(), productId: 'buffet_cover', name: `Buffet cubierto ${a} adulto${a !== 1 ? 's' : ''}`, price: Number(coverEffective), qty: a, sent: true, ready: true, sentAt: existingOrder.created_at, notes: '', modifiers: [], course: 'buffet' });
          if (c > 0) items.push({ id: 'cvr_' + Date.now() + '_1', productId: 'buffet_child', name: `Buffet ${c} niño${c !== 1 ? 's' : ''}`, price: Number(session.child_price_snapshot), qty: c, sent: true, ready: true, sentAt: existingOrder.created_at, notes: '', modifiers: [], course: 'buffet' });
          if (s > 0) items.push({ id: 'cvr_' + Date.now() + '_2', productId: 'buffet_senior', name: `Buffet ${s} mayor${s !== 1 ? 'es' : ''}`, price: Number(session.senior_price_snapshot), qty: s, sent: true, ready: true, sentAt: existingOrder.created_at, notes: '', modifiers: [], course: 'buffet' });
          if (Number(session.waste_amount) > 0) {
            items.push({ id: 'wst_' + Date.now(), productId: 'buffet_waste', name: 'Desperdicio buffet', price: Number(session.waste_amount), qty: 1, sent: true, ready: true, sentAt: Date.now(), notes: '', modifiers: [], course: 'buffet' });
          }
          await sql`UPDATE orders SET items = ${JSON.stringify(items)} WHERE id = ${session.order_id}`;
        }
      }

      await sql`
        UPDATE buffet_sessions
        SET status = 'closed', closed_at = ${Date.now()}, closed_by = ${employeeName || null},
          adult_count = ${a}, child_count = ${c}, senior_count = ${s},
          estimated_total = ${estimated}
        WHERE id = ${sessionId}
      `;

      await sql`UPDATE tables SET status = 'cuenta' WHERE id = ${session.table_id}`;

      return Response.json({ estimated });
    }

    // ===== VOID SESSION =====
    if (action === 'void') {
      const { sessionId, reason, employeeName } = body;

      const [session] = await sql`SELECT * FROM buffet_sessions WHERE id = ${sessionId}`;
      if (!session) return Response.json({ error: 'Sesión no encontrada' }, { status: 404 });

      await sql`
        UPDATE buffet_sessions
        SET status = 'voided', void_reason = ${reason || 'sin motivo'}, voided_by = ${employeeName || null},
          closed_at = ${Date.now()}
        WHERE id = ${sessionId}
      `;

      if (session.order_id) {
        await sql`DELETE FROM orders WHERE id = ${session.order_id}`;
      }
      await sql`UPDATE tables SET status = 'libre', order_id = NULL, order_ids = '[]' WHERE id = ${session.table_id}`;

      return Response.json({ ok: true });
    }

    // ===== ADJUST GUESTS =====
    if (action === 'adjust_guests') {
      const { sessionId, adults, children, seniors } = body;

      await sql`
        UPDATE buffet_sessions
        SET adult_count = ${adults}, child_count = ${children}, senior_count = ${seniors}
        WHERE id = ${sessionId}
      `;

      return Response.json({ ok: true });
    }

    // ===== OVERRIDE =====
    if (action === 'override') {
      const { sessionId, timeLimit, cooldown, roundCap, coverPrice } = body;

      await sql`
        UPDATE buffet_sessions
        SET override_time_limit = ${timeLimit || 0}, override_cooldown = ${cooldown || 0},
          override_round_cap = ${roundCap || 0}, override_cover_price = ${coverPrice || 0}
        WHERE id = ${sessionId}
      `;

      return Response.json({ ok: true });
    }

    // ===== ADD WASTE =====
    if (action === 'add_waste') {
      const { sessionId, tableId, productId, productName, charge, employeeId } = body;

      const id = 'bw_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

      await sql`
        INSERT INTO buffet_waste (id, session_id, table_id, product_id, product_name, charge, created_at, employee_id)
        VALUES (${id}, ${sessionId}, ${tableId}, ${productId}, ${productName}, ${charge}, ${Date.now()}, ${employeeId || null})
      `;

      await sql`
        UPDATE buffet_sessions SET waste_amount = waste_amount + ${charge} WHERE id = ${sessionId}
      `;

      return Response.json({ id });
    }

    // ===== BATCH ACTIONS =====
    if (action === 'batch') {
      const { batchAction, sessionIds, employeeName } = body;

      if (batchAction === 'close_all') {
        for (const sid of sessionIds) {
          const [s] = await sql`SELECT * FROM buffet_sessions WHERE id = ${sid}`;
          if (!s) continue;
          const coverEff = s.override_cover_price > 0 ? s.override_cover_price : s.cover_price_snapshot;
          const est = s.adult_count * Number(coverEff) + s.child_count * Number(s.child_price_snapshot) + s.senior_count * Number(s.senior_price_snapshot) + Number(s.waste_amount);
          if (s.order_id) {
            const [o] = await sql`SELECT * FROM orders WHERE id = ${s.order_id}`;
            if (o) {
              let items = o.items.filter(i => i.productId !== 'buffet_cover' && i.productId !== 'buffet_child' && i.productId !== 'buffet_senior');
              items.push({ id: 'cvr_' + Date.now(), productId: 'buffet_cover', name: `Buffet cubierto ${s.adult_count} adultos`, price: Number(coverEff), qty: s.adult_count, sent: true, ready: true, sentAt: o.created_at, notes: '', modifiers: [], course: 'buffet' });
              if (s.child_count > 0) items.push({ id: 'cvr_' + Date.now() + '_1', productId: 'buffet_child', name: `Buffet ${s.child_count} niños`, price: Number(s.child_price_snapshot), qty: s.child_count, sent: true, ready: true, sentAt: o.created_at, notes: '', modifiers: [], course: 'buffet' });
              if (s.senior_count > 0) items.push({ id: 'cvr_' + Date.now() + '_2', productId: 'buffet_senior', name: `Buffet ${s.senior_count} mayores`, price: Number(s.senior_price_snapshot), qty: s.senior_count, sent: true, ready: true, sentAt: o.created_at, notes: '', modifiers: [], course: 'buffet' });
              if (Number(s.waste_amount) > 0) items.push({ id: 'wst_' + Date.now(), productId: 'buffet_waste', name: 'Desperdicio buffet', price: Number(s.waste_amount), qty: 1, sent: true, ready: true, sentAt: Date.now(), notes: '', modifiers: [], course: 'buffet' });
              await sql`UPDATE orders SET items = ${JSON.stringify(items)} WHERE id = ${s.order_id}`;
            }
          }
          await sql`
            UPDATE buffet_sessions SET status = 'closed', closed_at = ${Date.now()},
              closed_by = ${employeeName || null}, estimated_total = ${est}
            WHERE id = ${sid}
          `;
          await sql`UPDATE tables SET status = 'cuenta' WHERE id = ${s.table_id}`;
        }
        return Response.json({ ok: true });
      }

      if (batchAction === 'reset_cooldown') {
        for (const sid of sessionIds) {
          await sql`UPDATE buffet_sessions SET cooldown_until = 0 WHERE id = ${sid}`;
        }
        return Response.json({ ok: true });
      }

      return Response.json({ error: 'Acción batch desconocida' }, { status: 400 });
    }

    // ===== CREATE ROUND (from QR or TPV) =====
    if (action === 'create_round') {
      const { tableId, items, employeeName } = body;

      const [session] = await sql`
        SELECT * FROM buffet_sessions WHERE table_id = ${tableId} AND status = 'active'
      `;
      if (!session) return Response.json({ error: 'Esta mesa no tiene una sesión de buffet activa' }, { status: 400 });

      const [cfg] = await sql`SELECT * FROM buffet_config WHERE id = 'default'`;

      if (cfg?.paused_until > Date.now()) {
        return Response.json({ error: 'El buffet está en pausa' }, { status: 400 });
      }

      if (session.cooldown_until > Date.now()) {
        const remaining = Math.ceil((session.cooldown_until - Date.now()) / 1000);
        return Response.json({ error: `Espera ${remaining}s antes de pedir otra ronda` }, { status: 400 });
      }

      const cap = session.override_round_cap > 0 ? session.override_round_cap : (cfg?.round_cap || 3);
      const totalPeople = session.adult_count + session.child_count + session.senior_count;
      const maxItems = cap * totalPeople;
      if (items.length > maxItems) {
        return Response.json({ error: `Máximo ${maxItems} items por ronda (${cap} × ${totalPeople} personas)` }, { status: 400 });
      }

      const roundId = 'br_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      const newRound = session.round + 1;
      const cooldownMin = session.override_cooldown > 0 ? session.override_cooldown : (cfg?.cooldown || 5);
      const cooldownUntil = Date.now() + cooldownMin * 60000;

      await sql`
        INSERT INTO buffet_rounds (id, session_id, round_number, items, item_count, requested_at, status)
        VALUES (${roundId}, ${session.id}, ${newRound}, ${JSON.stringify(items)}, ${items.length}, ${Date.now()}, 'pending')
      `;

      await sql`
        UPDATE buffet_sessions SET round = ${newRound}, cooldown_until = ${cooldownUntil}
        WHERE id = ${session.id}
      `;

      // Create a regular order so items appear in KDS
      const orderId = 'bo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      const orderItems = items.map(i => ({
        id: i.id || 'bi_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        productId: i.productId,
        name: i.name,
        price: 0,
        qty: i.qty || 1,
        sent: true,
        ready: false,
        sentAt: Date.now(),
        notes: i.notes || '',
        course: i.course || 'buffet',
        modifiers: i.modifiers || [],
        buffetRound: roundId,
      }));

      await sql`
        INSERT INTO orders (id, table_id, items, created_at, employee_name, source)
        VALUES (${orderId}, ${tableId}, ${JSON.stringify(orderItems)}, ${Date.now()}, ${employeeName || 'Buffet'}, 'buffet')
      `;

      return Response.json({ roundId, orderId, round: newRound, cooldownUntil });
    }

    // ===== DELIVER ROUND =====
    if (action === 'deliver_round') {
      const { roundId } = body;

      const [round] = await sql`SELECT * FROM buffet_rounds WHERE id = ${roundId}`;
      if (!round) return Response.json({ error: 'Ronda no encontrada' }, { status: 404 });

      await sql`UPDATE buffet_rounds SET status = 'delivered', delivered_at = ${Date.now()} WHERE id = ${roundId}`;

      return Response.json({ ok: true });
    }

    // ===== REMIND / CALL CUSTOMER =====
    if (action === 'call_customer') {
      const { sessionId } = body;
      const [session] = await sql`SELECT * FROM buffet_sessions WHERE id = ${sessionId}`;
      if (!session) return Response.json({ error: 'Sesión no encontrada' }, { status: 404 });

      const [qrOrder] = await sql`
        SELECT customer_name FROM qr_orders WHERE table_id = ${session.table_id} ORDER BY created_at DESC LIMIT 1
      `;

      return Response.json({ ok: true, customerName: qrOrder?.customer_name || null });
    }

    // ===== UPDATE CONFIG =====
    if (action === 'update_config') {
      const { enabled, timeLimit, cooldown, roundCap, coverPrice, childPrice, seniorPrice, childMaxAge, seniorMinAge, staffOpensTable } = body;

      await sql`
        UPDATE buffet_config SET
          enabled = ${enabled ?? false},
          time_limit = ${timeLimit ?? 90},
          cooldown = ${cooldown ?? 5},
          round_cap = ${roundCap ?? 3},
          cover_price = ${coverPrice ?? 25.00},
          child_price = ${childPrice ?? 12.50},
          senior_price = ${seniorPrice ?? 18.00},
          child_max_age = ${childMaxAge ?? 12},
          senior_min_age = ${seniorMinAge ?? 65},
          staff_opens_table = ${staffOpensTable ?? true},
          updated_at = ${Date.now()}
        WHERE id = 'default'
      `;

      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Acción desconocida' }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
