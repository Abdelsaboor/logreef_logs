import { NextRequest, NextResponse } from "next/server"
import { sendAlertEmail } from "@/lib/email"

/**
 * POST /api/v1/alerts/notify
 * Called by the Go backend alert evaluator to send email notifications via Resend.
 *
 * Body: { to, alertName, logMessage, logLevel, logService, logTimestamp }
 */
export async function POST(request: NextRequest) {
  try {
    // Simple bearer token check for internal service-to-service calls
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "")

    if (!token || token !== process.env.INTERNAL_API_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { to, alertName, logMessage, logLevel, logService, logTimestamp } = body

    if (!to || !alertName || !logMessage) {
      return NextResponse.json(
        { error: "Missing required fields: to, alertName, logMessage" },
        { status: 400 }
      )
    }

    const result = await sendAlertEmail({
      to,
      alertName,
      logMessage,
      logLevel: logLevel || "info",
      logService: logService || "unknown",
      logTimestamp: logTimestamp || new Date().toISOString(),
    })

    return NextResponse.json({ status: "sent", id: result?.id })
  } catch (error) {
    console.error("[LogReef] Alert notification error:", error)
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    )
  }
}
