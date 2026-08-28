-- Rollback: 0006_add_api_keys
DROP INDEX IF EXISTS idx_api_keys_tenant;
DROP TABLE IF EXISTS api_keys;
