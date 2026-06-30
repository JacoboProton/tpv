import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

function parseJSON(val, fallback) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

function addMinutes(timeStr, mins) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const pax = parseInt(searchParams.get('pax') || '2', 10);

    if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });

    const [settingsRows, tables, existing] = await Promise.all([
      sql`SELECT key, value FROM settings`,
      sql`SELECT id, name, seats, type FROM tables WHERE type IN ('mesa','barra')`,
      sql`SELECT * FROM reservations WHERE date = ${date} AND status NOT IN ('cancelada','noshow')`,
    ]);

    const settings = Object.fromEntries(settingsRows.map(r => [r.key, r.value]));

    const dur = Number(settings.reservationDuration || 90);
    const interval = Number(settings.reservationInterval || 30);
    const maxPax = Number(settings.reservationMaxPax || 8);

    if (pax > maxPax) return NextResponse.json({ error: `Máximo ${maxPax} comensales` }, { status: 400 });

    if (settings.reservationOnline !== 'true') return NextResponse.json({ error: 'Reservas online no disponibles' }, { status: 503 });

    let openTime = '00:00', closeTime = '23:59';
    let isClosed = false;
    const scheduleType = settings.reservationScheduleType;
    const closedDays = parseJSON(settings.reservationClosedDays, []);
    const dayOfWeek = new Date(date + 'T12:00').getDay();
    isClosed = closedDays.includes(dayOfWeek);

    if (!isClosed && scheduleType === 'advanced') {
      const shifts = parseJSON(settings.reservationShifts, []);
      const dayShifts = shifts.filter(s => s.days?.includes(dayOfWeek));
      if (dayShifts.length > 0) {
        const opens = dayShifts.map(s => s.open).sort();
        const closes = dayShifts.map(s => s.close).sort().reverse();
        openTime = opens[0];
        closeTime = closes[0];
      }
    } else if (!isClosed) {
      openTime = settings.reservationOpenTime || '13:00';
      closeTime = settings.reservationCloseTime || '23:00';
    }

    const totalSeats = tables.reduce((s, t) => s + (t.seats || 4), 0);
    const existingPax = existing.reduce((s, r) => s + (r.pax || 0), 0);
    const availableSeats = Math.max(0, totalSeats - existingPax);

    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);
    let current = openH * 60 + openM;
    const close = closeH * 60 + closeM;
    const now = new Date();
    const today = new Date().toISOString().slice(0, 10);

    const blocked = parseJSON(settings.reservationBlockedDates, []);
    const isBlocked = blocked.some(b => b.date === date);

    const slots = [];

    while (current + dur <= close) {
      const h = Math.floor(current / 60);
      const m = current % 60;
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const slotEnd = current + dur;

      const slotDate = new Date(date + 'T' + timeStr);
      const isPast = slotDate < now && date === today;

      const overlapping = existing.filter(r =>
        r.time < `${String(Math.floor(slotEnd / 60)).padStart(2, '0')}:${String(slotEnd % 60).padStart(2, '0')}` &&
        `${String(Math.floor(current / 60)).padStart(2, '0')}:${String(current % 60).padStart(2, '0')}` < addMinutes(r.time, dur)
      );
      const slotOccupied = overlapping.reduce((s, r) => s + (r.pax || 0), 0);
      const slotAvailable = availableSeats - slotOccupied;

      slots.push({
        time: timeStr,
        available: slotAvailable >= pax && !isPast,
        paxRemaining: slotAvailable,
      });

      current += interval;
    }

    return NextResponse.json({ slots, date, pax, isClosed, isBlocked, totalSeats, existingPax, availableSeats, openTime, closeTime });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
