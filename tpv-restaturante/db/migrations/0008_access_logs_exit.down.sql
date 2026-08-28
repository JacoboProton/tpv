-- Rollback: 0008_access_logs_exit (device_id + exit_at columns)
ALTER TABLE access_logs DROP COLUMN IF EXISTS exit_at;
ALTER TABLE access_logs DROP COLUMN IF EXISTS device_id;
