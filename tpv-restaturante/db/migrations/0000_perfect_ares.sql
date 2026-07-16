CREATE TYPE "public"."KitchenStatus" AS ENUM('PENDING', 'IN_PROGRESS', 'DONE');--> statement-breakpoint
CREATE TYPE "public"."level" AS ENUM('pro', 'intermedio', 'iniciacion');--> statement-breakpoint
CREATE TYPE "public"."Plan" AS ENUM('FREE', 'BASIC', 'PRO', 'PREMIUM');--> statement-breakpoint
CREATE TYPE "public"."Role" AS ENUM('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN', 'BAR');--> statement-breakpoint
CREATE TYPE "public"."Station" AS ENUM('KITCHEN', 'BAR');--> statement-breakpoint
CREATE TYPE "public"."TicketStatus" AS ENUM('OPEN', 'PAID', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "access_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"employee_name" text NOT NULL,
	"role" text NOT NULL,
	"entry_point" text NOT NULL,
	"logged_at" bigint NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "albaran_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"albaran_id" text NOT NULL,
	"product_id" text NOT NULL,
	"product_name" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"pack_size" numeric(10, 2) DEFAULT '1',
	"price_per_pack" numeric(10, 4) NOT NULL,
	"price_per_unit" numeric(10, 4) NOT NULL,
	"supplier_sku" text DEFAULT '',
	"iva_pct" numeric(5, 2) DEFAULT '0',
	"line_discount_pct" numeric(5, 2) DEFAULT '0',
	"line_discount_amount" numeric(10, 2) DEFAULT '0',
	"subtotal" numeric(10, 2) NOT NULL,
	"iva_amount" numeric(10, 2) DEFAULT '0',
	"total_line" numeric(10, 2) NOT NULL,
	"batch_number" text DEFAULT '',
	"expiry_date" text DEFAULT '',
	"location" text DEFAULT 'Almacén' NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "albaranes" (
	"id" text PRIMARY KEY NOT NULL,
	"supplier_id" text NOT NULL,
	"supplier_name" text NOT NULL,
	"albaran_number" text NOT NULL,
	"delivery_date" text NOT NULL,
	"invoice_number" text DEFAULT '',
	"notes" text DEFAULT '',
	"total_amount" numeric(10, 2) DEFAULT '0',
	"total_net" numeric(10, 2) DEFAULT '0',
	"total_iva" numeric(10, 2) DEFAULT '0',
	"header_discount_pct" numeric(5, 2) DEFAULT '0',
	"header_discount_amount" numeric(10, 2) DEFAULT '0',
	"recargo_equivalencia_pct" numeric(5, 2) DEFAULT '0',
	"recargo_amount" numeric(10, 2) DEFAULT '0',
	"portes_amount" numeric(10, 2) DEFAULT '0',
	"status" text DEFAULT 'draft' NOT NULL,
	"received_by" text DEFAULT '',
	"anulado_by" text DEFAULT '',
	"anulado_at" bigint,
	"anulado_reason" text DEFAULT '',
	"linked_purchase_order_id" text DEFAULT '',
	"created_at" bigint NOT NULL,
	"updated_at" bigint,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	CONSTRAINT "albaranes_status_check" CHECK (status = ANY (ARRAY['draft'::text, 'confirmed'::text, 'anulado'::text]))
);
--> statement-breakpoint
CREATE TABLE "Attendance" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"checkIn" timestamp(3) NOT NULL,
	"checkOut" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "auto_order_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backpacks" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"level" "level" NOT NULL,
	"price" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "backups" (
	"id" text PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bearings" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"level" "level" NOT NULL,
	"price" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "belts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"level" "level" NOT NULL,
	"price" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "buffet_config" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"enabled" boolean DEFAULT false,
	"time_limit" integer DEFAULT 90,
	"cooldown" integer DEFAULT 5,
	"round_cap" integer DEFAULT 3,
	"cover_price" numeric(10, 2) DEFAULT '25.00',
	"child_price" numeric(10, 2) DEFAULT '12.50',
	"senior_price" numeric(10, 2) DEFAULT '18.00',
	"child_max_age" integer DEFAULT 12,
	"senior_min_age" integer DEFAULT 65,
	"paused_until" bigint DEFAULT 0,
	"staff_opens_table" boolean DEFAULT true,
	"updated_at" bigint NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buffet_rounds" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"round_number" integer NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb,
	"item_count" integer DEFAULT 0 NOT NULL,
	"requested_at" bigint NOT NULL,
	"delivered_at" bigint,
	"status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buffet_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"table_id" text NOT NULL,
	"table_name" text NOT NULL,
	"adult_count" integer DEFAULT 1 NOT NULL,
	"child_count" integer DEFAULT 0 NOT NULL,
	"senior_count" integer DEFAULT 0 NOT NULL,
	"round" integer DEFAULT 0 NOT NULL,
	"cooldown_until" bigint DEFAULT 0,
	"started_at" bigint NOT NULL,
	"closed_at" bigint,
	"status" text DEFAULT 'active' NOT NULL,
	"void_reason" text DEFAULT '',
	"voided_by" text DEFAULT '',
	"closed_by" text DEFAULT '',
	"notes" text DEFAULT '',
	"cover_price_snapshot" numeric(10, 2) NOT NULL,
	"child_price_snapshot" numeric(10, 2) DEFAULT '0' NOT NULL,
	"senior_price_snapshot" numeric(10, 2) DEFAULT '0' NOT NULL,
	"override_time_limit" integer DEFAULT 0,
	"override_cooldown" integer DEFAULT 0,
	"override_round_cap" integer DEFAULT 0,
	"override_cover_price" numeric(10, 2) DEFAULT '0',
	"order_id" text,
	"estimated_total" numeric(10, 2) DEFAULT '0',
	"waste_amount" numeric(10, 2) DEFAULT '0',
	"premium_consumed" integer DEFAULT 0,
	"tenant_id" text DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buffet_waste" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"table_id" text NOT NULL,
	"product_id" text NOT NULL,
	"product_name" text NOT NULL,
	"charge" numeric(10, 2) NOT NULL,
	"created_at" bigint NOT NULL,
	"employee_id" text
);
--> statement-breakpoint
CREATE TABLE "bushings" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"level" "level" NOT NULL,
	"price" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "cancelled_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" text,
	"table_id" text,
	"table_name" text,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total" numeric(10, 2),
	"employee_name" text,
	"reason" text,
	"cancelled_at" bigint NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "caps" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"level" "level" NOT NULL,
	"price" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0,
	"active" boolean DEFAULT true,
	"printer_zone" text DEFAULT '',
	"show_qr" boolean DEFAULT true,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	CONSTRAINT "categories_pkey" PRIMARY KEY("id","tenant_id"),
	CONSTRAINT "categories_name_key" UNIQUE("name"),
	CONSTRAINT "categories_tenant_id_id_uniq" UNIQUE("id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "Category" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clockin_corrections" (
	"id" serial PRIMARY KEY NOT NULL,
	"clockin_id" integer DEFAULT 0,
	"employee_id" text NOT NULL,
	"employee_name" text DEFAULT '',
	"requested_action" text DEFAULT '',
	"reason" text DEFAULT '',
	"status" text DEFAULT 'pending',
	"resolved_by" text DEFAULT '',
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clockin_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"employee_name" text NOT NULL,
	"action" text NOT NULL,
	"method" text DEFAULT 'pin',
	"clockin_date" text NOT NULL,
	"created_at" bigint NOT NULL,
	"edited" boolean DEFAULT false,
	"edited_by" text DEFAULT '',
	"edit_reason" text DEFAULT '',
	"signature" text DEFAULT '',
	"tenant_id" text DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "closures" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	"date" text NOT NULL,
	"total" numeric(10, 2) DEFAULT '0' NOT NULL,
	"ticket_count" integer DEFAULT 0 NOT NULL,
	"avg_ticket" numeric(10, 2) DEFAULT '0' NOT NULL,
	"methods" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"employees" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sales_ids" text[] DEFAULT '{""}' NOT NULL,
	"closed_at" bigint NOT NULL,
	"employee_name" text DEFAULT '' NOT NULL,
	"cuadratura" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "combo_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"combo_id" text NOT NULL,
	"product_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	CONSTRAINT "combo_items_combo_id_product_id_key" UNIQUE("combo_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "combo_slot_items" (
	"id" text PRIMARY KEY NOT NULL,
	"slot_id" text NOT NULL,
	"product_id" text NOT NULL,
	"surcharge" numeric(10, 2) DEFAULT '0' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "combo_slots" (
	"id" text PRIMARY KEY NOT NULL,
	"combo_id" text NOT NULL,
	"name" text NOT NULL,
	"min_choices" integer DEFAULT 1 NOT NULL,
	"max_choices" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "combos" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"image" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" bigint NOT NULL,
	"discount_pct" numeric(5, 2) DEFAULT '0',
	"tenant_id" text DEFAULT 'default' NOT NULL,
	CONSTRAINT "combos_tenant_id_id_uniq" UNIQUE("id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "delivery_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text,
	"table_id" text,
	"customer_name" text NOT NULL,
	"customer_phone" text DEFAULT '' NOT NULL,
	"address" text NOT NULL,
	"address_lat" numeric(10, 7),
	"address_lng" numeric(10, 7),
	"notes" text DEFAULT '' NOT NULL,
	"runner_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" bigint NOT NULL,
	"estimated_at" bigint,
	"delivered_at" bigint,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"platform_order_id" text DEFAULT '',
	"platform_status" text DEFAULT '',
	"tenant_id" text DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_runners" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" bigint NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"delivery_id" text NOT NULL,
	"status" text NOT NULL,
	"location_lat" numeric(10, 7),
	"location_lng" numeric(10, 7),
	"note" text DEFAULT '' NOT NULL,
	"created_at" bigint NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_zones" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"radius_km" numeric(10, 2) DEFAULT '0',
	"cost" numeric(10, 2) DEFAULT '0',
	"min_order" numeric(10, 2) DEFAULT '0',
	"estimated_minutes" integer DEFAULT 30,
	"active" boolean DEFAULT true,
	"created_at" bigint NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "elbow_pads" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"level" "level" NOT NULL,
	"price" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "employee_shifts" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"employee_name" text NOT NULL,
	"date" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"position" text DEFAULT '',
	"notes" text DEFAULT '',
	"color" text DEFAULT '',
	"created_at" bigint NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_turns" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"employee_name" text NOT NULL,
	"action" text NOT NULL,
	"turn_date" text NOT NULL,
	"time" bigint NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" text NOT NULL,
	"name" text NOT NULL,
	"pin" text DEFAULT '' NOT NULL,
	"role" text DEFAULT 'camarero' NOT NULL,
	"personal_discount_enabled" boolean DEFAULT false,
	"monthly_limit" numeric(10, 2) DEFAULT '0',
	"monthly_used" numeric(10, 2) DEFAULT '0',
	"monthly_used_month" text DEFAULT '',
	"position" text DEFAULT '',
	"work_type" text DEFAULT '',
	"work_pct" numeric(5, 2) DEFAULT '100',
	"dni" text DEFAULT '',
	"notes" text DEFAULT '',
	"whatsapp_code" text DEFAULT '',
	"whatsapp_linked" boolean DEFAULT false,
	"created_at" bigint,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	"pin_hash" text DEFAULT '',
	CONSTRAINT "employees_pkey" PRIMARY KEY("id","tenant_id"),
	CONSTRAINT "employees_tenant_id_id_uniq" UNIQUE("id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "fiskaly_config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "floor_plan" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"zones" jsonb DEFAULT '[]'::jsonb,
	"background" jsonb,
	CONSTRAINT "floor_plan_id_check" CHECK (id = 1)
);
--> statement-breakpoint
CREATE TABLE "gestoria_authorization" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"accountant_name" text DEFAULT '',
	"accountant_nif" text DEFAULT '',
	"signed_at" bigint,
	"social_security_red" boolean DEFAULT false,
	"revoked" boolean DEFAULT false,
	"revoked_at" bigint,
	"document_pdf" text DEFAULT '',
	"tenant_id" text DEFAULT 'default' NOT NULL,
	CONSTRAINT "gestoria_authorization_id_check" CHECK (id = 1)
);
--> statement-breakpoint
CREATE TABLE "gestoria_document_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"description" text NOT NULL,
	"category" text DEFAULT '',
	"base_amount" numeric(10, 2) NOT NULL,
	"vat_rate" numeric(5, 2) NOT NULL,
	"vat_amount" numeric(10, 2) NOT NULL,
	"withholding" numeric(10, 2) DEFAULT '0',
	"zone" text DEFAULT 'spain',
	"type" text DEFAULT 'good',
	"sort_order" integer DEFAULT 0,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	CONSTRAINT "gestoria_document_lines_type_check" CHECK (type = ANY (ARRAY['good'::text, 'service'::text])),
	CONSTRAINT "gestoria_document_lines_zone_check" CHECK (zone = ANY (ARRAY['spain'::text, 'eu'::text, 'outside_eu'::text]))
);
--> statement-breakpoint
CREATE TABLE "gestoria_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"file_name" text DEFAULT '',
	"provider_name" text DEFAULT '',
	"provider_nif" text DEFAULT '',
	"document_date" text DEFAULT '',
	"confirmed" boolean DEFAULT false,
	"is_periodic" boolean DEFAULT false,
	"notes" text DEFAULT '',
	"created_at" bigint NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	CONSTRAINT "gestoria_documents_type_check" CHECK (type = ANY (ARRAY['expense'::text, 'income'::text]))
);
--> statement-breakpoint
CREATE TABLE "gestoria_payrolls" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_name" text NOT NULL,
	"employee_nif" text NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"gross_amount" numeric(10, 2) NOT NULL,
	"irpf_withholding" numeric(10, 2) NOT NULL,
	"social_security_worker" numeric(10, 2) NOT NULL,
	"social_security_company" numeric(10, 2) NOT NULL,
	"net_amount" numeric(10, 2) NOT NULL,
	"notes" text DEFAULT '',
	"created_at" bigint NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gestoria_settings" (
	"key" text NOT NULL,
	"value" text NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	CONSTRAINT "gestoria_settings_pkey" PRIMARY KEY("key","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "gestoria_tax_models" (
	"id" text PRIMARY KEY NOT NULL,
	"model_code" text NOT NULL,
	"year" integer NOT NULL,
	"quarter" integer NOT NULL,
	"status" text DEFAULT 'draft',
	"data" jsonb DEFAULT '{}'::jsonb,
	"due_date" text DEFAULT '',
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	CONSTRAINT "gestoria_tax_models_tenant_id_model_code_year_quarter_key" UNIQUE("model_code","quarter","tenant_id","year"),
	CONSTRAINT "gestoria_tax_models_status_check" CHECK (status = ANY (ARRAY['draft'::text, 'reviewed'::text, 'presented'::text]))
);
--> statement-breakpoint
CREATE TABLE "griptapes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"level" "level" NOT NULL,
	"price" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "hardware" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"level" "level" NOT NULL,
	"price" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "helmets" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"level" "level" NOT NULL,
	"price" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "Ingredient" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"unit" text NOT NULL,
	"stock" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kds_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb,
	"created_at" bigint NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kds_pairings" (
	"id" text NOT NULL,
	"code" text NOT NULL,
	"label" text DEFAULT '',
	"device_id" text DEFAULT '',
	"expires_at" bigint NOT NULL,
	"created_at" bigint NOT NULL,
	"revoked" boolean DEFAULT false,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	CONSTRAINT "kds_pairings_pkey" PRIMARY KEY("id","tenant_id"),
	CONSTRAINT "kds_pairings_tenant_id_id_uniq" UNIQUE("id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "KitchenItem" (
	"id" text PRIMARY KEY NOT NULL,
	"status" "KitchenStatus" DEFAULT 'PENDING' NOT NULL,
	"station" "Station" NOT NULL,
	"ticketItemId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knee_pads" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"level" "level" NOT NULL,
	"price" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "meal_menu_course_items" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"product_id" text NOT NULL,
	"surcharge" numeric(10, 2) DEFAULT '0' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_menu_courses" (
	"id" text PRIMARY KEY NOT NULL,
	"menu_id" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_menu_schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"menu_id" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_menus" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"image" text,
	"includes_pan" boolean DEFAULT false NOT NULL,
	"includes_bebida" boolean DEFAULT false NOT NULL,
	"includes_cafe" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" bigint NOT NULL,
	"extras" jsonb DEFAULT '[]'::jsonb,
	"tenant_id" text DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "_migrations" (
	"name" text PRIMARY KEY NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"applied_at" bigint NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"checksum" text DEFAULT '' NOT NULL,
	"failed" boolean DEFAULT false NOT NULL,
	"error" text DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE "modifier_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'single' NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modifier_options" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"name" text NOT NULL,
	"price_delta" numeric(10, 2) DEFAULT '0' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"stock_deduct" boolean DEFAULT false,
	"stock_article_id" text DEFAULT '',
	"stock_quantity" numeric(10, 4) DEFAULT '0',
	"tenant_id" text DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modifier_recipe_ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"modifier_recipe_id" text NOT NULL,
	"ingredient_id" text NOT NULL,
	"ingredient_name" text NOT NULL,
	"quantity" numeric(10, 4) NOT NULL,
	"unit" text DEFAULT 'kg' NOT NULL,
	"cost_per_unit" numeric(10, 4) DEFAULT '0' NOT NULL,
	"total_cost" numeric(10, 4) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modifier_recipes" (
	"id" text PRIMARY KEY NOT NULL,
	"modifier_option_id" text NOT NULL,
	"modifier_name" text NOT NULL,
	"cost_per_unit" numeric(10, 4) DEFAULT '0' NOT NULL,
	"updated_at" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" text NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'menu' NOT NULL,
	"days" integer[] DEFAULT '{1,2,3,4,5}' NOT NULL,
	"start_hour" integer DEFAULT 13 NOT NULL,
	"end_hour" integer DEFAULT 16 NOT NULL,
	"discount_pct" numeric(5, 2) DEFAULT '15' NOT NULL,
	"product_ids" text[] DEFAULT '{""}' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"fixed_price" numeric(10, 2),
	"tenant_id" text DEFAULT 'default' NOT NULL,
	CONSTRAINT "offers_pkey" PRIMARY KEY("id","tenant_id"),
	CONSTRAINT "offers_tenant_id_id_uniq" UNIQUE("id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text NOT NULL,
	"table_id" text NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" bigint NOT NULL,
	"employee_name" text,
	"source" text DEFAULT 'tpv',
	"tenant_id" text DEFAULT 'default' NOT NULL,
	CONSTRAINT "orders_pkey" PRIMARY KEY("id","tenant_id"),
	CONSTRAINT "orders_tenant_id_id_uniq" UNIQUE("id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "pants" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"level" "level" NOT NULL,
	"price" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "patches" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"level" "level" NOT NULL,
	"price" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "payment_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" text,
	"payment_intent_id" text,
	"operation" text NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'eur' NOT NULL,
	"status" text DEFAULT 'ok' NOT NULL,
	"table_id" text,
	"table_name" text,
	"employee_name" text,
	"source" text,
	"error" text,
	"stripe_response" text,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Product" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"price" double precision NOT NULL,
	"cost" double precision,
	"barcode" text,
	"categoryId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_batches" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"albaran_id" text,
	"batch_number" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"remaining_quantity" numeric(10, 2) NOT NULL,
	"location" text DEFAULT 'Almacén' NOT NULL,
	"cost_per_unit" numeric(10, 4) NOT NULL,
	"expiry_date" text,
	"received_at" bigint NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"active" boolean DEFAULT true,
	CONSTRAINT "product_batches_status_check" CHECK (status = ANY (ARRAY['active'::text, 'depleted'::text, 'expired'::text]))
);
--> statement-breakpoint
CREATE TABLE "product_modifiers" (
	"product_id" text NOT NULL,
	"group_id" text NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	CONSTRAINT "product_modifiers_pkey" PRIMARY KEY("group_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "product_price_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"days" integer[] DEFAULT '{0,1,2,3,4,5,6}' NOT NULL,
	"start_time" text DEFAULT '00:00' NOT NULL,
	"end_time" text DEFAULT '23:59' NOT NULL,
	"type" text DEFAULT 'discount_pct' NOT NULL,
	"value" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" bigint NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_stock" (
	"product_id" text NOT NULL,
	"location" text NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"low_stock" integer DEFAULT 5 NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	CONSTRAINT "product_stock_pkey" PRIMARY KEY("location","product_id")
);
--> statement-breakpoint
CREATE TABLE "production_ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"production_id" text NOT NULL,
	"ingredient_id" text NOT NULL,
	"ingredient_name" text NOT NULL,
	"quantity" numeric(10, 4) NOT NULL,
	"cost_per_unit" numeric(10, 4) NOT NULL,
	"total_cost" numeric(10, 4) NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "productions" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"product_name" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"cost_per_unit" numeric(10, 4) NOT NULL,
	"total_cost" numeric(10, 2) NOT NULL,
	"location" text DEFAULT 'Cocina' NOT NULL,
	"batch_number" text DEFAULT '',
	"expiry_date" text,
	"notes" text DEFAULT '',
	"status" text DEFAULT 'active' NOT NULL,
	"produced_at" bigint NOT NULL,
	"created_at" bigint NOT NULL,
	"anulado_at" bigint,
	"anulado_reason" text DEFAULT '',
	"anulado_by" text DEFAULT '',
	"tenant_id" text DEFAULT 'default' NOT NULL,
	CONSTRAINT "productions_status_check" CHECK (status = ANY (ARRAY['active'::text, 'anulado'::text]))
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"low_stock" integer DEFAULT 5 NOT NULL,
	"ubicacion" text DEFAULT 'Bar' NOT NULL,
	"discount" numeric(5, 2) DEFAULT '0' NOT NULL,
	"course" text DEFAULT '' NOT NULL,
	"image" text,
	"allergens" text[] DEFAULT '{""}',
	"description" text,
	"featured" boolean DEFAULT false,
	"active" boolean DEFAULT true,
	"show_tpv" boolean DEFAULT true,
	"show_qr" boolean DEFAULT true,
	"agotado" boolean DEFAULT false,
	"carousel_sort" integer,
	"type" text DEFAULT '',
	"inventariable" boolean DEFAULT false,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	CONSTRAINT "products_tenant_id_id_uniq" UNIQUE("id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "purchase_order_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text NOT NULL,
	"product_name" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"price_per_unit" numeric(10, 4) NOT NULL,
	"supplier_sku" text DEFAULT '',
	"received_qty" numeric(10, 2) DEFAULT '0',
	"tenant_id" text DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"supplier_id" text NOT NULL,
	"supplier_name" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"expected_date" text DEFAULT '',
	"notes" text DEFAULT '',
	"created_by" text DEFAULT '',
	"created_at" bigint NOT NULL,
	"updated_at" bigint,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	CONSTRAINT "purchase_orders_status_check" CHECK (status = ANY (ARRAY['draft'::text, 'sent'::text, 'partial'::text, 'received'::text]))
);
--> statement-breakpoint
CREATE TABLE "qr_calls" (
	"id" text NOT NULL,
	"table_id" text NOT NULL,
	"table_name" text DEFAULT '',
	"zone" text DEFAULT '',
	"acknowledged" boolean DEFAULT false,
	"created_at" bigint NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	CONSTRAINT "qr_calls_pkey" PRIMARY KEY("id","tenant_id"),
	CONSTRAINT "qr_calls_tenant_id_id_uniq" UNIQUE("id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "qr_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"table_id" text NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"order_status" text DEFAULT 'pending',
	"payment_intent_id" text DEFAULT '',
	"amount" numeric(10, 2) DEFAULT '0',
	"customer_name" text DEFAULT '',
	"customer_phone" text DEFAULT '',
	"notes" text DEFAULT '',
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"modality" text DEFAULT 'dinein',
	"address" text DEFAULT '',
	"address_lat" numeric(10, 7),
	"address_lng" numeric(10, 7),
	"zone_id" text DEFAULT '',
	"delivery_cost" numeric(10, 2) DEFAULT '0',
	"customer_email" text DEFAULT '',
	"scheduled_at" bigint,
	"accepted" boolean DEFAULT false,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	CONSTRAINT "qr_orders_order_status_new_check" CHECK (order_status = ANY (ARRAY['pending'::text, 'paid'::text, 'confirmed'::text, 'preparing'::text, 'ready'::text, 'en_camino'::text, 'delivered'::text, 'cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" text NOT NULL,
	"ingredient_id" text NOT NULL,
	"ingredient_name" text NOT NULL,
	"quantity" numeric(10, 4) NOT NULL,
	"unit" text DEFAULT 'kg' NOT NULL,
	"cost_per_unit" numeric(10, 4) DEFAULT '0' NOT NULL,
	"total_cost" numeric(10, 4) DEFAULT '0' NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "RecipeItem" (
	"id" text PRIMARY KEY NOT NULL,
	"productId" text NOT NULL,
	"ingredientId" text NOT NULL,
	"quantity" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"product_name" text NOT NULL,
	"cost_per_unit" numeric(10, 4) DEFAULT '0' NOT NULL,
	"updated_at" bigint DEFAULT 0 NOT NULL,
	"yield_qty" numeric(10, 2) DEFAULT '1' NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	CONSTRAINT "recipes_product_id_key" UNIQUE("product_id")
);
--> statement-breakpoint
CREATE TABLE "reservation_recurring" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"weekday" integer NOT NULL,
	"time" text NOT NULL,
	"pax" integer DEFAULT 2 NOT NULL,
	"phone" text DEFAULT '',
	"notes" text DEFAULT '',
	"zone" text DEFAULT '',
	"table_id" text DEFAULT '',
	"active" boolean DEFAULT true,
	"created_at" bigint NOT NULL,
	CONSTRAINT "reservation_recurring_weekday_check" CHECK ((weekday >= 0) AND (weekday <= 6))
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" text PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"time" text NOT NULL,
	"pax" integer NOT NULL,
	"name" text NOT NULL,
	"phone" text DEFAULT '',
	"email" text DEFAULT '',
	"status" text DEFAULT 'pendiente',
	"zone" text DEFAULT '',
	"notes" text DEFAULT '',
	"table_id" text DEFAULT '',
	"customer_id" text DEFAULT '',
	"deposit_amount" numeric(10, 2) DEFAULT '0',
	"deposit_paid" boolean DEFAULT false,
	"source" text DEFAULT 'manual',
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	CONSTRAINT "reservations_source_check" CHECK (source = ANY (ARRAY['manual'::text, 'online'::text, 'qr'::text])),
	CONSTRAINT "reservations_status_check" CHECK (status = ANY (ARRAY['pendiente'::text, 'confirmada'::text, 'sentada'::text, 'noshow'::text, 'cancelada'::text]))
);
--> statement-breakpoint
CREATE TABLE "riser_pads" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"level" "level" NOT NULL,
	"price" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" text PRIMARY KEY NOT NULL,
	"table_id" text,
	"table_name" text,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"subtotal" numeric(10, 2),
	"discount" numeric(5, 2) DEFAULT '0',
	"discount_amount" numeric(10, 2) DEFAULT '0',
	"total" numeric(10, 2),
	"tip" numeric(10, 2) DEFAULT '0',
	"total_with_tip" numeric(10, 2),
	"payments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"payment_method" text,
	"is_fiado" boolean DEFAULT false,
	"is_debt_payment" boolean DEFAULT false,
	"employee_id" text,
	"employee_name" text,
	"closed_at" bigint NOT NULL,
	"refunds" jsonb DEFAULT '[]'::jsonb,
	"tip_method" text DEFAULT '',
	"invoice_nif" text DEFAULT '',
	"invoice_name" text DEFAULT '',
	"invoice_address" text DEFAULT '',
	"invoice_email" text DEFAULT '',
	"invoice_number" text DEFAULT '',
	"invoice_created" boolean DEFAULT false,
	"invoice_created_at" bigint,
	"payment_intent_id" text DEFAULT '',
	"tenant_id" text DEFAULT 'default' NOT NULL,
	"stripe_confirmed" boolean DEFAULT false,
	"dispute_status" text DEFAULT '',
	"dispute_data" jsonb DEFAULT '{}'::jsonb,
	"ticket_number" integer
);
--> statement-breakpoint
CREATE TABLE "Session" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expiresAt" timestamp(3) NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"tenant_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"device_id" text NOT NULL,
	"role" text NOT NULL,
	"active" boolean DEFAULT true,
	"created_at" bigint NOT NULL,
	"last_seen" bigint NOT NULL,
	CONSTRAINT "unique_session" UNIQUE("device_id","employee_id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text NOT NULL,
	"value" text NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	CONSTRAINT "settings_pkey" PRIMARY KEY("key","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "Shift" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"start" timestamp(3) NOT NULL,
	"end" timestamp(3),
	"storeId" text
);
--> statement-breakpoint
CREATE TABLE "shift_objectives" (
	"id" serial PRIMARY KEY NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"position" text DEFAULT '',
	"min_people" integer DEFAULT 1,
	"max_people" integer DEFAULT 3
);
--> statement-breakpoint
CREATE TABLE "skate_shoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"level" "level" NOT NULL,
	"price" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "skates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"level" "level" NOT NULL,
	"price" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "socks" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"level" "level" NOT NULL,
	"price" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "stickers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"level" "level" NOT NULL,
	"price" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "stock_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"product_name" text NOT NULL,
	"old_stock" integer NOT NULL,
	"new_stock" integer NOT NULL,
	"change_amount" integer NOT NULL,
	"reason" text NOT NULL,
	"employee_name" text,
	"created_at" bigint NOT NULL,
	"reference" text DEFAULT '',
	"tenant_id" text DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "StockMovement" (
	"id" text PRIMARY KEY NOT NULL,
	"ingredientId" text NOT NULL,
	"quantity" double precision NOT NULL,
	"reason" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Store" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"tenantId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sunglasses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"level" "level" NOT NULL,
	"price" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "supplier_catalog" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" text NOT NULL,
	"product_id" text NOT NULL,
	"sku" text DEFAULT '',
	"price" numeric(10, 4) NOT NULL,
	"pack_size" numeric(10, 2) DEFAULT '1',
	"min_order" numeric(10, 2) DEFAULT '0',
	"delivery_days" integer DEFAULT 0,
	"is_preferred" boolean DEFAULT false,
	"active" boolean DEFAULT true,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	CONSTRAINT "supplier_catalog_supplier_id_product_id_key" UNIQUE("product_id","supplier_id")
);
--> statement-breakpoint
CREATE TABLE "supplier_price_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"catalog_id" integer NOT NULL,
	"supplier_id" text NOT NULL,
	"product_id" text NOT NULL,
	"pack_price" numeric(10, 4) NOT NULL,
	"pack_size" numeric(10, 2) DEFAULT '1' NOT NULL,
	"price_per_unit" numeric(10, 6) NOT NULL,
	"source" text DEFAULT 'manual',
	"created_at" bigint NOT NULL,
	CONSTRAINT "supplier_price_history_source_check" CHECK (source = ANY (ARRAY['manual'::text, 'receipt'::text]))
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact" text DEFAULT '',
	"phone" text DEFAULT '',
	"email" text DEFAULT '',
	"nif" text DEFAULT '',
	"address" text DEFAULT '',
	"payment_terms" text DEFAULT '',
	"notes" text DEFAULT '',
	"active" boolean DEFAULT true,
	"created_at" bigint NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "t_shirts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"level" "level" NOT NULL,
	"price" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "tables" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'libre' NOT NULL,
	"order_id" text,
	"reserved" jsonb,
	"is_fiado" boolean DEFAULT false NOT NULL,
	"type" text DEFAULT 'mesa' NOT NULL,
	"pos_x" integer DEFAULT 100,
	"pos_y" integer DEFAULT 100,
	"table_width" integer DEFAULT 80,
	"table_height" integer DEFAULT 80,
	"table_radius" integer DEFAULT 40,
	"table_shape" text DEFAULT 'rect',
	"rotation" integer DEFAULT 0,
	"seats" integer DEFAULT 4,
	"zone" text DEFAULT '',
	"layer" integer DEFAULT 0,
	"table_color" text DEFAULT '',
	"order_ids" jsonb DEFAULT '[]'::jsonb,
	"reserved_for" text DEFAULT '',
	"tenant_id" text DEFAULT 'default' NOT NULL,
	CONSTRAINT "tables_tenant_id_id_uniq" UNIQUE("id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "Tenant" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"plan" "Plan" DEFAULT 'FREE' NOT NULL,
	"stripeId" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo_url" text DEFAULT '',
	"address" text DEFAULT '',
	"phone" text DEFAULT '',
	"email" text DEFAULT '',
	"nif" text DEFAULT '',
	"active" boolean DEFAULT true NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"created_at" bigint NOT NULL,
	CONSTRAINT "tenants_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "Ticket" (
	"id" text PRIMARY KEY NOT NULL,
	"total" double precision DEFAULT 0 NOT NULL,
	"status" "TicketStatus" DEFAULT 'OPEN' NOT NULL,
	"storeId" text NOT NULL,
	"createdById" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_counters" (
	"tenant_id" text NOT NULL,
	"year" integer NOT NULL,
	"counter" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ticket_counters_pkey" PRIMARY KEY("tenant_id","year")
);
--> statement-breakpoint
CREATE TABLE "TicketItem" (
	"id" text PRIMARY KEY NOT NULL,
	"quantity" integer NOT NULL,
	"price" double precision NOT NULL,
	"ticketId" text NOT NULL,
	"productId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_off_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"employee_name" text NOT NULL,
	"reason" text NOT NULL,
	"from_date" text NOT NULL,
	"to_date" text NOT NULL,
	"notes" text DEFAULT '',
	"status" text DEFAULT 'pending',
	"resolved_by" text DEFAULT '',
	"resolved_note" text DEFAULT '',
	"created_at" bigint NOT NULL,
	"resolved_at" bigint
);
--> statement-breakpoint
CREATE TABLE "tool_bags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"level" "level" NOT NULL,
	"price" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "tools" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"level" "level" NOT NULL,
	"price" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "trucks" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"level" "level" NOT NULL,
	"price" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password" text,
	"role" "Role" NOT NULL,
	"tenantId" text NOT NULL,
	"storeId" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifactu_registros" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" text NOT NULL,
	"num_serie" text NOT NULL,
	"fecha_expedicion" text NOT NULL,
	"importe_total" numeric(10, 2) NOT NULL,
	"base_imponible" numeric(10, 2) NOT NULL,
	"cuota_iva" numeric(10, 2) NOT NULL,
	"huella_anterior" text DEFAULT '0' NOT NULL,
	"huella" text NOT NULL,
	"xml_registro" text NOT NULL,
	"qr_url" text NOT NULL,
	"estado" text DEFAULT 'simulado' NOT NULL,
	"created_at" bigint NOT NULL,
	"fiskaly_invoice_id" text,
	"verification_url" text,
	"fecha_hora_firma" text,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	"payment_intent_id" text,
	CONSTRAINT "verifactu_registros_num_serie_key" UNIQUE("num_serie"),
	CONSTRAINT "verifactu_registros_sale_id_key" UNIQUE("sale_id")
);
--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text DEFAULT '',
	"pax" integer DEFAULT 2 NOT NULL,
	"status" text DEFAULT 'waiting',
	"called_count" integer DEFAULT 0,
	"called_at" bigint,
	"seated_at" bigint,
	"table_id" text DEFAULT '',
	"position" integer DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '',
	"source" text DEFAULT 'manual',
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	CONSTRAINT "waitlist_source_check" CHECK (source = ANY (ARRAY['manual'::text, 'online'::text, 'qr'::text])),
	CONSTRAINT "waitlist_status_check" CHECK (status = ANY (ARRAY['waiting'::text, 'called'::text, 'seated'::text, 'cancelled'::text, 'noshow'::text]))
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"body" jsonb,
	"error" text,
	"created_at" bigint NOT NULL,
	"processed_at" bigint,
	"tenant_id" text DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wheels" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"level" "level" NOT NULL,
	"price" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"image_url" text
);
--> statement-breakpoint
ALTER TABLE "albaran_lines" ADD CONSTRAINT "albaran_lines_albaran_id_fkey" FOREIGN KEY ("albaran_id") REFERENCES "public"."albaranes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "buffet_rounds" ADD CONSTRAINT "buffet_rounds_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."buffet_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buffet_sessions" ADD CONSTRAINT "buffet_sessions_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buffet_waste" ADD CONSTRAINT "buffet_waste_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."buffet_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combo_items" ADD CONSTRAINT "combo_items_combo_id_fkey" FOREIGN KEY ("combo_id") REFERENCES "public"."combos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combo_items" ADD CONSTRAINT "combo_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combo_slot_items" ADD CONSTRAINT "combo_slot_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combo_slot_items" ADD CONSTRAINT "combo_slot_items_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "public"."combo_slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combo_slots" ADD CONSTRAINT "combo_slots_combo_id_fkey" FOREIGN KEY ("combo_id") REFERENCES "public"."combos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_tracking" ADD CONSTRAINT "delivery_tracking_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "public"."delivery_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gestoria_document_lines" ADD CONSTRAINT "gestoria_document_lines_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."gestoria_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "KitchenItem" ADD CONSTRAINT "KitchenItem_ticketItemId_fkey" FOREIGN KEY ("ticketItemId") REFERENCES "public"."TicketItem"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "meal_menu_course_items" ADD CONSTRAINT "meal_menu_course_items_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."meal_menu_courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_menu_course_items" ADD CONSTRAINT "meal_menu_course_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_menu_courses" ADD CONSTRAINT "meal_menu_courses_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "public"."meal_menus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_menu_schedules" ADD CONSTRAINT "meal_menu_schedules_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "public"."meal_menus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modifier_options" ADD CONSTRAINT "modifier_options_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."modifier_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modifier_recipe_ingredients" ADD CONSTRAINT "modifier_recipe_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modifier_recipe_ingredients" ADD CONSTRAINT "modifier_recipe_ingredients_modifier_recipe_id_fkey" FOREIGN KEY ("modifier_recipe_id") REFERENCES "public"."modifier_recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_albaran_id_fkey" FOREIGN KEY ("albaran_id") REFERENCES "public"."albaranes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_modifiers" ADD CONSTRAINT "product_modifiers_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."modifier_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_price_rules" ADD CONSTRAINT "product_price_rules_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_stock" ADD CONSTRAINT "product_stock_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_ingredients" ADD CONSTRAINT "production_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_ingredients" ADD CONSTRAINT "production_ingredients_production_id_fkey" FOREIGN KEY ("production_id") REFERENCES "public"."productions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productions" ADD CONSTRAINT "productions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "public"."Ingredient"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "public"."Ingredient"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Store" ADD CONSTRAINT "Store_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "supplier_catalog" ADD CONSTRAINT "supplier_catalog_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_catalog" ADD CONSTRAINT "supplier_catalog_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_price_history" ADD CONSTRAINT "supplier_price_history_catalog_id_fkey" FOREIGN KEY ("catalog_id") REFERENCES "public"."supplier_catalog"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "TicketItem" ADD CONSTRAINT "TicketItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "TicketItem" ADD CONSTRAINT "TicketItem_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."Ticket"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "User" ADD CONSTRAINT "User_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "idx_access_logs_tenant" ON "access_logs" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_albaran_lines_tenant" ON "albaran_lines" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_albaranes_tenant" ON "albaranes" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_buffet_config_tenant" ON "buffet_config" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_buffet_rounds_session" ON "buffet_rounds" USING btree ("session_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_buffet_sessions_status" ON "buffet_sessions" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_buffet_sessions_table" ON "buffet_sessions" USING btree ("table_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_buffet_sessions_tenant" ON "buffet_sessions" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_buffet_waste_session" ON "buffet_waste" USING btree ("session_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_cancelled_orders_tenant" ON "cancelled_orders" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_categories_tenant" ON "categories" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_clockin_logs_tenant" ON "clockin_logs" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_closures_date" ON "closures" USING btree ("date" text_ops);--> statement-breakpoint
CREATE INDEX "idx_combo_items_tenant" ON "combo_items" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_combo_slot_items_tenant" ON "combo_slot_items" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_combo_slots_tenant" ON "combo_slots" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_combos_tenant" ON "combos" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_delivery_orders_tenant" ON "delivery_orders" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_delivery_runners_tenant" ON "delivery_runners" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_delivery_zones_tenant" ON "delivery_zones" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_employee_shifts_tenant" ON "employee_shifts" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_shifts_date" ON "employee_shifts" USING btree ("date" text_ops);--> statement-breakpoint
CREATE INDEX "idx_shifts_employee" ON "employee_shifts" USING btree ("employee_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_employee_turns_tenant" ON "employee_turns" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_employees_tenant" ON "employees" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_meal_menus_tenant" ON "meal_menus" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_modifier_groups_tenant" ON "modifier_groups" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_offers_tenant" ON "offers" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_orders_tenant" ON "orders" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "Product_barcode_key" ON "Product" USING btree ("barcode" text_ops);--> statement-breakpoint
CREATE INDEX "idx_batches_expiry" ON "product_batches" USING btree ("expiry_date" text_ops);--> statement-breakpoint
CREATE INDEX "idx_batches_location" ON "product_batches" USING btree ("location" text_ops);--> statement-breakpoint
CREATE INDEX "idx_batches_product" ON "product_batches" USING btree ("product_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_batches_status" ON "product_batches" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_product_price_rules_tenant" ON "product_price_rules" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_product_stock_tenant" ON "product_stock" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_production_ingredients_tenant" ON "production_ingredients" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_productions_tenant" ON "productions" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_products_tenant" ON "products" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_purchase_order_lines_tenant" ON "purchase_order_lines" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_purchase_orders_tenant" ON "purchase_orders" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_qr_orders_tenant" ON "qr_orders" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_recipe_ingredients_tenant" ON "recipe_ingredients" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_recipes_tenant" ON "recipes" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_reservations_tenant" ON "reservations" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_sales_tenant" ON "sales" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "Session_userId_id_key" ON "Session" USING btree ("userId" text_ops,"id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_settings_tenant" ON "settings" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_stock_log_tenant" ON "stock_log" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_supplier_catalog_preferred" ON "supplier_catalog" USING btree ("product_id" text_ops) WHERE (is_preferred = true);--> statement-breakpoint
CREATE INDEX "idx_supplier_catalog_tenant" ON "supplier_catalog" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_suppliers_tenant" ON "suppliers" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_tables_tenant" ON "tables" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "User_email_key" ON "User" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "idx_verifactu_registros_tenant" ON "verifactu_registros" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_waitlist_tenant" ON "waitlist" USING btree ("tenant_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_webhook_events_status" ON "webhook_events" USING btree ("status" text_ops);