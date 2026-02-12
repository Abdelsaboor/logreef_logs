import { NextRequest } from "next/server"
import { getSupabase } from "@/lib/supabase"

/**
 * Authenticate an ingest request via the X-API-Key header.
 * Hashes the provided key and looks up the matching api_keys row.
 * Returns the user_id if valid, or null.
 */
export async function authenticateApiKey(
  request: NextRequest
): Promise<string | null> {
  const apiKey = request.headers.get("x-api-key")

  if (!apiKey) {
    return null
  }

  // Hash the key the same way we do at creation time
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(apiKey)
  )
  const keyHash = Buffer.from(hashBuffer).toString("hex")

  const supabase = getSupabase()
  const { data } = await supabase
    .from("api_keys")
    .select("user_id")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .single()

  return data?.user_id ?? null
}
