import { NextResponse } from "next/server"
import { DEMO_USER_ID } from "@/lib/constants"
import { getUserUsage } from "@/lib/usage"

export async function GET() {
  try {
    const { plan, usage } = await getUserUsage(DEMO_USER_ID)

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
