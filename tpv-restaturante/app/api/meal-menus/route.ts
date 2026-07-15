import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const menus = await sql`SELECT * FROM meal_menus WHERE tenant_id = ${tenantId} ORDER BY name`;
    const courses = await sql`SELECT * FROM meal_menu_courses WHERE tenant_id = ${tenantId} ORDER BY sort_order`;
    const items = await sql`
      SELECT mmci.id, mmci.course_id, mmci.product_id, mmci.surcharge::float AS surcharge, mmci.sort_order,
        p.name AS product_name, p.price::float AS product_price
      FROM meal_menu_course_items mmci
      JOIN products p ON p.id = mmci.product_id
      WHERE mmci.tenant_id = ${tenantId}
      ORDER BY mmci.sort_order
    `;
    const schedules = await sql`SELECT * FROM meal_menu_schedules WHERE tenant_id = ${tenantId} ORDER BY day_of_week, start_time`;

    const itemsByCourse: Record<string, any> = {};
    for (const item of items) {
      if (!itemsByCourse[item.course_id]) itemsByCourse[item.course_id] = [];
      itemsByCourse[item.course_id].push(item);
    }
    const coursesByMenu: Record<string, any> = {};
    for (const c of courses) {
      if (!coursesByMenu[c.menu_id]) coursesByMenu[c.menu_id] = [];
      coursesByMenu[c.menu_id].push({ ...c, items: itemsByCourse[c.id] || [] });
    }
    const schedulesByMenu: Record<string, any> = {};
    for (const s of schedules) {
      if (!schedulesByMenu[s.menu_id]) schedulesByMenu[s.menu_id] = [];
      schedulesByMenu[s.menu_id].push(s);
    }

    const data = menus.map(m => ({
      ...m,
      active: !!m.active,
      includes_pan: !!m.includes_pan,
      includes_bebida: !!m.includes_bebida,
      includes_cafe: !!m.includes_cafe,
      extras: typeof m.extras === 'string' ? JSON.parse(m.extras) : (m.extras || []),
      courses: coursesByMenu[m.id] || [],
      schedules: schedulesByMenu[m.id] || [],
    }));
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const menus = await req.json();
    await sql`DELETE FROM meal_menu_course_items WHERE tenant_id = ${tenantId}`;
    await sql`DELETE FROM meal_menu_courses WHERE tenant_id = ${tenantId}`;
    await sql`DELETE FROM meal_menu_schedules WHERE tenant_id = ${tenantId}`;
    await sql`DELETE FROM meal_menus WHERE tenant_id = ${tenantId}`;

    for (const m of menus) {
      await sql`
        INSERT INTO meal_menus (id, name, description, price, image, includes_pan, includes_bebida, includes_cafe, active, created_at, extras, tenant_id)
        VALUES (${m.id}, ${m.name}, ${m.description || ''}, ${m.price}, ${m.image || null},
          ${m.includes_pan ?? false}, ${m.includes_bebida ?? false}, ${m.includes_cafe ?? false},
          ${m.active ?? true}, ${Date.now()}, ${JSON.stringify(m.extras || [])}, ${tenantId})
      `;
      if (m.courses) {
        for (let ci = 0; ci < m.courses.length; ci++) {
          const course = m.courses[ci];
          await sql`
            INSERT INTO meal_menu_courses (id, menu_id, name, sort_order, tenant_id)
            VALUES (${course.id}, ${m.id}, ${course.name}, ${ci}, ${tenantId})
          `;
          if (course.items) {
            for (let ii = 0; ii < course.items.length; ii++) {
              const item = course.items[ii];
              await sql`
                INSERT INTO meal_menu_course_items (id, course_id, product_id, surcharge, sort_order, tenant_id)
                VALUES (${item.id}, ${course.id}, ${item.product_id}, ${item.surcharge ?? 0}, ${ii}, ${tenantId})
              `;
            }
          }
        }
      }
      if (m.schedules) {
        for (const s of m.schedules) {
          await sql`
            INSERT INTO meal_menu_schedules (id, menu_id, day_of_week, start_time, end_time, tenant_id)
            VALUES (${s.id}, ${m.id}, ${s.day_of_week}, ${s.start_time}, ${s.end_time}, ${tenantId})
          `;
        }
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
