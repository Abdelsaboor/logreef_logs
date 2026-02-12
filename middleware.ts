import { NextRequest, NextResponse } from "next/server"

const PROTECTED_PATHS = ["/dashboard", "/alerts", "/billing", "/settings", "/onboarding"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if the path needs protection
  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  )

  if (!isProtected) {
    return NextResponse.next()
  }

  // Check for session cookie
  const session = request.cookies.get("lr_session")?.value

  if (!session) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/alerts/:path*",
    "/billing/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
  ],
}
