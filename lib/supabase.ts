import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { env } from "@/lib/env"

let _supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    )
  }
  return _supabase
}

/** @deprecated Use getSupabase() instead for lazy initialization */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop]
  },
})
