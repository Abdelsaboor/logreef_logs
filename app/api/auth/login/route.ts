import { NextResponse } from "next/server"
import { getWorkOS, getClientId, getRedirectUri } from "@/lib/auth"

export async function GET() {
  const workos = getWorkOS()
  const authorizationUrl = workos.userManagement.getAuthorizationUrl({
    provider: "authkit",
    clientId: getClientId(),
    redirectUri: getRedirectUri(),
  })

  return NextResponse.redirect(authorizationUrl)
}
