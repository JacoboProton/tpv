ALTER TABLE "backups" ADD COLUMN "tenant_id" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_backups_tenant" ON "backups" USING btree ("tenant_id" text_ops);