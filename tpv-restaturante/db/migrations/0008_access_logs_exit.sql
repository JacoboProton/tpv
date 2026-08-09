-- Migration: access_logs entrada/salida
-- Registro de accesos a la app: añade terminal y hora de salida para
-- poder auditar quién entra y sale (web y móvil).

ALTER TABLE access_logs ADD COLUMN IF NOT EXISTS device_id text;
ALTER TABLE access_logs ADD COLUMN IF NOT EXISTS exit_at bigint;