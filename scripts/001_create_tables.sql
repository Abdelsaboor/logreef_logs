-- LogReef MVP: Full schema migration
-- Creates all tables, indexes, and functions for the log management platform

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workos_user_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  last4 TEXT NOT NULL,
  label TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

-- 3. logs table (main data table)
CREATE TABLE IF NOT EXISTS logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  service TEXT NOT NULL DEFAULT 'default',
  host TEXT NOT NULL DEFAULT 'unknown',
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL DEFAULT '',
  raw_json JSONB
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_logs_user_timestamp ON logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_user_service ON logs(user_id, service);
CREATE INDEX IF NOT EXISTS idx_logs_user_level ON logs(user_id, level);

-- Full-text search index on message
CREATE INDEX IF NOT EXISTS idx_logs_message_tsvector ON logs USING gin(to_tsvector('english', message));

-- 4. alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Alert',
  rule_type TEXT NOT NULL CHECK (rule_type IN ('KEYWORD_CONTAINS', 'VOLUME_THRESHOLD')),
  rule_value TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'EMAIL',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_enabled ON alerts(is_enabled) WHERE is_enabled = true;

-- 5. alert_events table
CREATE TABLE IF NOT EXISTS alert_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  matched_log_id BIGINT REFERENCES logs(id) ON DELETE SET NULL,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  email_to TEXT NOT NULL,
  provider_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_alert_events_alert_id ON alert_events(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_events_triggered_at ON alert_events(triggered_at DESC);

-- 6. subscriptions table (Polar.sh billing)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  polar_customer_id TEXT NOT NULL,
  polar_subscription_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_subscriptions_user_id UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_polar_sub ON subscriptions(polar_subscription_id);
