-- Rollback: 0004_add_sales_closed_at_indexes
DROP INDEX IF EXISTS idx_sales_tenant_closed_at;
DROP INDEX IF EXISTS idx_sales_closed_at;
