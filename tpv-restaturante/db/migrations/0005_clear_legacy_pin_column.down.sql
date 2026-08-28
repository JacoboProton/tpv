-- Rollback: 0005_clear_legacy_pin_column
-- WARNING: This migration cleared plain-text PIN data which cannot be recovered.
-- The pin column was cleared (set to empty string) for security.
-- No automatic rollback possible - PINs would need to be re-entered by users.
--
-- If you have a backup, restore from backup. Otherwise this is a one-way migration.
-- This file exists as a placeholder to document the irreversibility.
SELECT 1; -- No-op
