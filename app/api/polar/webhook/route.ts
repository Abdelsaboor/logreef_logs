import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

let _handler: ((req: Request) => Promise<Response>) | null = null

function getHandler() {
  if (!_handler) {
    if (!process.env.POLAR_WEBHOOK_SECRET) {
      return null
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Webhooks } = require("@polar-sh/nextjs")
    _handler = Webhooks({
      webhookSecret: process.env.POLAR_WEBHOOK_SECRET,

      onSubscriptionActive: async (payload: { data: Record<string, any> }) => {
        const sub = payload.data
        const customerEmail = sub.customer?.email

        if (!customerEmail) {
          console.error("[LogReef] Polar subscription active but no customer email")
          return
        }

        const { data: user } = await supabase
          .from("users")
          .select("id")
          .eq("email", customerEmail)
          .maybeSingle()

        if (!user) {
          console.error("[LogReef] No user found for email:", customerEmail)
          return
        }

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

      onSubscriptionCanceled: async (payload: { data: Record<string, any> }) => {
        const sub = payload.data
        await supabase
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("polar_subscription_id", sub.id)
      },

      onSubscriptionRevoked: async (payload: { data: Record<string, any> }) => {
        const sub = payload.data
        await supabase
          .from("subscriptions")
          .update({ status: "revoked" })
          .eq("polar_subscription_id", sub.id)
      },

      onSubscriptionUpdated: async (payload: { data: Record<string, any> }) => {
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
  }
  return _handler
}

export async function POST(req: Request) {
  const handler = getHandler()
  if (!handler) {
    return NextResponse.json(
      { error: "Polar webhooks not configured. Set POLAR_WEBHOOK_SECRET." },
      { status: 503 }
    )
  }
  return handler(req)
}
