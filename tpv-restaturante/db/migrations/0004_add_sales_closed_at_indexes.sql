-- Migration: add indexes on sales.closed_at
-- Adds single-column and tenant+closed_at composite indexes to speed up queries filtering or ordering by closed_at

CREATE INDEX IF NOT EXISTS idx_sales_closed_at ON sales (closed_at);
CREATE INDEX IF NOT EXISTS idx_sales_tenant_closed_at ON sales (tenant_id, closed_at);
