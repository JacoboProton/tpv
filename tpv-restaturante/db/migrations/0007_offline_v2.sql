-- Migration: offline v2 — idempotency keys + floor sync (LWW + vector clock)
-- idempotency_keys: deduplica reintentos del cliente (misma idempotencyKey → misma respuesta)
-- floor_sync: reloj vectorial + updatedAt por tenant para resolución LWW de conflictos

CREATE TABLE IF NOT EXISTS idempotency_keys (
	tenant_id text DEFAULT 'default' NOT NULL,
	idempotency_key text NOT NULL,
	endpoint text DEFAULT '' NOT NULL,
	method text DEFAULT '' NOT NULL,
	status integer DEFAULT 200 NOT NULL,
	response_body jsonb,
	created_at bigint NOT NULL,
	expires_at bigint,
	CONSTRAINT idempotency_keys_pkey PRIMARY KEY (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires ON idempotency_keys (expires_at);

CREATE TABLE IF NOT EXISTS floor_sync (
	tenant_id text PRIMARY KEY,
	vector_clock jsonb DEFAULT '{}' NOT NULL,
	updated_at bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_floor_sync_tenant ON floor_sync (tenant_id);
