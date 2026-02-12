import { WorkOS } from "@workos-inc/node"
import { env } from "@/lib/env"

/**
 * WorkOS AuthKit helpers.
 *
 * In production:
 * 1. The user clicks "Sign in" which redirects to WorkOS-hosted auth page
 * 2. WorkOS handles MagicLink / Google OAuth / SAML SSO
 * 3. The callback route exchanges the code for a session
 * 4. We upsert the user in our Supabase `users` table
 */

let _workos: WorkOS | null = null

export function getWorkOS() {
  if (!_workos) {
    _workos = new WorkOS(env.WORKOS_API_KEY)
  }
  return _workos
}

export function getClientId() {
  return env.WORKOS_CLIENT_ID
}

export function getRedirectUri() {
  return env.NEXT_PUBLIC_WORKOS_REDIRECT_URI
}

export function isAuthConfigured(): boolean {
  return !!(
    env.WORKOS_API_KEY &&
    env.WORKOS_CLIENT_ID &&
    env.WORKOS_COOKIE_PASSWORD
  )
}

/**
 * Exchange a refresh token for a new access token via WorkOS.
 * Returns the new access token and refresh token, or null on failure.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const workos = getWorkOS()
    const result = await workos.userManagement.authenticateWithRefreshToken({
      clientId: getClientId(),
      refreshToken,
    })
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    }
  } catch (error) {
    console.error("[LogReef] Refresh token exchange failed:", error)
    return null
  }
}
