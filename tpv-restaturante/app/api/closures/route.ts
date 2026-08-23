import { NextRequest } from 'next/server';
import { eq, sql, desc } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { closures } from '../../../db/schema';
import { apiOk, apiError, apiBadRequest } from '../../../lib/infrastructure/response';
import { ClosureBody } from '@/lib/schemas/api-schemas';
import { requireRole } from '../../../lib/rbac';

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const rows = await db.select().from(closures)
      .where(eq(closures.tenantId, tenantId))
      .orderBy(desc(closures.closedAt));
    return apiOk(rows);
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const parsed = ClosureBody.safeParse(await req.json());
    if (!parsed.success) return apiBadRequest(parsed.error.message);
    const b = parsed.data as {
      action: string; id?: string; date?: string; total?: string | number;
      ticket_count?: number; avg_ticket?: string | number; methods?: unknown;
      employees?: unknown; sales_ids?: string[]; closed_at?: number;
      employee_name?: string; cuadratura?: unknown; cuadratura_expected?: unknown;
      cuadratura_counted?: unknown; cuadratura_diff?: unknown; openingFloat?: number;
    };

    if (b.action === 'delete') {
      if (!b.id) return apiBadRequest('id is required for delete');
      await db.delete(closures)
        .where(eq(closures.id, b.id));
      return apiOk();
    }

    await db.insert(closures).values({
      id: b.id!, tenantId, date: b.date ?? '',
      total: String(b.total ?? 0), ticketCount: Number(b.ticket_count ?? 0),
      avgTicket: String(b.avg_ticket ?? 0),
      methods: b.methods ?? [],
      employees: b.employees ?? [],
      salesIds: b.sales_ids ?? [''],
      closedAt: Number(b.closed_at ?? Date.now()),
      employeeName: b.employee_name ?? '',
      cuadratura: b.cuadratura
        ? { denoms: b.cuadratura, expected: b.cuadratura_expected, counted: b.cuadratura_counted, diff: b.cuadratura_diff, openingFloat: Number(b.openingFloat ?? 0) }
        : [],
    }).onConflictDoUpdate({
      target: [closures.id, closures.tenantId],
      set: {
        total: sql`EXCLUDED.total`,
        ticketCount: sql`EXCLUDED.ticket_count`,
        avgTicket: sql`EXCLUDED.avg_ticket`,
        methods: sql`EXCLUDED.methods`,
        employees: sql`EXCLUDED.employees`,
        salesIds: sql`EXCLUDED.sales_ids`,
        closedAt: sql`EXCLUDED.closed_at`,
        employeeName: sql`EXCLUDED.employee_name`,
        cuadratura: sql`EXCLUDED.cuadratura`,
      },
    });
    return apiOk();
  } catch (e) { return apiError(e); }
}
