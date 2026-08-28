-- Rollback: 0007_offline_v2 (idempotency_keys + floor_sync tables)
DROP INDEX IF EXISTS idx_idempotency_keys_expires;
DROP TABLE IF EXISTS idempotency_keys;
DROP INDEX IF EXISTS idx_floor_sync_tenant;
DROP TABLE IF EXISTS floor_sync;
