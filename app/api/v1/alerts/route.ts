import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { DEMO_USER_ID } from "@/lib/constants"
import { getUserUsage } from "@/lib/usage"

export async function GET() {
  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .eq("user_id", DEMO_USER_ID)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Also return usage + limits for the UI
  const { plan, usage } = await getUserUsage(DEMO_USER_ID)

  return NextResponse.json({
    alerts: data || [],
    limit: plan.limits.alerts,
    count: usage.alerts_count,
    plan: plan.id,
    permissions: plan.permissions,
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Enforce alert count limit
  const { plan, usage } = await getUserUsage(DEMO_USER_ID)
  if (usage.alerts_count >= plan.limits.alerts) {
    return NextResponse.json(
      {
        error: `Alert limit reached (${plan.limits.alerts} on ${plan.name} plan). Upgrade to Pro for up to 50 alert rules.`,
        code: "ALERT_LIMIT_REACHED",
      },
      { status: 403 }
    )
  }

  // Enforce webhook permission
  if (body.channel === "WEBHOOK" && !plan.permissions.webhook_alerts) {
    return NextResponse.json(
      {
        error: "Webhook alert channels require a Pro plan.",
        code: "PERMISSION_DENIED",
      },
      { status: 403 }
    )
  }

  const { data, error } = await supabase
    .from("alerts")
    .insert({
      user_id: DEMO_USER_ID,
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
