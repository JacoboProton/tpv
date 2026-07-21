import { NextRequest } from 'next/server';
import { eq, sql, desc } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { closures } from '../../../db/schema';
import { apiOk, apiError } from '../../../lib/infrastructure/response';

export async function GET(req: NextRequest) {
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
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const body = await req.json() as any;

    if (body.action === 'delete') {
      await db.delete(closures)
        .where(eq(closures.id, body.id));
      return apiOk();
    }

    await db.insert(closures).values({
      id: body.id, tenantId, date: body.date,
      total: body.total, ticketCount: body.ticket_count,
      avgTicket: body.avg_ticket,
      methods: body.methods,
      employees: body.employees,
      salesIds: body.sales_ids,
      closedAt: body.closed_at,
      employeeName: body.employee_name,
      cuadratura: body.cuadratura
        ? { denoms: body.cuadratura, expected: body.cuadratura_expected, counted: body.cuadratura_counted, diff: body.cuadratura_diff }
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
