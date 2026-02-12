import { NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"
import { getSessionUserId } from "@/lib/session"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.rule_type !== undefined) updates.rule_type = body.rule_type
  if (body.rule_value !== undefined) updates.rule_value = body.rule_value
  if (body.is_enabled !== undefined) updates.is_enabled = body.is_enabled

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("alerts")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ alert: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const supabase = getSupabase()
  const { error } = await supabase
    .from("alerts")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ deleted: true })
}
