import { NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/session"
import { getUserUsage } from "@/lib/usage"

export async function GET() {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { plan, usage } = await getUserUsage(userId)

    return NextResponse.json({
      plan: plan.id,
      plan_name: plan.name,
      price_monthly: plan.price_monthly,
      limits: plan.limits,
      permissions: plan.permissions,
      usage,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
