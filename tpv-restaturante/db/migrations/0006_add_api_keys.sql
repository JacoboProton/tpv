-- Migration: add api_keys table
-- Stores per-client API keys (pos/kds/mobile) as SHA-256 hashes.
-- Used by lib/env.ts and the API proxy to authenticate internal clients
-- when a JWT session is not present (legacy transition + non-browser clients).

CREATE TABLE IF NOT EXISTS api_keys (
	id text NOT NULL,
	tenant_id text DEFAULT 'default' NOT NULL,
	client_type text NOT NULL,
	label text DEFAULT '' NOT NULL,
	key_hash text NOT NULL,
	key_prefix text DEFAULT '' NOT NULL,
	active boolean DEFAULT true NOT NULL,
	created_at bigint NOT NULL,
	rotated_at bigint,
	last_used_at bigint,
	CONSTRAINT api_keys_pkey PRIMARY KEY (id, tenant_id),
	CONSTRAINT api_keys_tenant_id_key_hash_uniq UNIQUE (tenant_id, key_hash)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys (tenant_id);