import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let _supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
      )
    }
    _supabase = createClient(supabaseUrl, supabaseServiceKey)
  }
  return _supabase
}

/** @deprecated Use getSupabase() instead for lazy initialization */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop]
  },
})
