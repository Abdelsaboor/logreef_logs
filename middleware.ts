import { NextRequest, NextResponse } from "next/server"

const PROTECTED_PAGE_PATHS = [
  "/dashboard",
  "/alerts",
  "/billing",
  "/settings",
  "/onboarding",
]

/** API routes that require session auth (not API-key auth like /ingest) */
const PROTECTED_API_PREFIXES = [
  "/api/v1/logs",
  "/api/v1/alerts",
  "/api/v1/me",
  "/api/v1/billing",
  "/api/v1/api-keys",
]

/** Decode a JWT and return its payload (without signature verification). */
function decodeJwtPayload(
  token: string
): { sub?: string; exp?: number } | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8")
    )
    return payload
  } catch {
    return null
  }
}

/** Check whether the JWT `exp` claim is in the past (with a 30-second buffer). */
function isTokenExpired(payload: { exp?: number }): boolean {
  if (!payload.exp) return false
  const bufferMs = 30 * 1000 // refresh 30s before actual expiry
  return payload.exp * 1000 - bufferMs < Date.now()
}

/**
 * Try to refresh the access token using the WorkOS refresh token.
 * This runs in the Edge Runtime, so we call the WorkOS API directly
 * rather than using the Node.js SDK.
 */
async function tryRefreshToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const apiKey = process.env.WORKOS_API_KEY
    const clientId = process.env.WORKOS_CLIENT_ID
    if (!apiKey || !clientId) return null

    const res = await fetch(
      "https://api.workos.com/user_management/authenticate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          grant_type: "refresh_token",
          client_id: clientId,
          refresh_token: refreshToken,
        }),
      }
    )

    if (!res.ok) return null

    const data = await res.json()
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    }
  } catch {
    return null
  }
}

function redirectToLogin(request: NextRequest, pathname: string) {
  const loginUrl = new URL("/login", request.url)
  loginUrl.searchParams.set("redirect", pathname)
  return NextResponse.redirect(loginUrl)
}

function unauthorizedJson() {
  return NextResponse.json(
    { error: "Unauthorized", message: "Session expired or invalid" },
    { status: 401 }
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtectedPage = PROTECTED_PAGE_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  )
  const isProtectedApi = PROTECTED_API_PREFIXES.some((p) =>
    pathname.startsWith(p)
  )

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next()
  }

  // ---- Retrieve session tokens ----
  const sessionToken = request.cookies.get("lr_session")?.value
  const refreshCookie = request.cookies.get("lr_refresh")?.value

  if (!sessionToken) {
    if (isProtectedApi) return unauthorizedJson()
    return redirectToLogin(request, pathname)
  }

  // ---- Decode & check expiry ----
  const payload = decodeJwtPayload(sessionToken)
  if (!payload) {
    if (isProtectedApi) return unauthorizedJson()
    return redirectToLogin(request, pathname)
  }

  // Token still valid: allow through
  if (!isTokenExpired(payload)) {
    return NextResponse.next()
  }

  // ---- Token expired: attempt refresh ----
  if (!refreshCookie) {
    if (isProtectedApi) return unauthorizedJson()
    return redirectToLogin(request, pathname)
  }

  const refreshed = await tryRefreshToken(refreshCookie)
  if (!refreshed) {
    // Refresh failed: clear cookies and redirect / 401
    const response = isProtectedApi
      ? unauthorizedJson()
      : redirectToLogin(request, pathname)
    response.cookies.delete("lr_session")
    response.cookies.delete("lr_refresh")
    return response
  }

  // ---- Refresh succeeded: set new cookies ----
  const response = NextResponse.next()
  const isProduction = process.env.NODE_ENV === "production"

  response.cookies.set("lr_session", refreshed.accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })

  response.cookies.set("lr_refresh", refreshed.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })

  return response
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/alerts/:path*",
    "/billing/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
    "/api/v1/logs/:path*",
    "/api/v1/alerts/:path*",
    "/api/v1/me/:path*",
    "/api/v1/billing/:path*",
    "/api/v1/api-keys/:path*",
  ],
}
