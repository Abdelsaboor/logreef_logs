// ---- Plan definitions with hard limits and permissions ----

export type PlanId = "free" | "pro"

export interface PlanLimits {
  logs_per_day: number
  alerts: number
  api_keys: number
  retention_days: number
  log_search_window_days: number
  max_batch_size: number
  rate_limit_per_minute: number
}

export interface PlanPermissions {
  full_text_search: boolean
  json_field_search: boolean
  webhook_alerts: boolean
  custom_retention: boolean
  priority_ingestion: boolean
  export_csv: boolean
  team_members: boolean
  sso_saml: boolean
}

export interface Plan {
  id: PlanId
  name: string
  price_monthly: number
  polar_product_id: string | null
  limits: PlanLimits
  permissions: PlanPermissions
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    price_monthly: 0,
    polar_product_id: null,
    limits: {
      logs_per_day: 1_000,
      alerts: 3,
      api_keys: 1,
      retention_days: 7,
      log_search_window_days: 7,
      max_batch_size: 100,
      rate_limit_per_minute: 60,
    },
    permissions: {
      full_text_search: true,
      json_field_search: false,
      webhook_alerts: false,
      custom_retention: false,
      priority_ingestion: false,
      export_csv: false,
      team_members: false,
      sso_saml: false,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    price_monthly: 29,
    polar_product_id: process.env.POLAR_PRO_PRODUCT_ID || null,
    limits: {
      logs_per_day: 100_000,
      alerts: 50,
      api_keys: 10,
      retention_days: 90,
      log_search_window_days: 90,
      max_batch_size: 1_000,
      rate_limit_per_minute: 600,
    },
    permissions: {
      full_text_search: true,
      json_field_search: true,
      webhook_alerts: true,
      custom_retention: true,
      priority_ingestion: true,
      export_csv: true,
      team_members: false,
      sso_saml: false,
    },
  },
}

/** Resolve plan from a subscription status. */
export function getPlanForUser(subscription: {
  status: string
  polar_subscription_id: string
} | null): Plan {
  if (subscription && subscription.status === "active") {
    return PLANS.pro
  }
  return PLANS.free
}

/** Feature label list for plan comparison UI */
export const PLAN_FEATURE_ROWS = [
  { key: "logs_per_day", label: "Logs per day", format: (v: number) => v.toLocaleString() },
  { key: "alerts", label: "Alert rules", format: (v: number) => v.toLocaleString() },
  { key: "api_keys", label: "API keys", format: (v: number) => v.toLocaleString() },
  { key: "retention_days", label: "Data retention", format: (v: number) => `${v} days` },
  { key: "max_batch_size", label: "Max batch size", format: (v: number) => v.toLocaleString() },
  { key: "rate_limit_per_minute", label: "Rate limit / min", format: (v: number) => `${v} req` },
] as const

export const PLAN_PERMISSION_ROWS = [
  { key: "full_text_search", label: "Full-text log search" },
  { key: "json_field_search", label: "JSON field search" },
  { key: "webhook_alerts", label: "Webhook alert channels" },
  { key: "priority_ingestion", label: "Priority ingestion" },
  { key: "export_csv", label: "CSV export" },
  { key: "team_members", label: "Team members" },
  { key: "sso_saml", label: "SSO / SAML (via WorkOS)" },
] as const
