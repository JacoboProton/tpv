import { sql } from './db';

export async function runMigrations() {
  await sql`CREATE TABLE IF NOT EXISTS categories (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE)`;

  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL,
      price NUMERIC(10,2) NOT NULL, stock INTEGER NOT NULL DEFAULT 0,
      low_stock INTEGER NOT NULL DEFAULT 5, ubicacion TEXT NOT NULL DEFAULT 'Bar'
    )
  `;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS ubicacion TEXT NOT NULL DEFAULT 'Bar'`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS discount NUMERIC(5,2) NOT NULL DEFAULT 0`;

  await sql`
    CREATE TABLE IF NOT EXISTS tables (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'libre',
      order_id TEXT, reserved JSONB, is_fiado BOOLEAN NOT NULL DEFAULT false,
      type TEXT NOT NULL DEFAULT 'mesa'
    )
  `;
  await sql`ALTER TABLE tables ADD COLUMN IF NOT EXISTS order_id TEXT`;
  await sql`ALTER TABLE tables ADD COLUMN IF NOT EXISTS reserved JSONB`;
  await sql`ALTER TABLE tables ADD COLUMN IF NOT EXISTS is_fiado BOOLEAN NOT NULL DEFAULT false`;
  await sql`ALTER TABLE tables ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'mesa'`;

  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY, table_id TEXT NOT NULL, items JSONB NOT NULL DEFAULT '[]',
      created_at BIGINT NOT NULL, employee_name TEXT
    )
  `;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_id TEXT`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_at BIGINT`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS employee_name TEXT`;

  await sql`
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY, table_id TEXT, table_name TEXT, items JSONB NOT NULL DEFAULT '[]',
      subtotal NUMERIC(10,2), discount NUMERIC(5,2) DEFAULT 0,
      discount_amount NUMERIC(10,2) DEFAULT 0, total NUMERIC(10,2),
      tip NUMERIC(10,2) DEFAULT 0, total_with_tip NUMERIC(10,2),
      payments JSONB NOT NULL DEFAULT '[]', payment_method TEXT,
      is_fiado BOOLEAN DEFAULT false, is_debt_payment BOOLEAN DEFAULT false,
      employee_id TEXT, employee_name TEXT, closed_at BIGINT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, pin TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'camarero'
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS access_logs (
      id SERIAL PRIMARY KEY, employee_id TEXT NOT NULL, employee_name TEXT NOT NULL,
      role TEXT NOT NULL, entry_point TEXT NOT NULL, logged_at BIGINT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS verifactu_registros (
      id SERIAL PRIMARY KEY, sale_id TEXT NOT NULL UNIQUE, num_serie TEXT NOT NULL UNIQUE,
      fecha_expedicion TEXT NOT NULL, importe_total NUMERIC(10,2) NOT NULL,
      base_imponible NUMERIC(10,2) NOT NULL, cuota_iva NUMERIC(10,2) NOT NULL,
      huella_anterior TEXT NOT NULL DEFAULT '0', huella TEXT NOT NULL,
      xml_registro TEXT NOT NULL, qr_url TEXT NOT NULL, estado TEXT NOT NULL DEFAULT 'pendiente',
      created_at BIGINT NOT NULL
    )
  `;
  await sql`ALTER TABLE verifactu_registros ADD COLUMN IF NOT EXISTS fiskaly_invoice_id TEXT`;
  await sql`ALTER TABLE verifactu_registros ADD COLUMN IF NOT EXISTS verification_url TEXT`;

  await sql`
    CREATE TABLE IF NOT EXISTS fiskaly_config (
      key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at BIGINT NOT NULL DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS stock_log (
      id SERIAL PRIMARY KEY, product_id TEXT NOT NULL, product_name TEXT NOT NULL,
      old_stock INTEGER NOT NULL, new_stock INTEGER NOT NULL,
      change_amount INTEGER NOT NULL, reason TEXT NOT NULL,
      employee_name TEXT, created_at BIGINT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS cancelled_orders (
      id SERIAL PRIMARY KEY, order_id TEXT, table_id TEXT, table_name TEXT,
      items JSONB NOT NULL DEFAULT '[]', total NUMERIC(10,2),
      employee_name TEXT, reason TEXT, cancelled_at BIGINT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS employee_turns (
      id SERIAL PRIMARY KEY, employee_id TEXT NOT NULL, employee_name TEXT NOT NULL,
      action TEXT NOT NULL, turn_date TEXT NOT NULL, time BIGINT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS modifier_groups (
      id TEXT PRIMARY KEY, name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'single',
      required BOOLEAN NOT NULL DEFAULT false
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS modifier_options (
      id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
      name TEXT NOT NULL, price_delta NUMERIC(10,2) NOT NULL DEFAULT 0,
      is_default BOOLEAN NOT NULL DEFAULT false, sort_order INTEGER NOT NULL DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS product_modifiers (
      product_id TEXT NOT NULL, group_id TEXT NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
      PRIMARY KEY (product_id, group_id)
    )
  `;

  const mgCount = await sql`SELECT COUNT(*) as cnt FROM modifier_groups`;
  if (mgCount[0].cnt === '0' || mgCount[0].cnt === 0) {
    const { seedModifierGroups, DEFAULT_PRODUCT_MODIFIERS } = await import('./modifiers.js');
    const groups = seedModifierGroups();
    for (const g of groups) {
      await sql`
        INSERT INTO modifier_groups (id, name, type, required)
        VALUES (${g.id}, ${g.name}, ${g.type}, ${g.required})
        ON CONFLICT (id) DO NOTHING
      `;
      for (let i = 0; i < g.options.length; i++) {
        const o = g.options[i];
        await sql`
          INSERT INTO modifier_options (id, group_id, name, price_delta, is_default, sort_order)
          VALUES (${o.id}, ${g.id}, ${o.name}, ${o.priceDelta}, ${o.isDefault}, ${i})
          ON CONFLICT (id) DO NOTHING
        `;
      }
    }
    for (const [pid, gids] of Object.entries(DEFAULT_PRODUCT_MODIFIERS)) {
      for (const gid of gids) {
        await sql`
          INSERT INTO product_modifiers (product_id, group_id)
          VALUES (${pid}, ${gid})
          ON CONFLICT DO NOTHING
        `;
      }
    }
  }

  return { ok: true };
}

export async function logStock({ productId, productName, oldStock, newStock, reason, employeeName }) {
  await sql`
    INSERT INTO stock_log (product_id, product_name, old_stock, new_stock, change_amount, reason, employee_name, created_at)
    VALUES (${productId}, ${productName}, ${oldStock}, ${newStock}, ${newStock - oldStock}, ${reason}, ${employeeName ?? null}, ${Date.now()})
  `;
}

export async function logCancelled(order, tableName, employeeName, reason) {
  await sql`
    INSERT INTO cancelled_orders (order_id, table_id, table_name, items, total, employee_name, reason, cancelled_at)
    VALUES (${order.id}, ${order.tableId}, ${tableName}, ${JSON.stringify(order.items)},
      ${order.items.reduce((s, i) => s + i.price * i.qty, 0)},
      ${employeeName ?? null}, ${reason ?? 'cancelación manual'}, ${Date.now()})
  `;
}

export async function logTurn({ employeeId, employeeName, action, turnDate }) {
  await sql`
    INSERT INTO employee_turns (employee_id, employee_name, action, turn_date, time)
    VALUES (${employeeId}, ${employeeName}, ${action}, ${turnDate}, ${Date.now()})
  `;
}

export async function fetchCancelledOrders(limit = 50) {
  return sql`
    SELECT * FROM cancelled_orders ORDER BY cancelled_at DESC LIMIT ${limit}
  `;
}

export async function fetchStockLog(limit = 100) {
  return sql`
    SELECT * FROM stock_log ORDER BY created_at DESC LIMIT ${limit}
  `;
}

export async function fetchTurns(employeeId, turnDate) {
  if (employeeId) {
    return sql`
      SELECT * FROM employee_turns WHERE employee_id = ${employeeId} AND turn_date = ${turnDate} ORDER BY time
    `;
  }
  return sql`
    SELECT * FROM employee_turns WHERE turn_date = ${turnDate} ORDER BY time
  `;
}

export async function backupAll() {
  const [categories, products, tables, orders, sales, employees, accessLogs, stockLog, cancelledOrders] = await Promise.all([
    sql`SELECT * FROM categories`,
    sql`SELECT * FROM products`,
    sql`SELECT * FROM tables`,
    sql`SELECT * FROM orders`,
    sql`SELECT * FROM sales`,
    sql`SELECT * FROM employees`,
    sql`SELECT * FROM access_logs ORDER BY id`,
    sql`SELECT * FROM stock_log ORDER BY id`,
    sql`SELECT * FROM cancelled_orders ORDER BY id`,
  ]);
  return {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    data: { categories, products, tables, orders, sales, employees, accessLogs, stockLog, cancelledOrders },
  };
}
