import { z } from "zod"

/**
 * Runtime environment variable validation.
 * Import `env` from this module instead of reading `process.env` directly.
 * Throws at import time if any required var is missing.
 */

const serverSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),

  // WorkOS
  WORKOS_API_KEY: z.string().min(1, "WORKOS_API_KEY is required"),
  WORKOS_CLIENT_ID: z.string().min(1, "WORKOS_CLIENT_ID is required"),
  WORKOS_COOKIE_PASSWORD: z.string().min(32, "WORKOS_COOKIE_PASSWORD must be at least 32 characters"),

  // App
  NEXT_PUBLIC_WORKOS_REDIRECT_URI: z
    .string()
    .url()
    .default("http://localhost:3000/api/auth/callback"),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .default("http://localhost:3000"),

  // Optional integrations
  RESEND_API_KEY: z.string().optional(),
  POLAR_ACCESS_TOKEN: z.string().optional(),
})

export type ServerEnv = z.infer<typeof serverSchema>

function validateEnv(): ServerEnv {
  const parsed = serverSchema.safeParse(process.env)

  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n")

    console.error(
      `[LogReef] Missing or invalid environment variables:\n${formatted}`
    )

    // In development, warn but don't crash so the app can still boot
    if (process.env.NODE_ENV === "development") {
      console.warn("[LogReef] Running with incomplete env vars in development mode")
      return process.env as unknown as ServerEnv
    }

    throw new Error(
      `Missing or invalid environment variables:\n${formatted}`
    )
  }

  return parsed.data
}

export const env = validateEnv()
