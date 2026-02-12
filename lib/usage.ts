import { supabase } from "@/lib/supabase"
import { getPlanForUser, type Plan } from "@/lib/plans"

interface UsageData {
  plan: Plan
  usage: {
    logs_today: number
    alerts_count: number
    api_keys_count: number
  }
}

/**
 * Fetch the current plan + live usage counts for a user.
 * Used by API routes for limit enforcement and by the billing page for display.
 */
export async function getUserUsage(userId: string): Promise<UsageData> {
  // Fetch subscription, log count today, alert count, and api key count in parallel
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [subResult, logsResult, alertsResult, keysResult] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("status, polar_subscription_id, polar_customer_id, current_period_end")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("timestamp", todayStart.toISOString()),

    supabase
      .from("alerts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),

    supabase
      .from("api_keys")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("revoked_at", null),
  ])

  const plan = getPlanForUser(subResult.data)

  return {
    plan,
    usage: {
      logs_today: logsResult.count || 0,
      alerts_count: alertsResult.count || 0,
      api_keys_count: keysResult.count || 0,
    },
  }
}
