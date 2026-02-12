import { NextRequest, NextResponse } from "next/server"
import { getWorkOS, getClientId } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { sendWelcomeEmail } from "@/lib/email"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", baseUrl))
  }

  try {
    const workos = getWorkOS()

    const { user, accessToken, refreshToken } =
      await workos.userManagement.authenticateWithCode({
        code,
        clientId: getClientId(),
      })

    // Upsert user into our Supabase users table
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("workos_user_id", user.id)
      .single()

    if (!existingUser) {
      // New user - insert and send welcome email
      await supabase.from("users").insert({
        workos_user_id: user.id,
        email: user.email,
      })

      // Send welcome email via Resend (non-blocking)
      if (process.env.RESEND_API_KEY) {
        sendWelcomeEmail({
          to: user.email,
          name: user.firstName || undefined,
        }).catch((err) =>
          console.error("[LogReef] Welcome email failed:", err)
        )
      }
    }

    // Set session cookie with access token
    const cookieStore = await cookies()
    cookieStore.set("lr_session", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    if (refreshToken) {
      cookieStore.set("lr_refresh", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })
    }

    // Redirect to dashboard (or onboarding for new users)
    const destination = existingUser ? "/dashboard" : "/onboarding"
    return NextResponse.redirect(new URL(destination, baseUrl))
  } catch (error) {
    console.error("[LogReef] Auth callback error:", error)
    return NextResponse.redirect(new URL("/login?error=auth_failed", baseUrl))
  }
}
