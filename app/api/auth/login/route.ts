import { NextResponse } from "next/server"
import { getWorkOS, getClientId, getRedirectUri, isAuthConfigured } from "@/lib/auth"

export async function GET() {
  // In demo mode (no WorkOS configured), redirect straight to dashboard
  if (!isAuthConfigured()) {
    return NextResponse.redirect(new URL("/dashboard", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"))
  }

  const workos = getWorkOS()
  const authorizationUrl = workos.userManagement.getAuthorizationUrl({
    provider: "authkit",
    clientId: getClientId(),
    redirectUri: getRedirectUri(),
  })

  return NextResponse.redirect(authorizationUrl)
}
