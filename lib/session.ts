import { cookies } from "next/headers"
import { getSupabase } from "@/lib/supabase"

export interface SessionUser {
  id: string
  email: string
  workos_user_id: string
}

/**
 * Retrieve the currently authenticated user from the session cookie.
 * The auth callback stores a WorkOS access token as `lr_session`.
 * We decode the JWT payload to extract the `sub` (WorkOS user ID),
 * then look up the corresponding internal user in Supabase.
 *
 * Returns null if not authenticated or user not found.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("lr_session")?.value

    if (!sessionToken) {
      return null
    }

    // Decode the JWT payload (WorkOS access token)
    const parts = sessionToken.split(".")
    if (parts.length !== 3) {
      return null
    }

    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8")
    )

    const workosUserId = payload.sub
    if (!workosUserId) {
      return null
    }

    // Check expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null
    }

    // Look up the internal user
    const supabase = getSupabase()
    const { data: user } = await supabase
      .from("users")
      .select("id, email, workos_user_id")
      .eq("workos_user_id", workosUserId)
      .single()

    return user as SessionUser | null
  } catch (error) {
    console.error("[LogReef] Session verification error:", error)
    return null
  }
}

/**
 * Retrieve the user ID from the session.
 * Returns null if not authenticated.
 */
export async function getSessionUserId(): Promise<string | null> {
  const user = await getCurrentUser()
  return user?.id ?? null
}
