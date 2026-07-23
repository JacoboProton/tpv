import { NextRequest } from 'next/server';
import { apiOk, apiError, apiBadRequest, apiNotFound, apiUnauthorized, apiForbidden, apiTooManyRequests, apiCreated, apiServerError } from '../../../lib/infrastructure/response';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { mealMenus, mealMenuCourses, mealMenuCourseItems, mealMenuSchedules, products } from '../../../db/schema';
import { requireRole } from '../../../lib/rbac';

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const menus = await db.select().from(mealMenus)
      .where(eq(mealMenus.tenantId, tenantId))
      .orderBy(mealMenus.name);
    const courses = await db.select().from(mealMenuCourses)
      .where(eq(mealMenuCourses.tenantId, tenantId))
      .orderBy(mealMenuCourses.sortOrder);
    const items = await db.execute(sql`
      SELECT mmci.id, mmci.course_id, mmci.product_id, mmci.surcharge::float AS surcharge, mmci.sort_order,
        p.name AS product_name, p.price::float AS product_price
      FROM meal_menu_course_items mmci
      JOIN products p ON p.id = mmci.product_id
      WHERE mmci.tenant_id = ${tenantId}
      ORDER BY mmci.sort_order
    `).then((r: any) => r.rows as any[]);
    const schedules = await db.select().from(mealMenuSchedules)
      .where(eq(mealMenuSchedules.tenantId, tenantId))
      .orderBy(mealMenuSchedules.dayOfWeek, mealMenuSchedules.startTime);

    const itemsByCourse: Record<string, any> = {};
    for (const item of items) {
      if (!itemsByCourse[item.course_id]) itemsByCourse[item.course_id] = [];
      itemsByCourse[item.course_id].push(item);
    }
    const coursesByMenu: Record<string, any> = {};
    for (const c of courses) {
      if (!coursesByMenu[c.menuId]) coursesByMenu[c.menuId] = [];
      coursesByMenu[c.menuId].push({ ...c, items: itemsByCourse[c.id] || [] });
    }
    const schedulesByMenu: Record<string, any> = {};
    for (const s of schedules) {
      if (!schedulesByMenu[s.menuId]) schedulesByMenu[s.menuId] = [];
      schedulesByMenu[s.menuId].push(s);
    }

    const data = menus.map((m: any) => ({
      ...m,
      active: !!m.active,
      includesPan: !!m.includesPan,
      includesBebida: !!m.includesBebida,
      includesCafe: !!m.includesCafe,
      extras: typeof m.extras === 'string' ? JSON.parse(m.extras as string) : (m.extras || []),
      courses: coursesByMenu[m.id] || [],
      schedules: schedulesByMenu[m.id] || [],
    }));

    return apiOk(data.map(({ tenantId: _t, ...rest }: any) => rest));
  } catch (err) { return apiError(err); }
}

export async function PUT(req: NextRequest) {
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);

  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const menus = await req.json();
    await db.execute(sql`DELETE FROM meal_menu_course_items WHERE tenant_id = ${tenantId}`);
    await db.execute(sql`DELETE FROM meal_menu_courses WHERE tenant_id = ${tenantId}`);
    await db.execute(sql`DELETE FROM meal_menu_schedules WHERE tenant_id = ${tenantId}`);
    await db.execute(sql`DELETE FROM meal_menus WHERE tenant_id = ${tenantId}`);

    for (const m of menus) {
      await db.insert(mealMenus).values({
        id: m.id, name: m.name, description: m.description || '',
        price: m.price, image: m.image || null,
        includesPan: m.includesPan ?? false, includesBebida: m.includesBebida ?? false,
        includesCafe: m.includesCafe ?? false,
        active: m.active ?? true, createdAt: Date.now(),
        extras: JSON.stringify(m.extras || []), tenantId,
      });
      if (m.courses) {
        for (let ci = 0; ci < m.courses.length; ci++) {
          const course = m.courses[ci];
          await db.insert(mealMenuCourses).values({
            id: course.id, menuId: m.id, name: course.name,
            sortOrder: ci, tenantId,
          });
          if (course.items) {
            for (let ii = 0; ii < course.items.length; ii++) {
              const item = course.items[ii];
              await db.insert(mealMenuCourseItems).values({
                id: item.id, courseId: course.id, productId: item.product_id,
                surcharge: item.surcharge ?? 0, sortOrder: ii, tenantId,
              });
            }
          }
        }
      }
      if (m.schedules) {
        for (const s of m.schedules) {
          await db.insert(mealMenuSchedules).values({
            id: s.id, menuId: m.id, dayOfWeek: s.day_of_week,
            startTime: s.start_time, endTime: s.end_time, tenantId,
          });
        }
      }
    }

    return apiOk();
  } catch (err) { return apiError(err); }
}
