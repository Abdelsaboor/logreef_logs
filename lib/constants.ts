// Demo user ID used for all API routes (stands in for WorkOS auth in preview)
export const DEMO_USER_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"

export const LOG_LEVELS = ["info", "warn", "error", "debug"] as const

export const SERVICES = [
  "api-gateway",
  "auth-service",
  "payments-service",
  "worker",
] as const

export const HOSTS = ["prod-1", "prod-2", "prod-3", "prod-4"] as const
