import { NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"
import { getSessionUserId } from "@/lib/session"
import { getUserUsage } from "@/lib/usage"

export async function GET() {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { plan, usage } = await getUserUsage(userId)

  return NextResponse.json({
    alerts: data || [],
    limit: plan.limits.alerts,
    count: usage.alerts_count,
    plan: plan.id,
    permissions: plan.permissions,
  })
}

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()

  const { plan, usage } = await getUserUsage(userId)
  if (usage.alerts_count >= plan.limits.alerts) {
    return NextResponse.json(
      {
        error: `Alert limit reached (${plan.limits.alerts} on ${plan.name} plan). Upgrade to Pro for up to 50 alert rules.`,
        code: "ALERT_LIMIT_REACHED",
      },
      { status: 403 }
    )
  }

  if (body.channel === "WEBHOOK" && !plan.permissions.webhook_alerts) {
    return NextResponse.json(
      {
        error: "Webhook alert channels require a Pro plan.",
        code: "PERMISSION_DENIED",
      },
      { status: 403 }
    )
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("alerts")
    .insert({
      user_id: userId,
      name: body.name || "Untitled Alert",
      rule_type: body.rule_type,
      rule_value: body.rule_value,
      channel: body.channel || "EMAIL",
      is_enabled: true,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ alert: data }, { status: 201 })
}
