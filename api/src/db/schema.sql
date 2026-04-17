-- PayBridge Database Schema
-- Run once to set up the database:
--   psql $DATABASE_URL -f src/db/schema.sql

CREATE TABLE IF NOT EXISTS merchants (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  webhook_url   TEXT NOT NULL,
  api_key_hash  TEXT NOT NULL,
  stacks_address TEXT NOT NULL,
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id            TEXT PRIMARY KEY,
  merchant_id   TEXT NOT NULL REFERENCES merchants(id),
  amount_sats   BIGINT NOT NULL,
  fee_sats      BIGINT NOT NULL,
  net_sats      BIGINT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  tx_id         TEXT,
  stacks_block  BIGINT,
  payer_address TEXT,
  memo          TEXT,
  expires_at    TIMESTAMPTZ NOT NULL,
  confirmed_at  TIMESTAMPTZ,
  released_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id          SERIAL PRIMARY KEY,
  payment_id  TEXT NOT NULL REFERENCES payments(id),
  merchant_id TEXT NOT NULL,
  event       TEXT NOT NULL,
  url         TEXT NOT NULL,
  payload     JSONB NOT NULL,
  status_code INT,
  success     BOOLEAN DEFAULT false,
  attempts    INT DEFAULT 0,
  last_error  TEXT,
  delivered_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_merchant ON payments(merchant_id);
CREATE INDEX IF NOT EXISTS idx_payments_status   ON payments(status);
CREATE INDEX IF NOT EXISTS idx_webhook_payment   ON webhook_deliveries(payment_id);