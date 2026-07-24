-- Migration: clear legacy plain-text pin column
-- The pin column was used for plain-text PIN storage.
-- All auth now uses pinHash (bcrypt(sha256(pin))).
-- This clears any remaining plain-text PINs from the column.

UPDATE employees SET pin = '' WHERE pin != '' AND pin IS NOT NULL;
