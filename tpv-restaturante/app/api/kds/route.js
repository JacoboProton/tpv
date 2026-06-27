import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

function makeId() { return 'k_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// GET — list pairings or check device
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId');

    if (deviceId) {
      const rows = await sql`
        SELECT id, label, device_id, created_at, revoked FROM kds_pairings
        WHERE device_id = ${deviceId} AND revoked = false
        LIMIT 1
      `;
      if (rows.length > 0) {
        return NextResponse.json({ paired: true, pairing: rows[0] });
      }
      return NextResponse.json({ paired: false });
    }

    const rows = await sql`SELECT * FROM kds_pairings ORDER BY created_at DESC`;
    return NextResponse.json(rows.map(r => ({
      id: r.id, code: r.code, label: r.label, deviceId: r.device_id,
      expiresAt: r.expires_at, createdAt: r.created_at, revoked: r.revoked,
    })));
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — generate code or verify code
export async function POST(req) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'generate') {
      const code = generateCode();
      const id = makeId();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
      await sql`
        INSERT INTO kds_pairings (id, code, label, device_id, expires_at, created_at, revoked)
        VALUES (${id}, ${code}, ${body.label || ''}, '', ${expiresAt}, ${Date.now()}, false)
      `;
      return NextResponse.json({ ok: true, id, code, expiresAt });
    }

    if (action === 'verify') {
      const { code, label, deviceId } = body;
      const rows = await sql`
        SELECT * FROM kds_pairings WHERE code = ${code} AND revoked = false AND expires_at > ${Date.now()}
        LIMIT 1
      `;
      if (rows.length === 0) {
        return NextResponse.json({ ok: false, error: 'Código inválido o caducado' }, { status: 400 });
      }
      const pairing = rows[0];
      const devId = deviceId || makeId() + '_dev';
      await sql`
        UPDATE kds_pairings SET device_id = ${devId}, label = ${label || pairing.label}
        WHERE id = ${pairing.id}
      `;
      return NextResponse.json({ ok: true, deviceId: devId, pairing: { id: pairing.id, label: label || pairing.label } });
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — revoke a pairing
export async function DELETE(req) {
  try {
    const body = await req.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await sql`UPDATE kds_pairings SET revoked = true WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
