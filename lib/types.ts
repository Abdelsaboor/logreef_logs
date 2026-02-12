// ---- Data model types matching Postgres schema ----

export interface User {
  id: string
  workos_user_id: string
  email: string
  created_at: string
}

export interface ApiKey {
  id: string
  user_id: string
  key_hash: string
  last4: string
  label: string
  created_at: string
  revoked_at: string | null
}

export interface LogEntry {
  id: number
  user_id: string
  timestamp: string
  service: string
  host: string
  level: string
  message: string
  raw_json: Record<string, unknown> | null
}

export interface Alert {
  id: string
  user_id: string
  name: string
  rule_type: "KEYWORD_CONTAINS" | "VOLUME_THRESHOLD"
  rule_value: string
  channel: string
  is_enabled: boolean
  created_at: string
}

export interface AlertEvent {
  id: string
  alert_id: string
  matched_log_id: number | null
  triggered_at: string
  status: string
  email_to: string
  provider_id: string | null
}

export interface Subscription {
  id: string
  user_id: string
  polar_customer_id: string
  polar_subscription_id: string
  status: string
  current_period_end: string | null
  created_at: string
}

// ---- API request/response types ----

export interface LogSearchParams {
  query?: string
  from?: string
  to?: string
  service?: string
  level?: string
  host?: string
  limit?: number
  cursor?: number
}

export interface LogVolumeParams {
  from?: string
  to?: string
  bucket?: "minute" | "hour"
  service?: string
}

export interface VolumeDataPoint {
  t: string
  count: number
}

export interface CreateAlertPayload {
  name: string
  rule_type: "KEYWORD_CONTAINS" | "VOLUME_THRESHOLD"
  rule_value: string
  channel: string
}
