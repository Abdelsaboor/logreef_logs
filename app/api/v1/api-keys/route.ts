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
    .from("api_keys")
    .select("id, last4, label, created_at, revoked_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { plan, usage } = await getUserUsage(userId)

  return NextResponse.json({
    api_keys: data || [],
    limit: plan.limits.api_keys,
    count: usage.api_keys_count,
    plan: plan.id,
  })
}

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()

  const { plan, usage } = await getUserUsage(userId)
  if (usage.api_keys_count >= plan.limits.api_keys) {
    return NextResponse.json(
      {
        error: `API key limit reached (${plan.limits.api_keys} on ${plan.name} plan). Upgrade to Pro for up to 10 keys.`,
        code: "API_KEY_LIMIT_REACHED",
      },
      { status: 403 }
    )
  }

  // Generate a random API key
  const keyBytes = crypto.getRandomValues(new Uint8Array(24))
  const plaintext = `lr_${Buffer.from(keyBytes).toString("base64url")}`
  const last4 = plaintext.slice(-4)

  // Hash the key with SHA-256
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(plaintext))
  const keyHash = Buffer.from(hashBuffer).toString("hex")

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      user_id: userId,
      key_hash: keyHash,
      last4,
      label: body.label || "",
    })
    .select("id, last4, label, created_at, revoked_at")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ api_key: data, plaintext_key: plaintext }, { status: 201 })
}
