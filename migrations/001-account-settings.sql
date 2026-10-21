CREATE TABLE IF NOT EXISTS calypso_accounts (
  id text PRIMARY KEY CHECK (id IN ('ST-Admin', 'PowerPlus-Admin')),
  password_hash text NOT NULL
);
CREATE TABLE IF NOT EXISTS calypso_sessions (
  token_hash text PRIMARY KEY,
  account_id text NOT NULL REFERENCES calypso_accounts(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS calypso_sessions_expiry ON calypso_sessions(expires_at);
CREATE TABLE IF NOT EXISTS calypso_settings (
  account_id text NOT NULL REFERENCES calypso_accounts(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL CHECK (octet_length(value) <= 200000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, key)
);
CREATE TABLE IF NOT EXISTS calypso_login_limits (
  key text PRIMARY KEY,
  attempts integer NOT NULL,
  window_start timestamptz NOT NULL
);
