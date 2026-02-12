import { Webhooks } from "@polar-sh/nextjs"
import { supabase } from "@/lib/supabase"

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,

  onSubscriptionActive: async (payload) => {
    const sub = payload.data
    const customerEmail = sub.customer?.email

    if (!customerEmail) {
      console.error("[LogReef] Polar subscription active but no customer email")
      return
    }

    // Find our user by email
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", customerEmail)
      .maybeSingle()

    if (!user) {
      console.error("[LogReef] No user found for email:", customerEmail)
      return
    }

    // Upsert subscription
    await supabase.from("subscriptions").upsert(
      {
        user_id: user.id,
        polar_customer_id: sub.customer?.id || "",
        polar_subscription_id: sub.id,
        status: "active",
        current_period_end: sub.currentPeriodEnd,
      },
      { onConflict: "user_id" }
    )

    console.log("[LogReef] Subscription activated for user:", user.id)
  },

  onSubscriptionCanceled: async (payload) => {
    const sub = payload.data

    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "canceled" })
      .eq("polar_subscription_id", sub.id)

    if (error) {
      console.error("[LogReef] Failed to cancel subscription:", error.message)
    }
  },

  onSubscriptionRevoked: async (payload) => {
    const sub = payload.data

    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "revoked" })
      .eq("polar_subscription_id", sub.id)

    if (error) {
      console.error("[LogReef] Failed to revoke subscription:", error.message)
    }
  },

  onSubscriptionUpdated: async (payload) => {
    const sub = payload.data

    await supabase
      .from("subscriptions")
      .update({
        status: sub.status || "active",
        current_period_end: sub.currentPeriodEnd,
      })
      .eq("polar_subscription_id", sub.id)
  },
})
