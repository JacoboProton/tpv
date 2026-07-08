import { sql } from './db';
import { formatHora } from './verifactu';

export async function runMigrations() {
  // ===== MULTI-TENANT =====
  await sql`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      logo_url TEXT DEFAULT '',
      address TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      nif TEXT DEFAULT '',
      active BOOLEAN NOT NULL DEFAULT true,
      config JSONB DEFAULT '{}',
      created_at BIGINT NOT NULL
    )
  `;
  // Seed default tenant
  await sql`INSERT INTO tenants (id, name, slug, created_at) VALUES ('default', 'La Comanda', 'default', ${Date.now()})
    ON CONFLICT (id) DO NOTHING`;

  // Add tenant_id to all core tables (idempotent)
  const coreTables = [
    'products', 'categories', 'tables', 'orders', 'sales', 'employees',
    'offers', 'combos', 'meal_menus', 'settings',
    'delivery_orders', 'delivery_runners', 'delivery_zones',
    'stock_log', 'cancelled_orders', 'employee_turns',
    'access_logs', 'verifactu_registros',
    'qr_orders', 'reservations', 'waitlist',
    'purchase_orders', 'albaranes', 'suppliers',
    'supplier_catalog', 'productions', 'recipes',
    'buffet_sessions', 'buffet_config',
    'clockin_logs', 'employee_shifts', 'modifier_groups',
    'combo_slots', 'combo_slot_items', 'combo_items',
    'product_price_rules', 'product_stock',
    'purchase_order_lines', 'albaran_lines',
    'production_ingredients', 'recipe_ingredients',
    'employees', 'tables', 'orders', 'products', 'categories', 'offers', 'combos',
  ];
  for (const table of coreTables) {
    try { await sql`ALTER TABLE "${sql.unsafe(table)}" ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default'`; } catch (e) { console.warn('tenant_id skip:', table, e.message); }
    try { await sql`CREATE INDEX IF NOT EXISTS ${sql.unsafe('idx_' + table + '_tenant')} ON "${sql.unsafe(table)}"(tenant_id)`; } catch {}
  }

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
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS course TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS image TEXT`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS allergens TEXT[] DEFAULT '{}'`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS show_tpv BOOLEAN DEFAULT true`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS show_qr BOOLEAN DEFAULT true`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS agotado BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS carousel_sort INTEGER`;

  await sql`ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0`;
  await sql`ALTER TABLE categories ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true`;
  await sql`ALTER TABLE categories ADD COLUMN IF NOT EXISTS printer_zone TEXT DEFAULT ''`;
  await sql`ALTER TABLE categories ADD COLUMN IF NOT EXISTS show_qr BOOLEAN DEFAULT true`;

  await sql`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`;
  try {
    for (const [k, v] of Object.entries({
      restaurantName: 'LA COMANDA', companyCif: '78406450W', companyAddress: '', companyPhone: '', logoUrl: '', footerText: 'Gracias por su visita', ticketWidth: '80mm',
      personalDiscountRates: JSON.stringify({ 'Tapas': 50, 'Principales': 50, 'Postres': 50, 'Bebidas': 20 }),
      drawerOpenPolicy: 'confirm',
    })) {
      await sql`INSERT INTO settings (key, value) VALUES (${k}, ${v}) ON CONFLICT (key) DO NOTHING`;
    }
  } catch (e) { console.warn('settings seed skip:', e.message); }

  await sql`
    CREATE TABLE IF NOT EXISTS offers (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'menu',
      days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',
      start_hour INTEGER NOT NULL DEFAULT 13, end_hour INTEGER NOT NULL DEFAULT 16,
      discount_pct NUMERIC(5,2) NOT NULL DEFAULT 15,
      product_ids TEXT[] NOT NULL DEFAULT '{}',
      active BOOLEAN NOT NULL DEFAULT true
    )
  `;
  try {
    await sql`INSERT INTO offers (id, name, type, days, start_hour, end_hour, discount_pct, product_ids)
      VALUES ('offer_menu', 'Menú del día (laborables)', 'menu', '{1,2,3,4,5}', 13, 16, 15, '{p12,p14}')
      ON CONFLICT (id) DO NOTHING`;
  } catch (e) { console.warn('offers seed skip:', e.message); }

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
  await sql`ALTER TABLE tables ADD COLUMN IF NOT EXISTS pos_x INTEGER DEFAULT 100`;
  await sql`ALTER TABLE tables ADD COLUMN IF NOT EXISTS pos_y INTEGER DEFAULT 100`;
  await sql`ALTER TABLE tables ADD COLUMN IF NOT EXISTS table_width INTEGER DEFAULT 80`;
  await sql`ALTER TABLE tables ADD COLUMN IF NOT EXISTS table_height INTEGER DEFAULT 80`;
  await sql`ALTER TABLE tables ADD COLUMN IF NOT EXISTS table_radius INTEGER DEFAULT 40`;
  await sql`ALTER TABLE tables ADD COLUMN IF NOT EXISTS table_shape TEXT DEFAULT 'rect'`;
  await sql`ALTER TABLE tables ADD COLUMN IF NOT EXISTS rotation INTEGER DEFAULT 0`;
  await sql`ALTER TABLE tables ADD COLUMN IF NOT EXISTS seats INTEGER DEFAULT 4`;
  await sql`ALTER TABLE tables ADD COLUMN IF NOT EXISTS zone TEXT DEFAULT ''`;
  await sql`ALTER TABLE tables ADD COLUMN IF NOT EXISTS layer INTEGER DEFAULT 0`;
  await sql`ALTER TABLE tables ADD COLUMN IF NOT EXISTS table_color TEXT DEFAULT ''`;
  await sql`ALTER TABLE tables ADD COLUMN IF NOT EXISTS order_ids JSONB DEFAULT '[]'`;

  await sql`
    CREATE TABLE IF NOT EXISTS floor_plan (
      id INTEGER PRIMARY KEY DEFAULT 1,
      zones JSONB DEFAULT '[]',
      background JSONB DEFAULT null,
      CHECK (id = 1)
    )
  `;
  await sql`INSERT INTO floor_plan (id, zones, background) VALUES (1, '[]', null) ON CONFLICT (id) DO NOTHING`;

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
  await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS personal_discount_enabled BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS monthly_limit NUMERIC(10,2) DEFAULT 0`;
  await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS monthly_used NUMERIC(10,2) DEFAULT 0`;
  await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS monthly_used_month TEXT DEFAULT ''`;

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
  // Fecha/hora exacta con la que se firmó el registro (entra en el hash SHA-256).
  // Es imprescindible persistirla para poder verificar la cadena, ya que recalcularla
  // a partir de closed_at da un valor distinto (la firma ocurre después del cierre).
  await sql`ALTER TABLE verifactu_registros ADD COLUMN IF NOT EXISTS fecha_hora_firma TEXT`;

  await sql`ALTER TABLE verifactu_registros ADD COLUMN IF NOT EXISTS payment_intent_id TEXT`;

  // Backfill registros viejos sin fecha_hora_firma
  const sinFirma = await sql`
    SELECT id, fecha_expedicion, created_at FROM verifactu_registros WHERE fecha_hora_firma IS NULL
  `;
  for (const r of sinFirma) {
    const fechaHoraFirma = `${r.fecha_expedicion}T${formatHora(Number(r.created_at))}`;
    await sql`UPDATE verifactu_registros SET fecha_hora_firma = ${fechaHoraFirma} WHERE id = ${r.id}`;
  }
  if (sinFirma.length > 0) {
    console.log(`Backfilled fecha_hora_firma for ${sinFirma.length} records`);
  }

  await sql`
    CREATE TABLE IF NOT EXISTS payment_logs (
      id SERIAL PRIMARY KEY,
      event_id TEXT,
      payment_intent_id TEXT,
      operation TEXT NOT NULL,
      amount_cents INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'eur',
      status TEXT NOT NULL DEFAULT 'ok',
      table_id TEXT,
      table_name TEXT,
      employee_name TEXT,
      source TEXT,
      error TEXT,
      stripe_response TEXT,
      created_at BIGINT NOT NULL
    )
  `;

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
      reference TEXT DEFAULT '',
      employee_name TEXT, created_at BIGINT NOT NULL
    )
  `;
  await sql`ALTER TABLE stock_log ADD COLUMN IF NOT EXISTS reference TEXT DEFAULT ''`;

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
  await sql`ALTER TABLE modifier_options ADD COLUMN IF NOT EXISTS stock_deduct BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE modifier_options ADD COLUMN IF NOT EXISTS stock_article_id TEXT DEFAULT ''`;
  await sql`ALTER TABLE modifier_options ADD COLUMN IF NOT EXISTS stock_quantity NUMERIC(10,4) DEFAULT 0`;

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

  // ===== BACKUPS =====
  await sql`
    CREATE TABLE IF NOT EXISTS backups (
      id TEXT PRIMARY KEY, data JSONB NOT NULL, created_at BIGINT NOT NULL
    )
  `;

  // ===== DELIVERY =====
  await sql`
    CREATE TABLE IF NOT EXISTS delivery_runners (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '',
      active BOOLEAN NOT NULL DEFAULT true, created_at BIGINT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS delivery_orders (
      id TEXT PRIMARY KEY, order_id TEXT, table_id TEXT,
      customer_name TEXT NOT NULL, customer_phone TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL, address_lat NUMERIC(10,7), address_lng NUMERIC(10,7),
      notes TEXT NOT NULL DEFAULT '', runner_id TEXT,
      items JSONB NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at BIGINT NOT NULL, estimated_at BIGINT, delivered_at BIGINT
    )
  `;
  await sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'`;
  await sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'`;
  await sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS platform_order_id TEXT DEFAULT ''`;
  await sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS platform_status TEXT DEFAULT ''`;

  const platformSettings = {
    glovoEnabled: 'false',
    glovoApiKey: '',
    glovoStoreId: '',
    glovoWebhookSecret: '',
    ubereatsEnabled: 'false',
    ubereatsApiKey: '',
    ubereatsStoreId: '',
    ubereatsWebhookSecret: '',
  };
  try {
    for (const [k, v] of Object.entries(platformSettings)) {
      await sql`INSERT INTO settings (key, value) VALUES (${k}, ${v}) ON CONFLICT (key) DO NOTHING`;
    }
  } catch (e) { console.warn('platform settings seed skip:', e.message); }

  await sql`
    CREATE TABLE IF NOT EXISTS delivery_tracking (
      id SERIAL PRIMARY KEY, delivery_id TEXT NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
      status TEXT NOT NULL, location_lat NUMERIC(10,7), location_lng NUMERIC(10,7),
      note TEXT NOT NULL DEFAULT '', created_at BIGINT NOT NULL
    )
  `;

  // ===== COMBOS =====
  await sql`
    CREATE TABLE IF NOT EXISTS combos (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price NUMERIC(10,2) NOT NULL,
      image TEXT,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at BIGINT NOT NULL
    )
  `;
  await sql`ALTER TABLE combos ADD COLUMN IF NOT EXISTS discount_pct NUMERIC(5,2) DEFAULT 0`;

  await sql`
    CREATE TABLE IF NOT EXISTS combo_slots (
      id TEXT PRIMARY KEY,
      combo_id TEXT NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      min_choices INTEGER NOT NULL DEFAULT 1,
      max_choices INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS combo_slot_items (
      id TEXT PRIMARY KEY,
      slot_id TEXT NOT NULL REFERENCES combo_slots(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      surcharge NUMERIC(10,2) NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS combo_items (
      id SERIAL PRIMARY KEY,
      combo_id TEXT NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL DEFAULT 1,
      UNIQUE (combo_id, product_id)
    )
  `;

  // Añadir fixed_price a offers para menú del día con precio fijo
  await sql`ALTER TABLE offers ADD COLUMN IF NOT EXISTS fixed_price NUMERIC(10,2)`;
  await sql`ALTER TABLE sales ADD COLUMN IF NOT EXISTS refunds JSONB DEFAULT '[]'`;
  await sql`ALTER TABLE sales ADD COLUMN IF NOT EXISTS tip_method TEXT DEFAULT ''`;
  await sql`ALTER TABLE sales ADD COLUMN IF NOT EXISTS invoice_nif TEXT DEFAULT ''`;
  await sql`ALTER TABLE sales ADD COLUMN IF NOT EXISTS invoice_name TEXT DEFAULT ''`;
  await sql`ALTER TABLE sales ADD COLUMN IF NOT EXISTS invoice_address TEXT DEFAULT ''`;
  await sql`ALTER TABLE sales ADD COLUMN IF NOT EXISTS invoice_email TEXT DEFAULT ''`;
  await sql`ALTER TABLE sales ADD COLUMN IF NOT EXISTS invoice_number TEXT DEFAULT ''`;
  await sql`ALTER TABLE sales ADD COLUMN IF NOT EXISTS invoice_created BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE sales ADD COLUMN IF NOT EXISTS invoice_created_at BIGINT`;
  await sql`ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_intent_id TEXT DEFAULT ''`;
  await sql`ALTER TABLE sales ADD COLUMN IF NOT EXISTS stripe_confirmed BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE sales ADD COLUMN IF NOT EXISTS dispute_status TEXT DEFAULT ''`;
  await sql`ALTER TABLE sales ADD COLUMN IF NOT EXISTS dispute_data JSONB DEFAULT '{}'`;

  // ===== MENÚ DEL DÍA =====
  await sql`
    CREATE TABLE IF NOT EXISTS meal_menus (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price NUMERIC(10,2) NOT NULL,
      image TEXT,
      includes_pan BOOLEAN NOT NULL DEFAULT false,
      includes_bebida BOOLEAN NOT NULL DEFAULT false,
      includes_cafe BOOLEAN NOT NULL DEFAULT false,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at BIGINT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS meal_menu_courses (
      id TEXT PRIMARY KEY,
      menu_id TEXT NOT NULL REFERENCES meal_menus(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS meal_menu_course_items (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES meal_menu_courses(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      surcharge NUMERIC(10,2) NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS meal_menu_schedules (
      id TEXT PRIMARY KEY,
      menu_id TEXT NOT NULL REFERENCES meal_menus(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL
    )
  `;

  await sql`ALTER TABLE meal_menus ADD COLUMN IF NOT EXISTS extras JSONB DEFAULT '[]'`;

  // ===== PRICE RULES =====
  await sql`
    CREATE TABLE IF NOT EXISTS product_price_rules (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT true,
      days INTEGER[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
      start_time TEXT NOT NULL DEFAULT '00:00',
      end_time TEXT NOT NULL DEFAULT '23:59',
      type TEXT NOT NULL DEFAULT 'discount_pct',
      value NUMERIC(10,2) NOT NULL DEFAULT 0,
      created_at BIGINT NOT NULL
    )
  `;

  // ===== STOCK POR UBICACIÓN =====
  await sql`
    CREATE TABLE IF NOT EXISTS product_stock (
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      location TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      low_stock INTEGER NOT NULL DEFAULT 5,
      PRIMARY KEY (product_id, location)
    )
  `;
  // Migrar stock existente (product.stock → product_stock con la ubicación del producto)
  await sql`
    INSERT INTO product_stock (product_id, location, stock, low_stock)
    SELECT id, ubicacion, stock, low_stock FROM products
    ON CONFLICT (product_id, location) DO NOTHING
  `;

  // ===== GESTORÍA =====
  await sql`
    CREATE TABLE IF NOT EXISTS gestoria_settings (
      key TEXT PRIMARY KEY, value TEXT NOT NULL
    )
  `;
  for (const [k, v] of Object.entries({
    taxRegime: 'autonomo', criterionOfCash: 'false', socialSecurityRed: '',
  })) {
    await sql`INSERT INTO gestoria_settings (key, value) VALUES (${k}, ${v}) ON CONFLICT (key) DO NOTHING`;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS gestoria_documents (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('expense','income')),
      file_name TEXT DEFAULT '',
      provider_name TEXT DEFAULT '',
      provider_nif TEXT DEFAULT '',
      document_date TEXT DEFAULT '',
      confirmed BOOLEAN DEFAULT false,
      is_periodic BOOLEAN DEFAULT false,
      notes TEXT DEFAULT '',
      created_at BIGINT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS gestoria_document_lines (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES gestoria_documents(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      category TEXT DEFAULT '',
      base_amount NUMERIC(10,2) NOT NULL,
      vat_rate NUMERIC(5,2) NOT NULL,
      vat_amount NUMERIC(10,2) NOT NULL,
      withholding NUMERIC(10,2) DEFAULT 0,
      zone TEXT DEFAULT 'spain' CHECK (zone IN ('spain','eu','outside_eu')),
      type TEXT DEFAULT 'good' CHECK (type IN ('good','service')),
      sort_order INTEGER DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS gestoria_payrolls (
      id TEXT PRIMARY KEY,
      employee_name TEXT NOT NULL,
      employee_nif TEXT NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      gross_amount NUMERIC(10,2) NOT NULL,
      irpf_withholding NUMERIC(10,2) NOT NULL,
      social_security_worker NUMERIC(10,2) NOT NULL,
      social_security_company NUMERIC(10,2) NOT NULL,
      net_amount NUMERIC(10,2) NOT NULL,
      notes TEXT DEFAULT '',
      created_at BIGINT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS gestoria_tax_models (
      id TEXT PRIMARY KEY,
      model_code TEXT NOT NULL,
      year INTEGER NOT NULL,
      quarter INTEGER NOT NULL,
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft','reviewed','presented')),
      data JSONB DEFAULT '{}',
      due_date TEXT DEFAULT '',
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      UNIQUE (model_code, year, quarter)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS gestoria_authorization (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      accountant_name TEXT DEFAULT '',
      accountant_nif TEXT DEFAULT '',
      signed_at BIGINT,
      social_security_red BOOLEAN DEFAULT false,
      revoked BOOLEAN DEFAULT false,
      revoked_at BIGINT,
      document_pdf TEXT DEFAULT ''
    )
  `;
  await sql`INSERT INTO gestoria_authorization (id) VALUES (1) ON CONFLICT (id) DO NOTHING`;

  // ===== KDS PAIRING =====
  await sql`
    CREATE TABLE IF NOT EXISTS kds_pairings (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      label TEXT DEFAULT '',
      device_id TEXT DEFAULT '',
      expires_at BIGINT NOT NULL,
      created_at BIGINT NOT NULL,
      revoked BOOLEAN DEFAULT false
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS kds_audit_log (
      id SERIAL PRIMARY KEY,
      action TEXT NOT NULL,
      details JSONB DEFAULT '{}',
      created_at BIGINT NOT NULL
    )
  `;
  await sql`ALTER TABLE kds_audit_log ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'`;

  await sql`ALTER TABLE tables ADD COLUMN IF NOT EXISTS reserved_for TEXT DEFAULT ''`;

  await sql`
    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      pax INTEGER NOT NULL,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente','confirmada','sentada','noshow','cancelada')),
      zone TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      table_id TEXT DEFAULT '',
      customer_id TEXT DEFAULT '',
      deposit_amount NUMERIC(10,2) DEFAULT 0,
      deposit_paid BOOLEAN DEFAULT false,
      source TEXT DEFAULT 'manual' CHECK (source IN ('manual','online','qr')),
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS reservation_recurring (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
      time TEXT NOT NULL,
      pax INTEGER NOT NULL DEFAULT 2,
      phone TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      zone TEXT DEFAULT '',
      table_id TEXT DEFAULT '',
      active BOOLEAN DEFAULT true,
      created_at BIGINT NOT NULL
    )
  `;

  const reservationKeys = {
    reservationOnline: 'true',
    reservationTimezone: 'Europe/Madrid',
    reservationScheduleType: 'simple',
    reservationOpenTime: '09:00',
    reservationCloseTime: '23:00',
    reservationShifts: JSON.stringify([
      { days: [1,2,3,4,5,6], label: 'Comida',  open: '13:00', close: '16:00' },
      { days: [1,2,3,4,5,6], label: 'Cena',    open: '20:00', close: '23:30' },
      { days: [0],           label: 'Comida',   open: '13:00', close: '16:00' },
    ]),
    reservationClosedDays: JSON.stringify([]),
    reservationInterval: '30',
    reservationDuration: '90',
    reservationMaxPax: '8',
    reservationMinAdvance: '60',
    reservationMaxAdvance: '30',
    reservationAutoConfirm: 'true',
    reservationConfirmMessage: '¡Reserva confirmada! Te esperamos el {date} a las {time}. Si necesitas cancelar, llámanos.',
    reservationDepositAmount: '0',
    reservationCancellationHours: '24',
    reservationCancellationRefundPct: '50',
    reservationBlockedDates: JSON.stringify([]),
    reservationWhatsAppConfirm: 'true',
    reservationWhatsAppReminder: 'false',
    reservationReviewRequest: 'false',
    reservationGoogleReviewUrl: '',
    reservationGoogleReserve: 'false',
  };
  try {
    for (const [k, v] of Object.entries(reservationKeys)) {
      await sql`INSERT INTO settings (key, value) VALUES (${k}, ${v}) ON CONFLICT (key) DO NOTHING`;
    }
  } catch (e) { console.warn('reservation settings seed skip:', e.message); }

  await sql`
    CREATE TABLE IF NOT EXISTS waitlist (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      pax INTEGER NOT NULL DEFAULT 2,
      status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting','called','seated','cancelled','noshow')),
      called_count INTEGER DEFAULT 0,
      called_at BIGINT,
      seated_at BIGINT,
      table_id TEXT DEFAULT '',
      position INTEGER NOT NULL DEFAULT 0,
      notes TEXT DEFAULT '',
      source TEXT DEFAULT 'manual' CHECK (source IN ('manual','online','qr')),
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    )
  `;

  const waitlistKeys = {
    waitlistEnabled: 'false',
    waitlistMaxPax: '20',
    waitlistCallTimeout: '5',
    waitlistMaxAttempts: '2',
    waitlistWelcomeMessage: 'Bienvenido. Te avisaremos cuando tu mesa esté lista.',
    waitlistSmsEnabled: 'false',
    waitlistWhatsAppEnabled: 'false',
    waitlistTwilioSid: '',
    waitlistTwilioToken: '',
    waitlistTwilioPhone: '',
    waitlistTwilioWhatsApp: '',
  };
  try {
    for (const [k, v] of Object.entries(waitlistKeys)) {
      await sql`INSERT INTO settings (key, value) VALUES (${k}, ${v}) ON CONFLICT (key) DO NOTHING`;
    }
  } catch (e) { console.warn('waitlist settings seed skip:', e.message); }

  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'tpv'`;

  await sql`
    CREATE TABLE IF NOT EXISTS qr_orders (
      id TEXT PRIMARY KEY,
      table_id TEXT NOT NULL,
      items JSONB NOT NULL DEFAULT '[]',
      order_status TEXT DEFAULT 'pending' CHECK (order_status IN ('pending','paid','confirmed','preparing','ready','served','cancelled')),
      payment_intent_id TEXT DEFAULT '',
      amount NUMERIC(10,2) DEFAULT 0,
      customer_name TEXT DEFAULT '',
      customer_phone TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS qr_calls (
      id TEXT PRIMARY KEY,
      table_id TEXT NOT NULL,
      table_name TEXT DEFAULT '',
      zone TEXT DEFAULT '',
      acknowledged BOOLEAN DEFAULT false,
      created_at BIGINT NOT NULL
    )
  `;

  const qrKeys = {
    qrOrderingEnabled: 'true',
    qrRequirePayment: 'false',
    qrThemeLogo: '',
    qrThemePrimary: '#c4a04a',
    qrThemeSecondary: '#1a1a1a',
    qrWelcomeMessage: '¡Bienvenido! Escanea los platos y añádelos a tu carrito.',
  };
  try {
    for (const [k, v] of Object.entries(qrKeys)) {
      await sql`INSERT INTO settings (key, value) VALUES (${k}, ${v}) ON CONFLICT (key) DO NOTHING`;
    }
  } catch (e) { console.warn('qr settings seed skip:', e.message); }

  await sql`
    CREATE TABLE IF NOT EXISTS delivery_zones (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      radius_km NUMERIC(10,2) DEFAULT 0,
      cost NUMERIC(10,2) DEFAULT 0,
      min_order NUMERIC(10,2) DEFAULT 0,
      estimated_minutes INTEGER DEFAULT 30,
      active BOOLEAN DEFAULT true,
      created_at BIGINT NOT NULL
    )
  `;

  await sql`ALTER TABLE qr_orders ADD COLUMN IF NOT EXISTS modality TEXT DEFAULT 'dinein'`;
  await sql`ALTER TABLE qr_orders ADD COLUMN IF NOT EXISTS address TEXT DEFAULT ''`;
  await sql`ALTER TABLE qr_orders ADD COLUMN IF NOT EXISTS address_lat NUMERIC(10,7)`;
  await sql`ALTER TABLE qr_orders ADD COLUMN IF NOT EXISTS address_lng NUMERIC(10,7)`;
  await sql`ALTER TABLE qr_orders ADD COLUMN IF NOT EXISTS zone_id TEXT DEFAULT ''`;
  await sql`ALTER TABLE qr_orders ADD COLUMN IF NOT EXISTS delivery_cost NUMERIC(10,2) DEFAULT 0`;
  await sql`ALTER TABLE qr_orders ADD COLUMN IF NOT EXISTS customer_email TEXT DEFAULT ''`;
  await sql`ALTER TABLE qr_orders ADD COLUMN IF NOT EXISTS scheduled_at BIGINT`;
  await sql`ALTER TABLE qr_orders ADD COLUMN IF NOT EXISTS accepted BOOLEAN DEFAULT false`;

  await sql`ALTER TABLE qr_orders DROP CONSTRAINT IF EXISTS qr_orders_order_status_check`;
  await sql`ALTER TABLE qr_orders DROP CONSTRAINT IF EXISTS qr_orders_order_status_new_check`;
  await sql`ALTER TABLE qr_orders ADD CONSTRAINT qr_orders_order_status_new_check
    CHECK (order_status IN ('pending','paid','confirmed','preparing','ready','en_camino','delivered','cancelled'))`;

  await sql`
    CREATE TABLE IF NOT EXISTS employee_shifts (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      employee_name TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      position TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      color TEXT DEFAULT '',
      created_at BIGINT NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_shifts_employee ON employee_shifts(employee_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_shifts_date ON employee_shifts(date)`;

  await sql`
    CREATE TABLE IF NOT EXISTS shift_objectives (
      id SERIAL PRIMARY KEY,
      day_of_week INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      position TEXT DEFAULT '',
      min_people INTEGER DEFAULT 1,
      max_people INTEGER DEFAULT 3
    )
  `;

  const onlineKeys = {
    onlineOrderingEnabled: 'true',
    onlineOrderingModes: JSON.stringify(['delivery']),
    onlinePrepTime: '20',
    onlineMinAdvance: '15',
    onlineMaxAdvance: '2880',
    onlinePaymentRequired: 'true',
    onlineAutoAccept: 'true',
    onlineConfirmEmail: 'false',
    onlineSchedules: JSON.stringify([
      { day: 0, open: '13:00', close: '16:00' },
      { day: 1, open: '13:00', close: '23:00' },
      { day: 2, open: '13:00', close: '23:00' },
      { day: 3, open: '13:00', close: '23:00' },
      { day: 4, open: '13:00', close: '23:00' },
      { day: 5, open: '13:00', close: '23:30' },
      { day: 6, open: '13:00', close: '23:30' },
    ]),
    googleMapsApiKey: '',
  };
  try {
    for (const [k, v] of Object.entries(onlineKeys)) {
      await sql`INSERT INTO settings (key, value) VALUES (${k}, ${v}) ON CONFLICT (key) DO NOTHING`;
    }
  } catch (e) { console.warn('online settings seed skip:', e.message); }

  await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS position TEXT DEFAULT ''`;
  await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_type TEXT DEFAULT ''`;
  await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_pct NUMERIC(5,2) DEFAULT 100`;
  await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS dni TEXT DEFAULT ''`;
  await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT ''`;
  await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS whatsapp_code TEXT DEFAULT ''`;
  await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS whatsapp_linked BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS created_at BIGINT`;

  await sql`
    CREATE TABLE IF NOT EXISTS clockin_logs (
      id SERIAL PRIMARY KEY,
      employee_id TEXT NOT NULL,
      employee_name TEXT NOT NULL,
      action TEXT NOT NULL,
      method TEXT DEFAULT 'pin',
      clockin_date TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      edited BOOLEAN DEFAULT false,
      edited_by TEXT DEFAULT '',
      edit_reason TEXT DEFAULT '',
      signature TEXT DEFAULT ''
    )
  `;
  await sql`ALTER TABLE clockin_logs DROP CONSTRAINT IF EXISTS clockin_logs_action_check`;
  await sql`ALTER TABLE clockin_logs DROP CONSTRAINT IF EXISTS clockin_logs_method_check`;
  await sql`ALTER TABLE clockin_logs ADD COLUMN IF NOT EXISTS edited BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE clockin_logs ADD COLUMN IF NOT EXISTS edited_by TEXT DEFAULT ''`;
  await sql`ALTER TABLE clockin_logs ADD COLUMN IF NOT EXISTS edit_reason TEXT DEFAULT ''`;
  await sql`ALTER TABLE clockin_logs ADD COLUMN IF NOT EXISTS signature TEXT DEFAULT ''`;

  await sql`
    CREATE TABLE IF NOT EXISTS clockin_corrections (
      id SERIAL PRIMARY KEY,
      clockin_id INTEGER DEFAULT 0,
      employee_id TEXT NOT NULL,
      employee_name TEXT DEFAULT '',
      requested_action TEXT DEFAULT '',
      reason TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      resolved_by TEXT DEFAULT '',
      created_at BIGINT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS time_off_requests (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      employee_name TEXT NOT NULL,
      reason TEXT NOT NULL,
      from_date TEXT NOT NULL,
      to_date TEXT NOT NULL,
      notes TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      resolved_by TEXT DEFAULT '',
      resolved_note TEXT DEFAULT '',
      created_at BIGINT NOT NULL,
      resolved_at BIGINT
    )
  `;

  // ===== PROVEEDORES =====
  await sql`
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      nif TEXT DEFAULT '',
      address TEXT DEFAULT '',
      payment_terms TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      active BOOLEAN DEFAULT true,
      created_at BIGINT NOT NULL
    )
  `;

  // ===== CATÁLOGO DE PROVEEDORES (precios/ud por producto) =====
  await sql`
    CREATE TABLE IF NOT EXISTS supplier_catalog (
      id SERIAL PRIMARY KEY,
      supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      sku TEXT DEFAULT '',
      price NUMERIC(10,4) NOT NULL,
      pack_size NUMERIC(10,2) DEFAULT 1,
      min_order NUMERIC(10,2) DEFAULT 0,
      delivery_days INTEGER DEFAULT 0,
      is_preferred BOOLEAN DEFAULT false,
      active BOOLEAN DEFAULT true,
      UNIQUE (supplier_id, product_id)
    )
  `;
  // Only one preferred per product (partial unique index)
  await sql`DROP INDEX IF EXISTS idx_supplier_catalog_preferred`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_catalog_preferred ON supplier_catalog (product_id) WHERE is_preferred = true`;

  // ===== HISTÓRICO DE PRECIOS DE PROVEEDOR =====
  await sql`
    CREATE TABLE IF NOT EXISTS supplier_price_history (
      id SERIAL PRIMARY KEY,
      catalog_id INTEGER NOT NULL REFERENCES supplier_catalog(id) ON DELETE CASCADE,
      supplier_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      pack_price NUMERIC(10,4) NOT NULL,
      pack_size NUMERIC(10,2) NOT NULL DEFAULT 1,
      price_per_unit NUMERIC(10,6) NOT NULL,
      source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'receipt')),
      created_at BIGINT NOT NULL
    )
  `;

  // Remove legacy preferred_supplier from products
  await sql`ALTER TABLE products DROP COLUMN IF EXISTS preferred_supplier`;

  // Tipo de producto (raw_material, elaborado, semi_elaborado, consumible)
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS type TEXT DEFAULT ''`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS inventariable BOOLEAN DEFAULT false`;

  // ===== ESCANDALLO / RECETAS =====
  await sql`
    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      product_name TEXT NOT NULL,
      cost_per_unit NUMERIC(10,4) NOT NULL DEFAULT 0,
      updated_at BIGINT NOT NULL DEFAULT 0,
      UNIQUE(product_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id SERIAL PRIMARY KEY,
      recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      ingredient_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      ingredient_name TEXT NOT NULL,
      quantity NUMERIC(10,4) NOT NULL,
      unit TEXT NOT NULL DEFAULT 'kg',
      cost_per_unit NUMERIC(10,4) NOT NULL DEFAULT 0,
      total_cost NUMERIC(10,4) NOT NULL DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS modifier_recipes (
      id TEXT PRIMARY KEY,
      modifier_option_id TEXT NOT NULL,
      modifier_name TEXT NOT NULL,
      cost_per_unit NUMERIC(10,4) NOT NULL DEFAULT 0,
      updated_at BIGINT NOT NULL DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS modifier_recipe_ingredients (
      id SERIAL PRIMARY KEY,
      modifier_recipe_id TEXT NOT NULL REFERENCES modifier_recipes(id) ON DELETE CASCADE,
      ingredient_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      ingredient_name TEXT NOT NULL,
      quantity NUMERIC(10,4) NOT NULL,
      unit TEXT NOT NULL DEFAULT 'kg',
      cost_per_unit NUMERIC(10,4) NOT NULL DEFAULT 0,
      total_cost NUMERIC(10,4) NOT NULL DEFAULT 0
    )
  `;

  // Rendimiento de receta (cuantas unidades produce)
  await sql`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS yield_qty NUMERIC(10,2) NOT NULL DEFAULT 1`;

  // ===== PRODUCCIÓN DE ELABORADOS =====
  await sql`
    CREATE TABLE IF NOT EXISTS productions (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      quantity NUMERIC(10,2) NOT NULL,
      cost_per_unit NUMERIC(10,4) NOT NULL,
      total_cost NUMERIC(10,2) NOT NULL,
      location TEXT NOT NULL DEFAULT 'Cocina',
      batch_number TEXT DEFAULT '',
      expiry_date TEXT,
      notes TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'anulado')),
      produced_at BIGINT NOT NULL,
      created_at BIGINT NOT NULL,
      anulado_at BIGINT,
      anulado_reason TEXT DEFAULT '',
      anulado_by TEXT DEFAULT ''
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS production_ingredients (
      id SERIAL PRIMARY KEY,
      production_id TEXT NOT NULL REFERENCES productions(id) ON DELETE CASCADE,
      ingredient_id TEXT NOT NULL REFERENCES products(id),
      ingredient_name TEXT NOT NULL,
      quantity NUMERIC(10,4) NOT NULL,
      cost_per_unit NUMERIC(10,4) NOT NULL,
      total_cost NUMERIC(10,4) NOT NULL
    )
  `;

  // ===== PEDIDOS DE COMPRA =====
  await sql`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      supplier_id TEXT NOT NULL,
      supplier_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','partial','received')),
      expected_date TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_by TEXT DEFAULT '',
      created_at BIGINT NOT NULL,
      updated_at BIGINT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS purchase_order_lines (
      id SERIAL PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity NUMERIC(10,2) NOT NULL,
      price_per_unit NUMERIC(10,4) NOT NULL,
      supplier_sku TEXT DEFAULT '',
      received_qty NUMERIC(10,2) DEFAULT 0
    )
  `;

  // Ajustes pedidos automáticos
  await sql`
    CREATE TABLE IF NOT EXISTS auto_order_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    )
  `;
  const autoDefaults = {
    leadTimeDays: '2',
    safetyStockDays: '3',
    minOrderValue: '50',
    consolidateBySupplier: 'true',
  };
  for (const [k, v] of Object.entries(autoDefaults)) {
    await sql`INSERT INTO auto_order_settings (key, value) VALUES (${k}, ${v}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
  }

  const clockinKeys = {
    clockinEnabled: 'true',
    clockinPinRequired: 'true',
    clockinGeolocation: 'false',
    clockinLat: '',
    clockinLng: '',
    clockinRadius: '100',
  };
  try {
    for (const [k, v] of Object.entries(clockinKeys)) {
      await sql`INSERT INTO settings (key, value) VALUES (${k}, ${v}) ON CONFLICT (key) DO NOTHING`;
    }
  } catch (e) { console.warn('clockin settings seed skip:', e.message); }

  // ===== ALBARANES (NOTAS DE ENTREGA) =====
  await sql`
    CREATE TABLE IF NOT EXISTS albaranes (
      id TEXT PRIMARY KEY,
      supplier_id TEXT NOT NULL,
      supplier_name TEXT NOT NULL,
      albaran_number TEXT NOT NULL,
      delivery_date TEXT NOT NULL,
      invoice_number TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      total_amount NUMERIC(10,2) DEFAULT 0,
      total_net NUMERIC(10,2) DEFAULT 0,
      total_iva NUMERIC(10,2) DEFAULT 0,
      header_discount_pct NUMERIC(5,2) DEFAULT 0,
      header_discount_amount NUMERIC(10,2) DEFAULT 0,
      recargo_equivalencia_pct NUMERIC(5,2) DEFAULT 0,
      recargo_amount NUMERIC(10,2) DEFAULT 0,
      portes_amount NUMERIC(10,2) DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','confirmed','anulado')),
      received_by TEXT DEFAULT '',
      anulado_by TEXT DEFAULT '',
      anulado_at BIGINT,
      anulado_reason TEXT DEFAULT '',
      linked_purchase_order_id TEXT DEFAULT '',
      created_at BIGINT NOT NULL,
      updated_at BIGINT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS albaran_lines (
      id SERIAL PRIMARY KEY,
      albaran_id TEXT NOT NULL REFERENCES albaranes(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity NUMERIC(10,2) NOT NULL,
      pack_size NUMERIC(10,2) DEFAULT 1,
      price_per_pack NUMERIC(10,4) NOT NULL,
      price_per_unit NUMERIC(10,4) NOT NULL,
      supplier_sku TEXT DEFAULT '',
      iva_pct NUMERIC(5,2) DEFAULT 0,
      line_discount_pct NUMERIC(5,2) DEFAULT 0,
      line_discount_amount NUMERIC(10,2) DEFAULT 0,
      subtotal NUMERIC(10,2) NOT NULL,
      iva_amount NUMERIC(10,2) DEFAULT 0,
      total_line NUMERIC(10,2) NOT NULL,
      batch_number TEXT DEFAULT '',
      expiry_date TEXT DEFAULT ''
    )
  `;
  await sql`ALTER TABLE albaran_lines ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT 'Almacén'`;

  // ===== LOTES/BATCHES CON CADUCIDAD =====
  await sql`
    CREATE TABLE IF NOT EXISTS product_batches (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      albaran_id TEXT REFERENCES albaranes(id) ON DELETE SET NULL,
      batch_number TEXT NOT NULL,
      quantity NUMERIC(10,2) NOT NULL,
      remaining_quantity NUMERIC(10,2) NOT NULL,
      location TEXT NOT NULL DEFAULT 'Almacén',
      cost_per_unit NUMERIC(10,4) NOT NULL,
      expiry_date TEXT,
      received_at BIGINT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','depleted','expired')),
      active BOOLEAN DEFAULT true
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_batches_product ON product_batches(product_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_batches_expiry ON product_batches(expiry_date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_batches_location ON product_batches(location)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_batches_status ON product_batches(status)`;

  // ===== BUFFET =====
  await sql`
    CREATE TABLE IF NOT EXISTS buffet_config (
      id TEXT PRIMARY KEY DEFAULT 'default',
      enabled BOOLEAN DEFAULT false,
      time_limit INTEGER DEFAULT 90,
      cooldown INTEGER DEFAULT 5,
      round_cap INTEGER DEFAULT 3,
      cover_price NUMERIC(10,2) DEFAULT 25.00,
      child_price NUMERIC(10,2) DEFAULT 12.50,
      senior_price NUMERIC(10,2) DEFAULT 18.00,
      child_max_age INTEGER DEFAULT 12,
      senior_min_age INTEGER DEFAULT 65,
      paused_until BIGINT DEFAULT 0,
      staff_opens_table BOOLEAN DEFAULT true,
      updated_at BIGINT NOT NULL
    )
  `;
  await sql`
    INSERT INTO buffet_config (id, updated_at)
    SELECT 'default', 0
    WHERE NOT EXISTS (SELECT 1 FROM buffet_config WHERE id = 'default')
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS buffet_sessions (
      id TEXT PRIMARY KEY,
      table_id TEXT NOT NULL REFERENCES tables(id),
      table_name TEXT NOT NULL,
      adult_count INTEGER NOT NULL DEFAULT 1,
      child_count INTEGER NOT NULL DEFAULT 0,
      senior_count INTEGER NOT NULL DEFAULT 0,
      round INTEGER NOT NULL DEFAULT 0,
      cooldown_until BIGINT DEFAULT 0,
      started_at BIGINT NOT NULL,
      closed_at BIGINT,
      status TEXT NOT NULL DEFAULT 'active',
      void_reason TEXT DEFAULT '',
      voided_by TEXT DEFAULT '',
      closed_by TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      cover_price_snapshot NUMERIC(10,2) NOT NULL,
      child_price_snapshot NUMERIC(10,2) NOT NULL DEFAULT 0,
      senior_price_snapshot NUMERIC(10,2) NOT NULL DEFAULT 0,
      override_time_limit INTEGER DEFAULT 0,
      override_cooldown INTEGER DEFAULT 0,
      override_round_cap INTEGER DEFAULT 0,
      override_cover_price NUMERIC(10,2) DEFAULT 0,
      order_id TEXT,
      estimated_total NUMERIC(10,2) DEFAULT 0,
      waste_amount NUMERIC(10,2) DEFAULT 0,
      premium_consumed INTEGER DEFAULT 0
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_buffet_sessions_table ON buffet_sessions(table_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_buffet_sessions_status ON buffet_sessions(status)`;

  await sql`
    CREATE TABLE IF NOT EXISTS buffet_rounds (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES buffet_sessions(id) ON DELETE CASCADE,
      round_number INTEGER NOT NULL,
      items JSONB DEFAULT '[]',
      item_count INTEGER NOT NULL DEFAULT 0,
      requested_at BIGINT NOT NULL,
      delivered_at BIGINT,
      status TEXT NOT NULL DEFAULT 'pending'
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_buffet_rounds_session ON buffet_rounds(session_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS buffet_waste (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES buffet_sessions(id) ON DELETE CASCADE,
      table_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      charge NUMERIC(10,2) NOT NULL,
      created_at BIGINT NOT NULL,
      employee_id TEXT
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_buffet_waste_session ON buffet_waste(session_id)`;

  // Sessions table for duplicate login detection
  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      tenant_id TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      role TEXT NOT NULL,
      active BOOLEAN DEFAULT true,
      created_at BIGINT NOT NULL,
      last_seen BIGINT NOT NULL
    )
  `;
  try { await sql`ALTER TABLE sessions ADD CONSTRAINT unique_session UNIQUE (tenant_id, employee_id, device_id)`; } catch (e) { console.warn('sessions unique skip:', e.message); }

  // Ensure tenant_id exists on all core tables (re-check for tables created after the ALTER loop above)
  const postCreateTables = ['employees', 'tables', 'orders', 'products', 'categories', 'offers', 'combos', 'settings', 'meal_menu_courses', 'meal_menu_course_items', 'meal_menu_schedules'];
  for (const table of postCreateTables) {
    try { await sql`ALTER TABLE "${sql.unsafe(table)}" ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default'`; } catch (e) { console.warn('tenant_id recheck:', table, e.message); }
  }

  // Composite unique constraints for tables with non-standard PKs
  try { await sql`ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_pkey`; } catch {}
  try { await sql`ALTER TABLE settings ADD PRIMARY KEY (tenant_id, key)`; } catch (e) { console.warn('settings PK skip:', e.message); }

  // Convert PKs to composite (tenant_id, id) for tables that use ON CONFLICT
  const compositePkTables = ['tables', 'orders', 'products', 'employees', 'offers', 'combos', 'categories'];
  for (const table of compositePkTables) {
    try {
      await sql`ALTER TABLE "${sql.unsafe(table)}" DROP CONSTRAINT IF EXISTS ${sql.unsafe('"' + table + '_pkey"')}`;
      await sql`ALTER TABLE "${sql.unsafe(table)}" ADD PRIMARY KEY (tenant_id, id)`;
    } catch (e) { console.warn('composite PK skip:', table, e.message); }
    // Ensure ON CONFLICT (tenant_id, id) works even if composite PK migration failed
    try {
      await sql`ALTER TABLE "${sql.unsafe(table)}" ADD CONSTRAINT "${sql.unsafe(table + '_tenant_id_id_uniq')}" UNIQUE (tenant_id, id)`;
    } catch (e) {
      if (!e.message?.includes('already exists')) console.warn('composite unique skip:', table, e.message);
    }
  }

  await sql`
    CREATE TABLE IF NOT EXISTS closures (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT 'default',
      date TEXT NOT NULL,
      total NUMERIC(10,2) NOT NULL DEFAULT 0,
      ticket_count INTEGER NOT NULL DEFAULT 0,
      avg_ticket NUMERIC(10,2) NOT NULL DEFAULT 0,
      methods JSONB NOT NULL DEFAULT '[]',
      employees JSONB NOT NULL DEFAULT '[]',
      sales_ids TEXT[] NOT NULL DEFAULT '{}',
      closed_at BIGINT NOT NULL,
      employee_name TEXT NOT NULL DEFAULT ''
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_closures_date ON closures(date)`;

  try { await sql`ALTER TABLE closures ADD COLUMN IF NOT EXISTS cuadratura JSONB DEFAULT '[]'`; } catch (e) { console.warn('cuadratura col skip:', e.message); }

  // Webhook events for idempotency and retry tracking
  await sql`
    CREATE TABLE IF NOT EXISTS webhook_events (
      event_id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'received',
      body JSONB,
      error TEXT,
      created_at BIGINT NOT NULL,
      processed_at BIGINT
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status)`;

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
  const [categories, products, tables, orders, sales, employees, accessLogs, stockLog, cancelledOrders, offers, settings, backups, deliveryRunners, deliveryOrders, deliveryTracking, mealMenus, waitlist, clockinLogs, buffetConfig, buffetSessions, buffetRounds, buffetWaste] = await Promise.all([
    sql`SELECT * FROM categories`,
    sql`SELECT * FROM products`,
    sql`SELECT * FROM tables`,
    sql`SELECT * FROM orders`,
    sql`SELECT * FROM sales`,
    sql`SELECT * FROM employees`,
    sql`SELECT * FROM access_logs ORDER BY id`,
    sql`SELECT * FROM stock_log ORDER BY id`,
    sql`SELECT * FROM cancelled_orders ORDER BY id`,
    sql`SELECT * FROM offers`,
    sql`SELECT * FROM settings`,
    sql`SELECT * FROM backups ORDER BY created_at DESC LIMIT 10`,
    sql`SELECT * FROM delivery_runners`,
    sql`SELECT * FROM delivery_orders`,
    sql`SELECT * FROM delivery_tracking ORDER BY id`,
    sql`SELECT * FROM meal_menus`,
    sql`SELECT * FROM waitlist ORDER BY position`,
    sql`SELECT * FROM clockin_logs ORDER BY id`,
    sql`SELECT * FROM clockin_corrections ORDER BY id`,
    sql`SELECT * FROM time_off_requests ORDER BY created_at`,
    sql`SELECT * FROM employee_shifts ORDER BY date`,
    sql`SELECT * FROM shift_objectives ORDER BY id`,
    sql`SELECT * FROM suppliers ORDER BY name`,
    sql`SELECT * FROM supplier_catalog ORDER BY supplier_id, product_id`,
    sql`SELECT * FROM purchase_orders ORDER BY created_at DESC`,
    sql`SELECT * FROM purchase_order_lines ORDER BY id`,
    sql`SELECT * FROM auto_order_settings`,
    sql`SELECT * FROM supplier_price_history ORDER BY created_at DESC`,
    sql`SELECT * FROM buffet_config`,
    sql`SELECT * FROM buffet_sessions ORDER BY started_at DESC`,
    sql`SELECT * FROM buffet_rounds ORDER BY round_number`,
    sql`SELECT * FROM buffet_waste ORDER BY created_at`,
  ]);
  return {
    exportedAt: new Date().toISOString(),
    version: '2.2',
    data: { categories, products, tables, orders, sales, employees, accessLogs, stockLog, cancelledOrders, offers, settings, backups, deliveryRunners, deliveryOrders, deliveryTracking, mealMenus, waitlist, clockinLogs, timeOffRequests: time_off_requests, employeeShifts: employee_shifts, shiftObjectives: shift_objectives, suppliers, supplierCatalog: supplier_catalog, purchaseOrders: purchase_orders, purchaseOrderLines: purchase_order_lines, autoOrderSettings: auto_order_settings, supplierPriceHistory: supplier_price_history, buffetConfig, buffetSessions, buffetRounds, buffetWaste },

  };
}
