-- Rollback: 0003_curvy_omega_red (payment_logs.tenant_id)
ALTER TABLE "payment_logs" DROP COLUMN IF EXISTS "tenant_id";
