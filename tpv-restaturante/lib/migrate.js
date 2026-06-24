/**
 * Migraciones DDL para el TPV.
 * Usa ADD COLUMN IF NOT EXISTS para ser idempotente sin perder datos.
 */
import { sql } from './db';

export async function runMigrations() {
  // -- categories --
  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      id   SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    )
  `;

  // -- products --
  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id        TEXT PRIMARY KEY,
      name      TEXT          NOT NULL,
      category  TEXT          NOT NULL,
      price     NUMERIC(10,2) NOT NULL,
      stock     INTEGER       NOT NULL DEFAULT 0,
      low_stock INTEGER       NOT NULL DEFAULT 5,
      ubicacion TEXT          NOT NULL DEFAULT 'Bar'
    )
  `;
  // Columna ubicacion puede faltar en tablas antiguas
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS ubicacion TEXT NOT NULL DEFAULT 'Bar'`;

  // -- tables --
  await sql`
    CREATE TABLE IF NOT EXISTS tables (
      id       TEXT    PRIMARY KEY,
      name     TEXT    NOT NULL,
      status   TEXT    NOT NULL DEFAULT 'libre',
      order_id TEXT,
      reserved JSONB,
      is_fiado BOOLEAN NOT NULL DEFAULT false
    )
  `;
  await sql`ALTER TABLE tables ADD COLUMN IF NOT EXISTS order_id TEXT`;
  await sql`ALTER TABLE tables ADD COLUMN IF NOT EXISTS reserved JSONB`;
  await sql`ALTER TABLE tables ADD COLUMN IF NOT EXISTS is_fiado BOOLEAN NOT NULL DEFAULT false`;

  // -- orders --
  // Recrear limpia si le faltan columnas clave (tabla nueva o esquema incorrecto)
  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id            TEXT   PRIMARY KEY,
      table_id      TEXT   NOT NULL,
      items         JSONB  NOT NULL DEFAULT '[]',
      created_at    BIGINT NOT NULL,
      employee_name TEXT
    )
  `;
  // Asegurar columnas en caso de tabla preexistente con esquema distinto
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_id      TEXT`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS items         JSONB  NOT NULL DEFAULT '[]'`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_at    BIGINT`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS employee_name TEXT`;

  // -- sales --
  await sql`
    CREATE TABLE IF NOT EXISTS sales (
      id              TEXT          PRIMARY KEY,
      table_id        TEXT,
      table_name      TEXT,
      items           JSONB         NOT NULL DEFAULT '[]',
      subtotal        NUMERIC(10,2),
      discount        NUMERIC(5,2)  DEFAULT 0,
      discount_amount NUMERIC(10,2) DEFAULT 0,
      total           NUMERIC(10,2),
      tip             NUMERIC(10,2) DEFAULT 0,
      total_with_tip  NUMERIC(10,2),
      payments        JSONB         NOT NULL DEFAULT '[]',
      payment_method  TEXT,
      is_fiado        BOOLEAN       DEFAULT false,
      is_debt_payment BOOLEAN       DEFAULT false,
      employee_id     TEXT,
      employee_name   TEXT,
      closed_at       BIGINT        NOT NULL
    )
  `;

  // -- employees --
  await sql`
    CREATE TABLE IF NOT EXISTS employees (
      id   TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      pin  TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'camarero'
    )
  `;

  // -- access_logs --
  await sql`
    CREATE TABLE IF NOT EXISTS access_logs (
      id            SERIAL  PRIMARY KEY,
      employee_id   TEXT    NOT NULL,
      employee_name TEXT    NOT NULL,
      role          TEXT    NOT NULL,
      entry_point   TEXT    NOT NULL,
      logged_at     BIGINT  NOT NULL
    )
  `;

  // -- verifactu_registros --
  await sql`
    CREATE TABLE IF NOT EXISTS verifactu_registros (
      id               SERIAL PRIMARY KEY,
      sale_id          TEXT NOT NULL UNIQUE,
      num_serie        TEXT NOT NULL UNIQUE,
      fecha_expedicion TEXT NOT NULL,
      importe_total    NUMERIC(10,2) NOT NULL,
      base_imponible   NUMERIC(10,2) NOT NULL,
      cuota_iva        NUMERIC(10,2) NOT NULL,
      huella_anterior  TEXT NOT NULL DEFAULT '0',
      huella           TEXT NOT NULL,
      xml_registro     TEXT NOT NULL,
      qr_url           TEXT NOT NULL,
      estado           TEXT NOT NULL DEFAULT 'simulado',
      created_at       BIGINT NOT NULL
    )
  `;

  return { ok: true };
}
