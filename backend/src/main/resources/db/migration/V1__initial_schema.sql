CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  display_name VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  last_login_at TIMESTAMPTZ NULL,
  status VARCHAR(32) NOT NULL
);

CREATE TABLE remote_vaults (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_vault_id VARCHAR(120) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  encrypted_payload TEXT NOT NULL,
  payload_version INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ NULL,
  CONSTRAINT remote_vaults_user_client_vault_unique UNIQUE (user_id, client_vault_id)
);

CREATE INDEX idx_remote_vaults_user_id ON remote_vaults(user_id);
CREATE INDEX idx_remote_vaults_client_vault_id ON remote_vaults(client_vault_id);
CREATE INDEX idx_remote_vaults_user_active ON remote_vaults(user_id, deleted_at);

CREATE TABLE audit_events (
  id UUID PRIMARY KEY,
  user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(80) NOT NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(512) NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_audit_events_user_id ON audit_events(user_id);
CREATE INDEX idx_audit_events_created_at ON audit_events(created_at);
