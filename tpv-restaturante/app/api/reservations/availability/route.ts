import { NextRequest, NextResponse } from 'next/server';
import { apiOk, apiError, apiBadRequest, apiTooManyRequests, apiUnauthorized } from '../../../../lib/infrastructure/response';
import { rateLimit, getClientIp } from '../../../../lib/rate-limit';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../../../../lib/drizzle';
import { getPublicTenantId } from '../../../../lib/tenant';
import { settings, tables, reservations } from '../../../../db/schema';

function parseJSON<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val) as T; } catch { return fallback; }
}

function addMinutes(timeStr: string, mins: number) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// SIN requireRole — endpoint público para la página de reservas online
// (app/reservar/page.jsx). Consulta disponibilidad de slots sin
// autenticación. Solo expone horarios libres, ningún dato del negocio.
// El tenant se valida contra ALLOWED_PUBLIC_TENANTS.
export async function GET(req: NextRequest) {
  const rl = await rateLimit(`avail:${getClientIp(req)}`, 60, 60_000);
  if (!rl.allowed) return apiTooManyRequests();
  try {
    const db = getDb();
    const tenantId = getPublicTenantId(req);
    if (!tenantId) return apiUnauthorized('tenant_no_autorizado');
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const pax = parseInt(searchParams.get('pax') || '2', 10);

    if (!date) return apiBadRequest('date required');

    const [settingsRows, tableRows, existingRows] = await Promise.all([
      db.select().from(settings).where(eq(settings.tenantId, tenantId)),
      db.select().from(tables).where(sql`${tables.type} IN ('mesa','barra') AND ${eq(tables.tenantId, tenantId)}`),
      db.select().from(reservations).where(sql`${eq(reservations.date, date)} AND ${sql.raw(`status NOT IN ('cancelada','noshow')`)} AND ${eq(reservations.tenantId, tenantId)}`),
    ]);
    const settingsRowsTyped: Array<typeof settings.$inferSelect> = settingsRows as Array<typeof settings.$inferSelect>;
    const tableRowsTyped: Array<typeof tables.$inferSelect> = tableRows as Array<typeof tables.$inferSelect>;
    const existingRowsTyped: Array<typeof reservations.$inferSelect> = existingRows as Array<typeof reservations.$inferSelect>;

    const settingsMap = Object.fromEntries(settingsRowsTyped.map((r) => [r.key, r.value]));

    const dur = Number(settingsMap.reservationDuration || 90);
    const interval = Number(settingsMap.reservationInterval || 30);
    const maxPax = Number(settingsMap.reservationMaxPax || 8);

    if (pax > maxPax) return apiBadRequest(`Máximo ${maxPax} comensales`);
    if (settingsMap.reservationOnline !== 'true') return NextResponse.json({ error: 'Reservas online no disponibles' }, { status: 503 });

    let openTime = '00:00', closeTime = '23:59';
    let isClosed = false;
    const scheduleType = settingsMap.reservationScheduleType;
    const closedDays = parseJSON<number[]>(settingsMap.reservationClosedDays, []);
    const dayOfWeek = new Date(date + 'T12:00').getDay();
    isClosed = closedDays.includes(dayOfWeek);

    if (!isClosed && scheduleType === 'advanced') {
      const shifts = parseJSON<Array<{ days?: number[]; open: string; close: string }>>(settingsMap.reservationShifts, []);
      const dayShifts = shifts.filter((s) => s.days?.includes(dayOfWeek));
      if (dayShifts.length > 0) {
        const opens = dayShifts.map((s) => s.open).sort();
        const closes = dayShifts.map((s) => s.close).sort().reverse();
        openTime = opens[0];
        closeTime = closes[0];
      }
    } else if (!isClosed) {
      openTime = settingsMap.reservationOpenTime || '13:00';
      closeTime = settingsMap.reservationCloseTime || '23:00';
    }

    const totalSeats = tableRowsTyped.reduce((s: number, t) => s + (t.seats || 4), 0);
    const existingPax = existingRowsTyped.reduce((s: number, r) => s + (r.pax || 0), 0);
    const availableSeats = Math.max(0, totalSeats - existingPax);

    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);
    let current = openH * 60 + openM;
    const close = closeH * 60 + closeM;
    const now = new Date();
    const today = new Date().toISOString().slice(0, 10);

    const blocked = parseJSON<Array<{ date: string }>>(settingsMap.reservationBlockedDates, []);
    const isBlocked = blocked.some((b) => b.date === date);

    const slots: Array<{ time: string; available: boolean; paxRemaining: number }> = [];
    while (current + dur <= close) {
      const h = Math.floor(current / 60);
      const m = current % 60;
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const slotEnd = current + dur;

      const slotDate = new Date(date + 'T' + timeStr);
      const isPast = slotDate < now && date === today;

      const overlapping = existingRowsTyped.filter((r) =>
        r.time < `${String(Math.floor(slotEnd / 60)).padStart(2, '0')}:${String(slotEnd % 60).padStart(2, '0')}` &&
        `${String(Math.floor(current / 60)).padStart(2, '0')}:${String(current % 60).padStart(2, '0')}` < addMinutes(r.time, dur)
      );
      const slotOccupied = overlapping.reduce((s: number, r) => s + (r.pax || 0), 0);
      const slotAvailable = availableSeats - slotOccupied;

      slots.push({ time: timeStr, available: slotAvailable >= pax && !isPast, paxRemaining: slotAvailable });
      current += interval;
    }

    return apiOk({ slots, date, pax, isClosed, isBlocked, totalSeats, existingPax, availableSeats, openTime, closeTime });
  } catch (err) { return apiError(err); }
}
