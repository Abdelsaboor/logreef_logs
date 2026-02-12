import { WorkOS } from "@workos-inc/node"

/**
 * WorkOS AuthKit helpers.
 *
 * In production:
 * 1. The user clicks "Sign in" which redirects to WorkOS-hosted auth page
 * 2. WorkOS handles MagicLink / Google OAuth / SAML SSO
 * 3. The callback route exchanges the code for a session
 * 4. We upsert the user in our Supabase `users` table
 *
 * Required env vars:
 * - WORKOS_API_KEY
 * - WORKOS_CLIENT_ID
 * - WORKOS_COOKIE_PASSWORD (32+ char random string)
 * - NEXT_PUBLIC_WORKOS_REDIRECT_URI (e.g. http://localhost:3000/api/auth/callback)
 */

export function getWorkOS() {
  return new WorkOS(process.env.WORKOS_API_KEY!)
}

export function getClientId() {
  return process.env.WORKOS_CLIENT_ID!
}

export function getRedirectUri() {
  return process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI || "http://localhost:3000/api/auth/callback"
}

export function isAuthConfigured(): boolean {
  return !!(
    process.env.WORKOS_API_KEY &&
    process.env.WORKOS_CLIENT_ID &&
    process.env.WORKOS_COOKIE_PASSWORD
  )
}
