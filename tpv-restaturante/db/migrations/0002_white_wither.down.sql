-- Rollback: 0002_white_wither (tenant_id columns added to many tables)
-- Remove tenant_id columns from tables that received them in 0002

ALTER TABLE "belts" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "bushings" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "caps" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "elbow_pads" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "griptapes" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "helmets" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "knee_pads" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "modifier_recipe_ingredients" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "pants" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "patches" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "reservation_recurring" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "riser_pads" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "skate_shoes" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "skates" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "socks" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "stickers" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "StockMovement" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "sunglasses" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "t_shirts" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "time_off_requests" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "tool_bags" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "tools" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "trucks" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "wheels" DROP COLUMN IF EXISTS "tenant_id";
