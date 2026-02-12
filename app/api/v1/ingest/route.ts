import { NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"
import { authenticateApiKey } from "@/lib/api-auth"
import { getUserUsage } from "@/lib/usage"

export async function POST(request: NextRequest) {
  // Authenticate via API key
  const userId = await authenticateApiKey(request)
  if (!userId) {
    return NextResponse.json(
      { error: "Invalid or missing API key. Pass your key in the X-API-Key header." },
      { status: 401 }
    )
  }

  const body = await request.json()
  const logs = body.logs

  if (!Array.isArray(logs) || logs.length === 0) {
    return NextResponse.json({ error: "logs array required" }, { status: 400 })
  }

  // Enforce plan limits
  const { plan, usage } = await getUserUsage(userId)

  if (logs.length > plan.limits.max_batch_size) {
    return NextResponse.json(
      {
        error: `Batch size ${logs.length} exceeds plan limit of ${plan.limits.max_batch_size}. Upgrade to Pro for larger batches.`,
        code: "BATCH_SIZE_EXCEEDED",
      },
      { status: 413 }
    )
  }

  const remainingToday = plan.limits.logs_per_day - usage.logs_today
  if (remainingToday <= 0) {
    return NextResponse.json(
      {
        error: `Daily log limit of ${plan.limits.logs_per_day.toLocaleString()} reached. Upgrade to Pro for 100,000 logs/day.`,
        code: "DAILY_LIMIT_REACHED",
        usage: { logs_today: usage.logs_today, limit: plan.limits.logs_per_day },
      },
      { status: 429 }
    )
  }

  // Only ingest up to the remaining capacity
  const acceptedLogs = logs.slice(0, remainingToday)

  const rows = acceptedLogs.map((log: Record<string, unknown>) => ({
    user_id: userId,
    timestamp: log.timestamp || new Date().toISOString(),
    service: log.service || "default",
    host: log.host || "unknown",
    level: log.level || "info",
    message: log.message || "",
    raw_json: log.raw_json || null,
  }))

  const supabase = getSupabase()
  const { error } = await supabase.from("logs").insert(rows)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const dropped = logs.length - acceptedLogs.length

  return NextResponse.json({
    accepted: acceptedLogs.length,
    dropped,
    ...(dropped > 0 && {
      warning: `${dropped} logs dropped - daily limit reached. Upgrade for higher limits.`,
    }),
  })
}
