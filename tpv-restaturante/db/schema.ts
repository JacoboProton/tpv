import { pgTable, varchar, timestamp, text, integer, index, numeric, jsonb, bigint, uniqueIndex, foreignKey, doublePrecision, boolean, unique, serial, check, primaryKey, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const kitchenStatus = pgEnum("KitchenStatus", ['PENDING', 'IN_PROGRESS', 'DONE'])
export const plan = pgEnum("Plan", ['FREE', 'BASIC', 'PRO', 'PREMIUM'])
export const role = pgEnum("Role", ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN', 'BAR'])
export const station = pgEnum("Station", ['KITCHEN', 'BAR'])
export const ticketStatus = pgEnum("TicketStatus", ['OPEN', 'PAID', 'CANCELLED'])
export const level = pgEnum("level", ['pro', 'intermedio', 'iniciacion'])


export const closures = pgTable("closures", {
	id: text().primaryKey().notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
	date: text().notNull(),
	total: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	ticketCount: integer("ticket_count").default(0).notNull(),
	avgTicket: numeric("avg_ticket", { precision: 10, scale:  2 }).default('0').notNull(),
	methods: jsonb().default([]).notNull(),
	employees: jsonb().default([]).notNull(),
	salesIds: text("sales_ids").array().default([""]).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	closedAt: bigint("closed_at", { mode: "number" }).notNull(),
	employeeName: text("employee_name").default('').notNull(),
	cuadratura: jsonb().default([]),
}, (table) => [
	index("idx_closures_date").using("btree", table.date.asc().nullsLast().op("text_ops")),
	index("idx_closures_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const product = pgTable("Product", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	price: doublePrecision().notNull(),
	cost: doublePrecision(),
	barcode: text(),
	categoryId: text().notNull(),
}, (table) => [
	uniqueIndex("Product_barcode_key").using("btree", table.barcode.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [category.id],
			name: "Product_categoryId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const user = pgTable("User", {
	id: text().primaryKey().notNull(),
	email: text().notNull(),
	name: text().notNull(),
	password: text(),
	role: role().notNull(),
	tenantId: text().notNull(),
	storeId: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	emailVerified: boolean().default(false).notNull(),
	image: text(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	uniqueIndex("User_email_key").using("btree", table.email.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [store.id],
			name: "User_storeId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenant.id],
			name: "User_tenantId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	index("idx_user_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const tenant = pgTable("Tenant", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	plan: plan().default('FREE').notNull(),
	stripeId: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const store = pgTable("Store", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	address: text(),
	tenantId: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenant.id],
			name: "Store_tenantId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	index("idx_store_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const category = pgTable("Category", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
});

export const ticket = pgTable("Ticket", {
	id: text().primaryKey().notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
	total: doublePrecision().default(0).notNull(),
	status: ticketStatus().default('OPEN').notNull(),
	storeId: text().notNull(),
	createdById: text().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.createdById],
			foreignColumns: [user.id],
			name: "Ticket_createdById_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [store.id],
			name: "Ticket_storeId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const ticketItem = pgTable("TicketItem", {
	id: text().primaryKey().notNull(),
	quantity: integer().notNull(),
	price: doublePrecision().notNull(),
	ticketId: text().notNull(),
	productId: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [product.id],
			name: "TicketItem_productId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.ticketId],
			foreignColumns: [ticket.id],
			name: "TicketItem_ticketId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const kitchenItem = pgTable("KitchenItem", {
	id: text().primaryKey().notNull(),
	status: kitchenStatus().default('PENDING').notNull(),
	station: station().notNull(),
	ticketItemId: text().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.ticketItemId],
			foreignColumns: [ticketItem.id],
			name: "KitchenItem_ticketItemId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const recipeItem = pgTable("RecipeItem", {
	id: text().primaryKey().notNull(),
	productId: text().notNull(),
	ingredientId: text().notNull(),
	quantity: doublePrecision().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.ingredientId],
			foreignColumns: [ingredient.id],
			name: "RecipeItem_ingredientId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [product.id],
			name: "RecipeItem_productId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const ingredient = pgTable("Ingredient", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	unit: text().notNull(),
	stock: doublePrecision().default(0).notNull(),
});

export const stockMovement = pgTable("StockMovement", {
	id: text().primaryKey().notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
	ingredientId: text().notNull(),
	quantity: doublePrecision().notNull(),
	reason: text().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.ingredientId],
			foreignColumns: [ingredient.id],
			name: "StockMovement_ingredientId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	index("idx_stockMovement_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const shift = pgTable("Shift", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	start: timestamp({ precision: 3, mode: 'string' }).notNull(),
	end: timestamp({ precision: 3, mode: 'string' }),
	storeId: text(),
}, (table) => [
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [store.id],
			name: "Shift_storeId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "Shift_userId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const sessions = pgTable("sessions", {
	tenantId: text("tenant_id").notNull(),
	employeeId: text("employee_id").notNull(),
	deviceId: text("device_id").notNull(),
	role: text().notNull(),
	active: boolean().default(true),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	lastSeen: bigint("last_seen", { mode: "number" }).notNull(),
}, (table) => [
	unique("unique_session").on(table.deviceId, table.employeeId, table.tenantId),
	index("idx_sessions_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const attendance = pgTable("Attendance", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	checkIn: timestamp({ precision: 3, mode: 'string' }).notNull(),
	checkOut: timestamp({ precision: 3, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "Attendance_userId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const session = pgTable("Session", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	expiresAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	ipAddress: text(),
	userAgent: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	uniqueIndex("Session_userId_id_key").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.id.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "Session_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const bearings = pgTable("bearings", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	level: level().notNull(),
	price: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	imageUrl: text("image_url"),
});

export const bushings = pgTable("bushings", {
	id: serial().primaryKey().notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
	name: text().notNull(),
	description: text(),
	level: level().notNull(),
	price: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	imageUrl: text("image_url"),
});

export const webhookEvents = pgTable("webhook_events", {
	eventId: text("event_id").primaryKey().notNull(),
	type: text().notNull(),
	status: text().default('received').notNull(),
	body: jsonb(),
	error: text(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	processedAt: bigint("processed_at", { mode: "number" }),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_webhook_events_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_webhookEvents_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const backpacks = pgTable("backpacks", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	level: level().notNull(),
	price: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	imageUrl: text("image_url"),
});

export const belts = pgTable("belts", {
	id: serial().primaryKey().notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
	name: text().notNull(),
	description: text(),
	level: level().notNull(),
	price: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	imageUrl: text("image_url"),
});

export const caps = pgTable("caps", {
	id: serial().primaryKey().notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
	name: text().notNull(),
	description: text(),
	level: level().notNull(),
	price: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	imageUrl: text("image_url"),
});

export const elbowPads = pgTable("elbow_pads", {
	id: serial().primaryKey().notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
	name: text().notNull(),
	description: text(),
	level: level().notNull(),
	price: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	imageUrl: text("image_url"),
});

export const griptapes = pgTable("griptapes", {
	id: serial().primaryKey().notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
	name: text().notNull(),
	description: text(),
	level: level().notNull(),
	price: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	imageUrl: text("image_url"),
});

export const helmets = pgTable("helmets", {
	id: serial().primaryKey().notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
	name: text().notNull(),
	description: text(),
	level: level().notNull(),
	price: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	imageUrl: text("image_url"),
});

export const kneePads = pgTable("knee_pads", {
	id: serial().primaryKey().notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
	name: text().notNull(),
	description: text(),
	level: level().notNull(),
	price: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	imageUrl: text("image_url"),
});

export const pants = pgTable("pants", {
	id: serial().primaryKey().notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
	name: text().notNull(),
	description: text(),
	level: level().notNull(),
	price: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	imageUrl: text("image_url"),
});

export const patches = pgTable("patches", {
	id: serial().primaryKey().notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
	name: text().notNull(),
	description: text(),
	level: level().notNull(),
	price: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	imageUrl: text("image_url"),
});

export const skateShoes = pgTable("skate_shoes", {
	id: serial().primaryKey().notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
	name: text().notNull(),
	description: text(),
	level: level().notNull(),
	price: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	imageUrl: text("image_url"),
});

export const socks = pgTable("socks", {
	id: serial().primaryKey().notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
	name: text().notNull(),
	description: text(),
	level: level().notNull(),
	price: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	imageUrl: text("image_url"),
});

export const stickers = pgTable("stickers", {
	id: serial().primaryKey().notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
	name: text().notNull(),
	description: text(),
	level: level().notNull(),
	price: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	imageUrl: text("image_url"),
});

export const migrations = pgTable("_migrations", {
	name: text().primaryKey().notNull(),
	description: text().default('').notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	appliedAt: bigint("applied_at", { mode: "number" }).notNull(),
	durationMs: integer("duration_ms").default(0).notNull(),
	checksum: text().default('').notNull(),
	failed: boolean().default(false).notNull(),
	error: text().default(''),
});

export const sales = pgTable("sales", {
	id: text().primaryKey().notNull(),
	tableId: text("table_id"),
	tableName: text("table_name"),
	items: jsonb().default([]).notNull(),
	subtotal: numeric({ precision: 10, scale:  2 }),
	discount: numeric({ precision: 5, scale:  2 }).default('0'),
	discountAmount: numeric("discount_amount", { precision: 10, scale:  2 }).default('0'),
	total: numeric({ precision: 10, scale:  2 }),
	tip: numeric({ precision: 10, scale:  2 }).default('0'),
	totalWithTip: numeric("total_with_tip", { precision: 10, scale:  2 }),
	payments: jsonb().default([]).notNull(),
	paymentMethod: text("payment_method"),
	isFiado: boolean("is_fiado").default(false),
	isDebtPayment: boolean("is_debt_payment").default(false),
	employeeId: text("employee_id"),
	employeeName: text("employee_name"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	closedAt: bigint("closed_at", { mode: "number" }).notNull(),
	refunds: jsonb().default([]),
	tipMethod: text("tip_method").default(''),
	invoiceNif: text("invoice_nif").default(''),
	invoiceName: text("invoice_name").default(''),
	invoiceAddress: text("invoice_address").default(''),
	invoiceEmail: text("invoice_email").default(''),
	invoiceNumber: text("invoice_number").default(''),
	invoiceCreated: boolean("invoice_created").default(false),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	invoiceCreatedAt: bigint("invoice_created_at", { mode: "number" }),
	paymentIntentId: text("payment_intent_id").default(''),
	tenantId: text("tenant_id").default('default').notNull(),
	stripeConfirmed: boolean("stripe_confirmed").default(false),
	disputeStatus: text("dispute_status").default(''),
	disputeData: jsonb("dispute_data").default({}),
	ticketNumber: integer("ticket_number"),
}, (table) => [
	index("idx_sales_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const hardware = pgTable("hardware", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	level: level().notNull(),
	price: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	imageUrl: text("image_url"),
});

export const riserPads = pgTable("riser_pads", {
	id: serial().primaryKey().notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
	name: text().notNull(),
	description: text(),
	level: level().notNull(),
	price: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	imageUrl: text("image_url"),
});

export const skates = pgTable("skates", {
	id: serial().primaryKey().notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
	name: text().notNull(),
	description: text(),
	level: level().notNull(),
	price: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	imageUrl: text("image_url"),
});

export const sunglasses = pgTable("sunglasses", {
	id: serial().primaryKey().notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
	name: text().notNull(),
	description: text(),
	level: level().notNull(),
	price: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	imageUrl: text("image_url"),
});

export const tShirts = pgTable("t_shirts", {
	id: serial().primaryKey().notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
	name: text().notNull(),
	description: text(),
	level: level().notNull(),
	price: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	imageUrl: text("image_url"),
});

export const toolBags = pgTable("tool_bags", {
	id: serial().primaryKey().notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
	name: text().notNull(),
	description: text(),
	level: level().notNull(),
	price: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	imageUrl: text("image_url"),
});

export const tools = pgTable("tools", {
	id: serial().primaryKey().notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
	name: text().notNull(),
	description: text(),
	level: level().notNull(),
	price: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	imageUrl: text("image_url"),
});

export const trucks = pgTable("trucks", {
	id: serial().primaryKey().notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
	name: text().notNull(),
	description: text(),
	level: level().notNull(),
	price: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	imageUrl: text("image_url"),
});

export const wheels = pgTable("wheels", {
	id: serial().primaryKey().notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
	name: text().notNull(),
	description: text(),
	level: level().notNull(),
	price: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	imageUrl: text("image_url"),
});

export const products = pgTable("products", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	category: text().notNull(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	stock: integer().default(0).notNull(),
	lowStock: integer("low_stock").default(5).notNull(),
	ubicacion: text().default('Bar').notNull(),
	discount: numeric({ precision: 5, scale:  2 }).default('0').notNull(),
	course: text().default('').notNull(),
	image: text(),
	allergens: text().array().default([""]),
	description: text(),
	featured: boolean().default(false),
	active: boolean().default(true),
	showTpv: boolean("show_tpv").default(true),
	showQr: boolean("show_qr").default(true),
	agotado: boolean().default(false),
	carouselSort: integer("carousel_sort"),
	type: text().default(''),
	inventariable: boolean().default(false),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_products_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
	unique("products_tenant_id_id_uniq").on(table.id, table.tenantId),
]);

export const tables = pgTable("tables", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	status: text().default('libre').notNull(),
	orderId: text("order_id"),
	reserved: jsonb(),
	isFiado: boolean("is_fiado").default(false).notNull(),
	type: text().default('mesa').notNull(),
	posX: integer("pos_x").default(100),
	posY: integer("pos_y").default(100),
	tableWidth: integer("table_width").default(80),
	tableHeight: integer("table_height").default(80),
	tableRadius: integer("table_radius").default(40),
	tableShape: text("table_shape").default('rect'),
	rotation: integer().default(0),
	seats: integer().default(4),
	zone: text().default(''),
	layer: integer().default(0),
	tableColor: text("table_color").default(''),
	orderIds: jsonb("order_ids").default([]),
	reservedFor: text("reserved_for").default(''),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_tables_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
	unique("tables_tenant_id_id_uniq").on(table.id, table.tenantId),
]);

export const verifactuRegistros = pgTable("verifactu_registros", {
	id: serial().primaryKey().notNull(),
	saleId: text("sale_id").notNull(),
	numSerie: text("num_serie").notNull(),
	fechaExpedicion: text("fecha_expedicion").notNull(),
	importeTotal: numeric("importe_total", { precision: 10, scale:  2 }).notNull(),
	baseImponible: numeric("base_imponible", { precision: 10, scale:  2 }).notNull(),
	cuotaIva: numeric("cuota_iva", { precision: 10, scale:  2 }).notNull(),
	huellaAnterior: text("huella_anterior").default('0').notNull(),
	huella: text().notNull(),
	xmlRegistro: text("xml_registro").notNull(),
	qrUrl: text("qr_url").notNull(),
	estado: text().default('simulado').notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	fiskalyInvoiceId: text("fiskaly_invoice_id"),
	verificationUrl: text("verification_url"),
	fechaHoraFirma: text("fecha_hora_firma"),
	tenantId: text("tenant_id").default('default').notNull(),
	paymentIntentId: text("payment_intent_id"),
}, (table) => [
	index("idx_verifactu_registros_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
	unique("verifactu_registros_num_serie_key").on(table.numSerie),
	unique("verifactu_registros_sale_id_key").on(table.saleId),
]);

export const cancelledOrders = pgTable("cancelled_orders", {
	id: serial().primaryKey().notNull(),
	orderId: text("order_id"),
	tableId: text("table_id"),
	tableName: text("table_name"),
	items: jsonb().default([]).notNull(),
	total: numeric({ precision: 10, scale:  2 }),
	employeeName: text("employee_name"),
	reason: text(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	cancelledAt: bigint("cancelled_at", { mode: "number" }).notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_cancelled_orders_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const employeeTurns = pgTable("employee_turns", {
	id: serial().primaryKey().notNull(),
	employeeId: text("employee_id").notNull(),
	employeeName: text("employee_name").notNull(),
	action: text().notNull(),
	turnDate: text("turn_date").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	time: bigint({ mode: "number" }).notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_employee_turns_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const accessLogs = pgTable("access_logs", {
	id: serial().primaryKey().notNull(),
	employeeId: text("employee_id").notNull(),
	employeeName: text("employee_name").notNull(),
	role: text().notNull(),
	entryPoint: text("entry_point").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	loggedAt: bigint("logged_at", { mode: "number" }).notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_access_logs_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const fiskalyConfig = pgTable("fiskaly_config", {
	key: text().primaryKey().notNull(),
	value: text().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	updatedAt: bigint("updated_at", { mode: "number" }).default(0).notNull(),
});

export const stockLog = pgTable("stock_log", {
	id: serial().primaryKey().notNull(),
	productId: text("product_id").notNull(),
	productName: text("product_name").notNull(),
	oldStock: integer("old_stock").notNull(),
	newStock: integer("new_stock").notNull(),
	changeAmount: integer("change_amount").notNull(),
	reason: text().notNull(),
	employeeName: text("employee_name"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	reference: text().default(''),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_stock_log_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const paymentLogs = pgTable("payment_logs", {
	id: serial().primaryKey().notNull(),
	eventId: text("event_id"),
	paymentIntentId: text("payment_intent_id"),
	operation: text().notNull(),
	amountCents: integer("amount_cents").default(0).notNull(),
	currency: text().default('eur').notNull(),
	status: text().default('ok').notNull(),
	tableId: text("table_id"),
	tableName: text("table_name"),
	employeeName: text("employee_name"),
	source: text(),
	error: text(),
	stripeResponse: text("stripe_response"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_paymentLogs_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);


export const deliveryTracking = pgTable("delivery_tracking", {
	id: serial().primaryKey().notNull(),
	deliveryId: text("delivery_id").notNull(),
	status: text().notNull(),
	locationLat: numeric("location_lat", { precision: 10, scale:  7 }),
	locationLng: numeric("location_lng", { precision: 10, scale:  7 }),
	note: text().default('').notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.deliveryId],
			foreignColumns: [deliveryOrders.id],
			name: "delivery_tracking_delivery_id_fkey"
		}).onDelete("cascade"),
	index("idx_deliveryTracking_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const deliveryOrders = pgTable("delivery_orders", {
	id: text().primaryKey().notNull(),
	orderId: text("order_id"),
	tableId: text("table_id"),
	customerName: text("customer_name").notNull(),
	customerPhone: text("customer_phone").default('').notNull(),
	address: text().notNull(),
	addressLat: numeric("address_lat", { precision: 10, scale:  7 }),
	addressLng: numeric("address_lng", { precision: 10, scale:  7 }),
	notes: text().default('').notNull(),
	runnerId: text("runner_id"),
	status: text().default('pending').notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	estimatedAt: bigint("estimated_at", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	deliveredAt: bigint("delivered_at", { mode: "number" }),
	items: jsonb().default([]).notNull(),
	source: text().default('manual').notNull(),
	platformOrderId: text("platform_order_id").default(''),
	platformStatus: text("platform_status").default(''),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_delivery_orders_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const modifierOptions = pgTable("modifier_options", {
	id: text().primaryKey().notNull(),
	groupId: text("group_id").notNull(),
	name: text().notNull(),
	priceDelta: numeric("price_delta", { precision: 10, scale:  2 }).default('0').notNull(),
	isDefault: boolean("is_default").default(false).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	stockDeduct: boolean("stock_deduct").default(false),
	stockArticleId: text("stock_article_id").default(''),
	stockQuantity: numeric("stock_quantity", { precision: 10, scale:  4 }).default('0'),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [modifierGroups.id],
			name: "modifier_options_group_id_fkey"
		}).onDelete("cascade"),
	index("idx_modifierOptions_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const backups = pgTable("backups", {
	id: text().primaryKey().notNull(),
	data: jsonb().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const modifierGroups = pgTable("modifier_groups", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	type: text().default('single').notNull(),
	required: boolean().default(false).notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_modifier_groups_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const deliveryRunners = pgTable("delivery_runners", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	phone: text().default('').notNull(),
	active: boolean().default(true).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_delivery_runners_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const mealMenus = pgTable("meal_menus", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text().default('').notNull(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	image: text(),
	includesPan: boolean("includes_pan").default(false).notNull(),
	includesBebida: boolean("includes_bebida").default(false).notNull(),
	includesCafe: boolean("includes_cafe").default(false).notNull(),
	active: boolean().default(true).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	extras: jsonb().default([]),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_meal_menus_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const comboSlots = pgTable("combo_slots", {
	id: text().primaryKey().notNull(),
	comboId: text("combo_id").notNull(),
	name: text().notNull(),
	minChoices: integer("min_choices").default(1).notNull(),
	maxChoices: integer("max_choices").default(1).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_combo_slots_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.comboId],
			foreignColumns: [combos.id],
			name: "combo_slots_combo_id_fkey"
		}).onDelete("cascade"),
]);

export const comboSlotItems = pgTable("combo_slot_items", {
	id: text().primaryKey().notNull(),
	slotId: text("slot_id").notNull(),
	productId: text("product_id").notNull(),
	surcharge: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_combo_slot_items_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "combo_slot_items_product_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.slotId],
			foreignColumns: [comboSlots.id],
			name: "combo_slot_items_slot_id_fkey"
		}).onDelete("cascade"),
]);

export const comboItems = pgTable("combo_items", {
	id: serial().primaryKey().notNull(),
	comboId: text("combo_id").notNull(),
	productId: text("product_id").notNull(),
	quantity: integer().default(1).notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_combo_items_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.comboId],
			foreignColumns: [combos.id],
			name: "combo_items_combo_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "combo_items_product_id_fkey"
		}).onDelete("cascade"),
	unique("combo_items_combo_id_product_id_key").on(table.comboId, table.productId),
]);

export const floorPlan = pgTable("floor_plan", {
	id: integer().default(1).primaryKey().notNull(),
	zones: jsonb().default([]),
	background: jsonb(),
}, (table) => [
	check("floor_plan_id_check", sql`id = 1`),
]);

export const mealMenuSchedules = pgTable("meal_menu_schedules", {
	id: text().primaryKey().notNull(),
	menuId: text("menu_id").notNull(),
	dayOfWeek: integer("day_of_week").notNull(),
	startTime: text("start_time").notNull(),
	endTime: text("end_time").notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.menuId],
			foreignColumns: [mealMenus.id],
			name: "meal_menu_schedules_menu_id_fkey"
		}).onDelete("cascade"),
	index("idx_mealMenuSchedules_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const mealMenuCourses = pgTable("meal_menu_courses", {
	id: text().primaryKey().notNull(),
	menuId: text("menu_id").notNull(),
	name: text().notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.menuId],
			foreignColumns: [mealMenus.id],
			name: "meal_menu_courses_menu_id_fkey"
		}).onDelete("cascade"),
	index("idx_mealMenuCourses_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const gestoriaDocuments = pgTable("gestoria_documents", {
	id: text().primaryKey().notNull(),
	type: text().notNull(),
	fileName: text("file_name").default(''),
	providerName: text("provider_name").default(''),
	providerNif: text("provider_nif").default(''),
	documentDate: text("document_date").default(''),
	confirmed: boolean().default(false),
	isPeriodic: boolean("is_periodic").default(false),
	notes: text().default(''),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	check("gestoria_documents_type_check", sql`type = ANY (ARRAY['expense'::text, 'income'::text])`),
	index("idx_gestoriaDocuments_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const combos = pgTable("combos", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text().default('').notNull(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	image: text(),
	active: boolean().default(true).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	discountPct: numeric("discount_pct", { precision: 5, scale:  2 }).default('0'),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_combos_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
	unique("combos_tenant_id_id_uniq").on(table.id, table.tenantId),
]);

export const productPriceRules = pgTable("product_price_rules", {
	id: text().primaryKey().notNull(),
	productId: text("product_id").notNull(),
	name: text().notNull(),
	active: boolean().default(true).notNull(),
	days: integer().array().default([0, 1, 2, 3, 4, 5, 6]).notNull(),
	startTime: text("start_time").default('00:00').notNull(),
	endTime: text("end_time").default('23:59').notNull(),
	type: text().default('discount_pct').notNull(),
	value: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_product_price_rules_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_price_rules_product_id_fkey"
		}).onDelete("cascade"),
]);

export const mealMenuCourseItems = pgTable("meal_menu_course_items", {
	id: text().primaryKey().notNull(),
	courseId: text("course_id").notNull(),
	productId: text("product_id").notNull(),
	surcharge: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.courseId],
			foreignColumns: [mealMenuCourses.id],
			name: "meal_menu_course_items_course_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "meal_menu_course_items_product_id_fkey"
		}).onDelete("cascade"),
	index("idx_mealMenuCourseItems_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const waitlist = pgTable("waitlist", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	phone: text().default(''),
	pax: integer().default(2).notNull(),
	status: text().default('waiting'),
	calledCount: integer("called_count").default(0),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	calledAt: bigint("called_at", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	seatedAt: bigint("seated_at", { mode: "number" }),
	tableId: text("table_id").default(''),
	position: integer().default(0).notNull(),
	notes: text().default(''),
	source: text().default('manual'),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_waitlist_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
	check("waitlist_source_check", sql`source = ANY (ARRAY['manual'::text, 'online'::text, 'qr'::text])`),
	check("waitlist_status_check", sql`status = ANY (ARRAY['waiting'::text, 'called'::text, 'seated'::text, 'cancelled'::text, 'noshow'::text])`),
]);

export const gestoriaPayrolls = pgTable("gestoria_payrolls", {
	id: text().primaryKey().notNull(),
	employeeName: text("employee_name").notNull(),
	employeeNif: text("employee_nif").notNull(),
	month: integer().notNull(),
	year: integer().notNull(),
	grossAmount: numeric("gross_amount", { precision: 10, scale:  2 }).notNull(),
	irpfWithholding: numeric("irpf_withholding", { precision: 10, scale:  2 }).notNull(),
	socialSecurityWorker: numeric("social_security_worker", { precision: 10, scale:  2 }).notNull(),
	socialSecurityCompany: numeric("social_security_company", { precision: 10, scale:  2 }).notNull(),
	netAmount: numeric("net_amount", { precision: 10, scale:  2 }).notNull(),
	notes: text().default(''),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_gestoriaPayrolls_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);


export const gestoriaTaxModels = pgTable("gestoria_tax_models", {
	id: text().primaryKey().notNull(),
	modelCode: text("model_code").notNull(),
	year: integer().notNull(),
	quarter: integer().notNull(),
	status: text().default('draft'),
	data: jsonb().default({}),
	dueDate: text("due_date").default(''),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	unique("gestoria_tax_models_tenant_id_model_code_year_quarter_key").on(table.modelCode, table.quarter, table.tenantId, table.year),
	check("gestoria_tax_models_status_check", sql`status = ANY (ARRAY['draft'::text, 'reviewed'::text, 'presented'::text])`),
	index("idx_gestoriaTaxModels_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const gestoriaAuthorization = pgTable("gestoria_authorization", {
	id: integer().default(1).primaryKey().notNull(),
	accountantName: text("accountant_name").default(''),
	accountantNif: text("accountant_nif").default(''),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	signedAt: bigint("signed_at", { mode: "number" }),
	socialSecurityRed: boolean("social_security_red").default(false),
	revoked: boolean().default(false),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	revokedAt: bigint("revoked_at", { mode: "number" }),
	documentPdf: text("document_pdf").default(''),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	check("gestoria_authorization_id_check", sql`id = 1`),
	index("idx_gestoriaAuthorization_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const kdsAuditLog = pgTable("kds_audit_log", {
	id: serial().primaryKey().notNull(),
	action: text().notNull(),
	details: jsonb().default({}),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_kdsAuditLog_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);


export const reservationRecurring = pgTable("reservation_recurring", {
	id: text().primaryKey().notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
	name: text().notNull(),
	weekday: integer().notNull(),
	time: text().notNull(),
	pax: integer().default(2).notNull(),
	phone: text().default(''),
	notes: text().default(''),
	zone: text().default(''),
	tableId: text("table_id").default(''),
	active: boolean().default(true),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => [
	check("reservation_recurring_weekday_check", sql`(weekday >= 0) AND (weekday <= 6)`),
	index("idx_reservationRecurring_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const reservations = pgTable("reservations", {
	id: text().primaryKey().notNull(),
	date: text().notNull(),
	time: text().notNull(),
	pax: integer().notNull(),
	name: text().notNull(),
	phone: text().default(''),
	email: text().default(''),
	status: text().default('pendiente'),
	zone: text().default(''),
	notes: text().default(''),
	tableId: text("table_id").default(''),
	customerId: text("customer_id").default(''),
	depositAmount: numeric("deposit_amount", { precision: 10, scale:  2 }).default('0'),
	depositPaid: boolean("deposit_paid").default(false),
	source: text().default('manual'),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_reservations_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
	check("reservations_source_check", sql`source = ANY (ARRAY['manual'::text, 'online'::text, 'qr'::text])`),
	check("reservations_status_check", sql`status = ANY (ARRAY['pendiente'::text, 'confirmada'::text, 'sentada'::text, 'noshow'::text, 'cancelada'::text])`),
]);

export const gestoriaDocumentLines = pgTable("gestoria_document_lines", {
	id: text().primaryKey().notNull(),
	documentId: text("document_id").notNull(),
	description: text().notNull(),
	category: text().default(''),
	baseAmount: numeric("base_amount", { precision: 10, scale:  2 }).notNull(),
	vatRate: numeric("vat_rate", { precision: 5, scale:  2 }).notNull(),
	vatAmount: numeric("vat_amount", { precision: 10, scale:  2 }).notNull(),
	withholding: numeric({ precision: 10, scale:  2 }).default('0'),
	zone: text().default('spain'),
	type: text().default('good'),
	sortOrder: integer("sort_order").default(0),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.documentId],
			foreignColumns: [gestoriaDocuments.id],
			name: "gestoria_document_lines_document_id_fkey"
		}).onDelete("cascade"),
	check("gestoria_document_lines_type_check", sql`type = ANY (ARRAY['good'::text, 'service'::text])`),
	check("gestoria_document_lines_zone_check", sql`zone = ANY (ARRAY['spain'::text, 'eu'::text, 'outside_eu'::text])`),
	index("idx_gestoriaDocumentLines_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const suppliers = pgTable("suppliers", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	contact: text().default(''),
	phone: text().default(''),
	email: text().default(''),
	nif: text().default(''),
	address: text().default(''),
	paymentTerms: text("payment_terms").default(''),
	notes: text().default(''),
	active: boolean().default(true),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_suppliers_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const shiftObjectives = pgTable("shift_objectives", {
	id: serial().primaryKey().notNull(),
	dayOfWeek: integer("day_of_week").notNull(),
	startTime: text("start_time").notNull(),
	endTime: text("end_time").notNull(),
	position: text().default(''),
	minPeople: integer("min_people").default(1),
	maxPeople: integer("max_people").default(3),
});

export const timeOffRequests = pgTable("time_off_requests", {
	id: text().primaryKey().notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
	employeeId: text("employee_id").notNull(),
	employeeName: text("employee_name").notNull(),
	reason: text().notNull(),
	fromDate: text("from_date").notNull(),
	toDate: text("to_date").notNull(),
	notes: text().default(''),
	status: text().default('pending'),
	resolvedBy: text("resolved_by").default(''),
	resolvedNote: text("resolved_note").default(''),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	resolvedAt: bigint("resolved_at", { mode: "number" }),
}, (table) => [
	index("idx_timeOffRequests_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);


export const employeeShifts = pgTable("employee_shifts", {
	id: text().primaryKey().notNull(),
	employeeId: text("employee_id").notNull(),
	employeeName: text("employee_name").notNull(),
	date: text().notNull(),
	startTime: text("start_time").notNull(),
	endTime: text("end_time").notNull(),
	position: text().default(''),
	notes: text().default(''),
	color: text().default(''),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_employee_shifts_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
	index("idx_shifts_date").using("btree", table.date.asc().nullsLast().op("text_ops")),
	index("idx_shifts_employee").using("btree", table.employeeId.asc().nullsLast().op("text_ops")),
]);

export const clockinCorrections = pgTable("clockin_corrections", {
	id: serial().primaryKey().notNull(),
	clockinId: integer("clockin_id").default(0),
	employeeId: text("employee_id").notNull(),
	employeeName: text("employee_name").default(''),
	requestedAction: text("requested_action").default(''),
	reason: text().default(''),
	status: text().default('pending'),
	resolvedBy: text("resolved_by").default(''),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const deliveryZones = pgTable("delivery_zones", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	radiusKm: numeric("radius_km", { precision: 10, scale:  2 }).default('0'),
	cost: numeric({ precision: 10, scale:  2 }).default('0'),
	minOrder: numeric("min_order", { precision: 10, scale:  2 }).default('0'),
	estimatedMinutes: integer("estimated_minutes").default(30),
	active: boolean().default(true),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_delivery_zones_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const clockinLogs = pgTable("clockin_logs", {
	id: serial().primaryKey().notNull(),
	employeeId: text("employee_id").notNull(),
	employeeName: text("employee_name").notNull(),
	action: text().notNull(),
	method: text().default('pin'),
	clockinDate: text("clockin_date").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	edited: boolean().default(false),
	editedBy: text("edited_by").default(''),
	editReason: text("edit_reason").default(''),
	signature: text().default(''),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_clockin_logs_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const supplierPriceHistory = pgTable("supplier_price_history", {
	id: serial().primaryKey().notNull(),
	catalogId: integer("catalog_id").notNull(),
	supplierId: text("supplier_id").notNull(),
	productId: text("product_id").notNull(),
	packPrice: numeric("pack_price", { precision: 10, scale:  4 }).notNull(),
	packSize: numeric("pack_size", { precision: 10, scale:  2 }).default('1').notNull(),
	pricePerUnit: numeric("price_per_unit", { precision: 10, scale:  6 }).notNull(),
	source: text().default('manual'),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.catalogId],
			foreignColumns: [supplierCatalog.id],
			name: "supplier_price_history_catalog_id_fkey"
		}).onDelete("cascade"),
	check("supplier_price_history_source_check", sql`source = ANY (ARRAY['manual'::text, 'receipt'::text])`),
]);

export const recipes = pgTable("recipes", {
	id: text().primaryKey().notNull(),
	productId: text("product_id").notNull(),
	productName: text("product_name").notNull(),
	costPerUnit: numeric("cost_per_unit", { precision: 10, scale:  4 }).default('0').notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	updatedAt: bigint("updated_at", { mode: "number" }).default(0).notNull(),
	yieldQty: numeric("yield_qty", { precision: 10, scale:  2 }).default('1').notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_recipes_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "recipes_product_id_fkey"
		}).onDelete("cascade"),
	unique("recipes_product_id_key").on(table.productId),
]);

export const modifierRecipes = pgTable("modifier_recipes", {
	id: text().primaryKey().notNull(),
	modifierOptionId: text("modifier_option_id").notNull(),
	modifierName: text("modifier_name").notNull(),
	costPerUnit: numeric("cost_per_unit", { precision: 10, scale:  4 }).default('0').notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	updatedAt: bigint("updated_at", { mode: "number" }).default(0).notNull(),
});

export const modifierRecipeIngredients = pgTable("modifier_recipe_ingredients", {
	id: serial().primaryKey().notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
	modifierRecipeId: text("modifier_recipe_id").notNull(),
	ingredientId: text("ingredient_id").notNull(),
	ingredientName: text("ingredient_name").notNull(),
	quantity: numeric({ precision: 10, scale:  4 }).notNull(),
	unit: text().default('kg').notNull(),
	costPerUnit: numeric("cost_per_unit", { precision: 10, scale:  4 }).default('0').notNull(),
	totalCost: numeric("total_cost", { precision: 10, scale:  4 }).default('0').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.ingredientId],
			foreignColumns: [products.id],
			name: "modifier_recipe_ingredients_ingredient_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.modifierRecipeId],
			foreignColumns: [modifierRecipes.id],
			name: "modifier_recipe_ingredients_modifier_recipe_id_fkey"
		}).onDelete("cascade"),
	index("idx_modifierRecipeIngredients_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const productionIngredients = pgTable("production_ingredients", {
	id: serial().primaryKey().notNull(),
	productionId: text("production_id").notNull(),
	ingredientId: text("ingredient_id").notNull(),
	ingredientName: text("ingredient_name").notNull(),
	quantity: numeric({ precision: 10, scale:  4 }).notNull(),
	costPerUnit: numeric("cost_per_unit", { precision: 10, scale:  4 }).notNull(),
	totalCost: numeric("total_cost", { precision: 10, scale:  4 }).notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_production_ingredients_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.ingredientId],
			foreignColumns: [products.id],
			name: "production_ingredients_ingredient_id_fkey"
		}),
	foreignKey({
			columns: [table.productionId],
			foreignColumns: [productions.id],
			name: "production_ingredients_production_id_fkey"
		}).onDelete("cascade"),
]);

export const recipeIngredients = pgTable("recipe_ingredients", {
	id: serial().primaryKey().notNull(),
	recipeId: text("recipe_id").notNull(),
	ingredientId: text("ingredient_id").notNull(),
	ingredientName: text("ingredient_name").notNull(),
	quantity: numeric({ precision: 10, scale:  4 }).notNull(),
	unit: text().default('kg').notNull(),
	costPerUnit: numeric("cost_per_unit", { precision: 10, scale:  4 }).default('0').notNull(),
	totalCost: numeric("total_cost", { precision: 10, scale:  4 }).default('0').notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_recipe_ingredients_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.ingredientId],
			foreignColumns: [products.id],
			name: "recipe_ingredients_ingredient_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.recipeId],
			foreignColumns: [recipes.id],
			name: "recipe_ingredients_recipe_id_fkey"
		}).onDelete("cascade"),
]);

export const supplierCatalog = pgTable("supplier_catalog", {
	id: serial().primaryKey().notNull(),
	supplierId: text("supplier_id").notNull(),
	productId: text("product_id").notNull(),
	sku: text().default(''),
	price: numeric({ precision: 10, scale:  4 }).notNull(),
	packSize: numeric("pack_size", { precision: 10, scale:  2 }).default('1'),
	minOrder: numeric("min_order", { precision: 10, scale:  2 }).default('0'),
	deliveryDays: integer("delivery_days").default(0),
	isPreferred: boolean("is_preferred").default(false),
	active: boolean().default(true),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	uniqueIndex("idx_supplier_catalog_preferred").using("btree", table.productId.asc().nullsLast().op("text_ops")).where(sql`(is_preferred = true)`),
	index("idx_supplier_catalog_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "supplier_catalog_product_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.supplierId],
			foreignColumns: [suppliers.id],
			name: "supplier_catalog_supplier_id_fkey"
		}).onDelete("cascade"),
	unique("supplier_catalog_supplier_id_product_id_key").on(table.productId, table.supplierId),
]);

export const productions = pgTable("productions", {
	id: text().primaryKey().notNull(),
	productId: text("product_id").notNull(),
	productName: text("product_name").notNull(),
	quantity: numeric({ precision: 10, scale:  2 }).notNull(),
	costPerUnit: numeric("cost_per_unit", { precision: 10, scale:  4 }).notNull(),
	totalCost: numeric("total_cost", { precision: 10, scale:  2 }).notNull(),
	location: text().default('Cocina').notNull(),
	batchNumber: text("batch_number").default(''),
	expiryDate: text("expiry_date"),
	notes: text().default(''),
	status: text().default('active').notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	producedAt: bigint("produced_at", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	anuladoAt: bigint("anulado_at", { mode: "number" }),
	anuladoReason: text("anulado_reason").default(''),
	anuladoBy: text("anulado_by").default(''),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_productions_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "productions_product_id_fkey"
		}),
	check("productions_status_check", sql`status = ANY (ARRAY['active'::text, 'anulado'::text])`),
]);

export const autoOrderSettings = pgTable("auto_order_settings", {
	key: text().primaryKey().notNull(),
	value: text().default('').notNull(),
});

export const buffetConfig = pgTable("buffet_config", {
	id: text().default('default').primaryKey().notNull(),
	enabled: boolean().default(false),
	timeLimit: integer("time_limit").default(90),
	cooldown: integer().default(5),
	roundCap: integer("round_cap").default(3),
	coverPrice: numeric("cover_price", { precision: 10, scale:  2 }).default('25.00'),
	childPrice: numeric("child_price", { precision: 10, scale:  2 }).default('12.50'),
	seniorPrice: numeric("senior_price", { precision: 10, scale:  2 }).default('18.00'),
	childMaxAge: integer("child_max_age").default(12),
	seniorMinAge: integer("senior_min_age").default(65),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pausedUntil: bigint("paused_until", { mode: "number" }).default(0),
	staffOpensTable: boolean("staff_opens_table").default(true),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_buffet_config_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const buffetSessions = pgTable("buffet_sessions", {
	id: text().primaryKey().notNull(),
	tableId: text("table_id").notNull(),
	tableName: text("table_name").notNull(),
	adultCount: integer("adult_count").default(1).notNull(),
	childCount: integer("child_count").default(0).notNull(),
	seniorCount: integer("senior_count").default(0).notNull(),
	round: integer().default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	cooldownUntil: bigint("cooldown_until", { mode: "number" }).default(0),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	startedAt: bigint("started_at", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	closedAt: bigint("closed_at", { mode: "number" }),
	status: text().default('active').notNull(),
	voidReason: text("void_reason").default(''),
	voidedBy: text("voided_by").default(''),
	closedBy: text("closed_by").default(''),
	notes: text().default(''),
	coverPriceSnapshot: numeric("cover_price_snapshot", { precision: 10, scale:  2 }).notNull(),
	childPriceSnapshot: numeric("child_price_snapshot", { precision: 10, scale:  2 }).default('0').notNull(),
	seniorPriceSnapshot: numeric("senior_price_snapshot", { precision: 10, scale:  2 }).default('0').notNull(),
	overrideTimeLimit: integer("override_time_limit").default(0),
	overrideCooldown: integer("override_cooldown").default(0),
	overrideRoundCap: integer("override_round_cap").default(0),
	overrideCoverPrice: numeric("override_cover_price", { precision: 10, scale:  2 }).default('0'),
	orderId: text("order_id"),
	estimatedTotal: numeric("estimated_total", { precision: 10, scale:  2 }).default('0'),
	wasteAmount: numeric("waste_amount", { precision: 10, scale:  2 }).default('0'),
	premiumConsumed: integer("premium_consumed").default(0),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_buffet_sessions_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_buffet_sessions_table").using("btree", table.tableId.asc().nullsLast().op("text_ops")),
	index("idx_buffet_sessions_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.tableId],
			foreignColumns: [tables.id],
			name: "buffet_sessions_table_id_fkey"
		}),
]);

export const productBatches = pgTable("product_batches", {
	id: text().primaryKey().notNull(),
	productId: text("product_id").notNull(),
	albaranId: text("albaran_id"),
	batchNumber: text("batch_number").notNull(),
	quantity: numeric({ precision: 10, scale:  2 }).notNull(),
	remainingQuantity: numeric("remaining_quantity", { precision: 10, scale:  2 }).notNull(),
	location: text().default('Almacén').notNull(),
	costPerUnit: numeric("cost_per_unit", { precision: 10, scale:  4 }).notNull(),
	expiryDate: text("expiry_date"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	receivedAt: bigint("received_at", { mode: "number" }).notNull(),
	status: text().default('active').notNull(),
	active: boolean().default(true),
}, (table) => [
	index("idx_batches_expiry").using("btree", table.expiryDate.asc().nullsLast().op("text_ops")),
	index("idx_batches_location").using("btree", table.location.asc().nullsLast().op("text_ops")),
	index("idx_batches_product").using("btree", table.productId.asc().nullsLast().op("text_ops")),
	index("idx_batches_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.albaranId],
			foreignColumns: [albaranes.id],
			name: "product_batches_albaran_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_batches_product_id_fkey"
		}).onDelete("cascade"),
	check("product_batches_status_check", sql`status = ANY (ARRAY['active'::text, 'depleted'::text, 'expired'::text])`),
]);

export const purchaseOrderLines = pgTable("purchase_order_lines", {
	id: serial().primaryKey().notNull(),
	orderId: text("order_id").notNull(),
	productId: text("product_id").notNull(),
	productName: text("product_name").notNull(),
	quantity: numeric({ precision: 10, scale:  2 }).notNull(),
	pricePerUnit: numeric("price_per_unit", { precision: 10, scale:  4 }).notNull(),
	supplierSku: text("supplier_sku").default(''),
	receivedQty: numeric("received_qty", { precision: 10, scale:  2 }).default('0'),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_purchase_order_lines_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [purchaseOrders.id],
			name: "purchase_order_lines_order_id_fkey"
		}).onDelete("cascade"),
]);

export const buffetRounds = pgTable("buffet_rounds", {
	id: text().primaryKey().notNull(),
	sessionId: text("session_id").notNull(),
	roundNumber: integer("round_number").notNull(),
	items: jsonb().default([]),
	itemCount: integer("item_count").default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	requestedAt: bigint("requested_at", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	deliveredAt: bigint("delivered_at", { mode: "number" }),
	status: text().default('pending').notNull(),
}, (table) => [
	index("idx_buffet_rounds_session").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [buffetSessions.id],
			name: "buffet_rounds_session_id_fkey"
		}).onDelete("cascade"),
]);

export const buffetWaste = pgTable("buffet_waste", {
	id: text().primaryKey().notNull(),
	sessionId: text("session_id").notNull(),
	tableId: text("table_id").notNull(),
	productId: text("product_id").notNull(),
	productName: text("product_name").notNull(),
	charge: numeric({ precision: 10, scale:  2 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	employeeId: text("employee_id"),
}, (table) => [
	index("idx_buffet_waste_session").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [buffetSessions.id],
			name: "buffet_waste_session_id_fkey"
		}).onDelete("cascade"),
]);

export const albaranes = pgTable("albaranes", {
	id: text().primaryKey().notNull(),
	supplierId: text("supplier_id").notNull(),
	supplierName: text("supplier_name").notNull(),
	albaranNumber: text("albaran_number").notNull(),
	deliveryDate: text("delivery_date").notNull(),
	invoiceNumber: text("invoice_number").default(''),
	notes: text().default(''),
	totalAmount: numeric("total_amount", { precision: 10, scale:  2 }).default('0'),
	totalNet: numeric("total_net", { precision: 10, scale:  2 }).default('0'),
	totalIva: numeric("total_iva", { precision: 10, scale:  2 }).default('0'),
	headerDiscountPct: numeric("header_discount_pct", { precision: 5, scale:  2 }).default('0'),
	headerDiscountAmount: numeric("header_discount_amount", { precision: 10, scale:  2 }).default('0'),
	recargoEquivalenciaPct: numeric("recargo_equivalencia_pct", { precision: 5, scale:  2 }).default('0'),
	recargoAmount: numeric("recargo_amount", { precision: 10, scale:  2 }).default('0'),
	portesAmount: numeric("portes_amount", { precision: 10, scale:  2 }).default('0'),
	status: text().default('draft').notNull(),
	receivedBy: text("received_by").default(''),
	anuladoBy: text("anulado_by").default(''),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	anuladoAt: bigint("anulado_at", { mode: "number" }),
	anuladoReason: text("anulado_reason").default(''),
	linkedPurchaseOrderId: text("linked_purchase_order_id").default(''),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	updatedAt: bigint("updated_at", { mode: "number" }),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_albaranes_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
	check("albaranes_status_check", sql`status = ANY (ARRAY['draft'::text, 'confirmed'::text, 'anulado'::text])`),
]);

export const albaranLines = pgTable("albaran_lines", {
	id: serial().primaryKey().notNull(),
	albaranId: text("albaran_id").notNull(),
	productId: text("product_id").notNull(),
	productName: text("product_name").notNull(),
	quantity: numeric({ precision: 10, scale:  2 }).notNull(),
	packSize: numeric("pack_size", { precision: 10, scale:  2 }).default('1'),
	pricePerPack: numeric("price_per_pack", { precision: 10, scale:  4 }).notNull(),
	pricePerUnit: numeric("price_per_unit", { precision: 10, scale:  4 }).notNull(),
	supplierSku: text("supplier_sku").default(''),
	ivaPct: numeric("iva_pct", { precision: 5, scale:  2 }).default('0'),
	lineDiscountPct: numeric("line_discount_pct", { precision: 5, scale:  2 }).default('0'),
	lineDiscountAmount: numeric("line_discount_amount", { precision: 10, scale:  2 }).default('0'),
	subtotal: numeric({ precision: 10, scale:  2 }).notNull(),
	ivaAmount: numeric("iva_amount", { precision: 10, scale:  2 }).default('0'),
	totalLine: numeric("total_line", { precision: 10, scale:  2 }).notNull(),
	batchNumber: text("batch_number").default(''),
	expiryDate: text("expiry_date").default(''),
	location: text().default('Almacén').notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_albaran_lines_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.albaranId],
			foreignColumns: [albaranes.id],
			name: "albaran_lines_albaran_id_fkey"
		}).onDelete("cascade"),
]);

export const tenants = pgTable("tenants", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	logoUrl: text("logo_url").default(''),
	address: text().default(''),
	phone: text().default(''),
	email: text().default(''),
	nif: text().default(''),
	active: boolean().default(true).notNull(),
	config: jsonb().default({}),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => [
	unique("tenants_slug_key").on(table.slug),
]);

export const purchaseOrders = pgTable("purchase_orders", {
	id: text().primaryKey().notNull(),
	supplierId: text("supplier_id").notNull(),
	supplierName: text("supplier_name").notNull(),
	status: text().default('draft').notNull(),
	expectedDate: text("expected_date").default(''),
	notes: text().default(''),
	createdBy: text("created_by").default(''),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	updatedAt: bigint("updated_at", { mode: "number" }),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_purchase_orders_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
	check("purchase_orders_status_check", sql`status = ANY (ARRAY['draft'::text, 'sent'::text, 'partial'::text, 'received'::text])`),
]);

export const qrOrders = pgTable("qr_orders", {
	id: text().primaryKey().notNull(),
	tableId: text("table_id").notNull(),
	items: jsonb().default([]).notNull(),
	orderStatus: text("order_status").default('pending'),
	paymentIntentId: text("payment_intent_id").default(''),
	amount: numeric({ precision: 10, scale:  2 }).default('0'),
	customerName: text("customer_name").default(''),
	customerPhone: text("customer_phone").default(''),
	notes: text().default(''),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
	modality: text().default('dinein'),
	address: text().default(''),
	addressLat: numeric("address_lat", { precision: 10, scale:  7 }),
	addressLng: numeric("address_lng", { precision: 10, scale:  7 }),
	zoneId: text("zone_id").default(''),
	deliveryCost: numeric("delivery_cost", { precision: 10, scale:  2 }).default('0'),
	customerEmail: text("customer_email").default(''),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	scheduledAt: bigint("scheduled_at", { mode: "number" }),
	accepted: boolean().default(false),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_qr_orders_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
	check("qr_orders_order_status_new_check", sql`order_status = ANY (ARRAY['pending'::text, 'paid'::text, 'confirmed'::text, 'preparing'::text, 'ready'::text, 'en_camino'::text, 'delivered'::text, 'cancelled'::text])`),
]);

export const settings = pgTable("settings", {
	key: text().notNull(),
	value: text().notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_settings_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
	primaryKey({ columns: [table.key, table.tenantId], name: "settings_pkey"}),
]);

export const productModifiers = pgTable("product_modifiers", {
	productId: text("product_id").notNull(),
	groupId: text("group_id").notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [modifierGroups.id],
			name: "product_modifiers_group_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.groupId, table.productId], name: "product_modifiers_pkey"}),
	index("idx_productModifiers_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const gestoriaSettings = pgTable("gestoria_settings", {
	key: text().notNull(),
	value: text().notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	primaryKey({ columns: [table.key, table.tenantId], name: "gestoria_settings_pkey"}),
	index("idx_gestoriaSettings_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const ticketCounters = pgTable("ticket_counters", {
	tenantId: text("tenant_id").notNull(),
	year: integer().notNull(),
	counter: integer().default(0).notNull(),
}, (table) => [
	primaryKey({ columns: [table.tenantId, table.year], name: "ticket_counters_pkey"}),
	index("idx_ticketCounters_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const productStock = pgTable("product_stock", {
	productId: text("product_id").notNull(),
	location: text().notNull(),
	stock: integer().default(0).notNull(),
	lowStock: integer("low_stock").default(5).notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_product_stock_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_stock_product_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.location, table.productId], name: "product_stock_pkey"}),
]);

export const categories = pgTable("categories", {
	id: text().notNull(),
	name: text().notNull(),
	sortOrder: integer("sort_order").default(0),
	active: boolean().default(true),
	printerZone: text("printer_zone").default(''),
	showQr: boolean("show_qr").default(true),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_categories_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
	primaryKey({ columns: [table.id, table.tenantId], name: "categories_pkey"}),
	unique("categories_name_key").on(table.name),
	unique("categories_tenant_id_id_uniq").on(table.id, table.tenantId),
]);

export const orders = pgTable("orders", {
	id: text().notNull(),
	tableId: text("table_id").notNull(),
	items: jsonb().default([]).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	employeeName: text("employee_name"),
	source: text().default('tpv'),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_orders_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
	primaryKey({ columns: [table.id, table.tenantId], name: "orders_pkey"}),
	unique("orders_tenant_id_id_uniq").on(table.id, table.tenantId),
]);

export const qrCalls = pgTable("qr_calls", {
	id: text().notNull(),
	tableId: text("table_id").notNull(),
	tableName: text("table_name").default(''),
	zone: text().default(''),
	acknowledged: boolean().default(false),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	primaryKey({ columns: [table.id, table.tenantId], name: "qr_calls_pkey"}),
	unique("qr_calls_tenant_id_id_uniq").on(table.id, table.tenantId),
	index("idx_qrCalls_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const kdsPairings = pgTable("kds_pairings", {
	id: text().notNull(),
	code: text().notNull(),
	label: text().default(''),
	deviceId: text("device_id").default(''),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	revoked: boolean().default(false),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	primaryKey({ columns: [table.id, table.tenantId], name: "kds_pairings_pkey"}),
	unique("kds_pairings_tenant_id_id_uniq").on(table.id, table.tenantId),
	index("idx_kdsPairings_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
]);

export const offers = pgTable("offers", {
	id: text().notNull(),
	name: text().notNull(),
	type: text().default('menu').notNull(),
	days: integer().array().default([1, 2, 3, 4, 5]).notNull(),
	startHour: integer("start_hour").default(13).notNull(),
	endHour: integer("end_hour").default(16).notNull(),
	discountPct: numeric("discount_pct", { precision: 5, scale:  2 }).default('15').notNull(),
	productIds: text("product_ids").array().default([""]).notNull(),
	active: boolean().default(true).notNull(),
	fixedPrice: numeric("fixed_price", { precision: 10, scale:  2 }),
	tenantId: text("tenant_id").default('default').notNull(),
}, (table) => [
	index("idx_offers_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
	primaryKey({ columns: [table.id, table.tenantId], name: "offers_pkey"}),
	unique("offers_tenant_id_id_uniq").on(table.id, table.tenantId),
]);

export const employees = pgTable("employees", {
	id: text().notNull(),
	name: text().notNull(),
	pin: text().default('').notNull(),
	role: text().default('camarero').notNull(),
	personalDiscountEnabled: boolean("personal_discount_enabled").default(false),
	monthlyLimit: numeric("monthly_limit", { precision: 10, scale:  2 }).default('0'),
	monthlyUsed: numeric("monthly_used", { precision: 10, scale:  2 }).default('0'),
	monthlyUsedMonth: text("monthly_used_month").default(''),
	position: text().default(''),
	workType: text("work_type").default(''),
	workPct: numeric("work_pct", { precision: 5, scale:  2 }).default('100'),
	dni: text().default(''),
	notes: text().default(''),
	whatsappCode: text("whatsapp_code").default(''),
	whatsappLinked: boolean("whatsapp_linked").default(false),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }),
	tenantId: text("tenant_id").default('default').notNull(),
	pinHash: text("pin_hash").default(''),
}, (table) => [
	index("idx_employees_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),
	primaryKey({ columns: [table.id, table.tenantId], name: "employees_pkey"}),
	unique("employees_tenant_id_id_uniq").on(table.id, table.tenantId),
]);
