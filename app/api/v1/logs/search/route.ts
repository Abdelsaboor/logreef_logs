import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { DEMO_USER_ID } from "@/lib/constants"

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const query = params.get("query") || ""
  const from = params.get("from")
  const to = params.get("to")
  const service = params.get("service")
  const level = params.get("level")
  const host = params.get("host")
  const limit = Math.min(parseInt(params.get("limit") || "100"), 500)
  const cursor = parseInt(params.get("cursor") || "0")

  let q = supabase
    .from("logs")
    .select("*")
    .eq("user_id", DEMO_USER_ID)
    .order("timestamp", { ascending: false })
    .limit(limit)

  if (cursor > 0) {
    q = q.lt("id", cursor)
  }
  if (query) {
    q = q.ilike("message", `%${query}%`)
  }
  if (from) {
    q = q.gte("timestamp", from)
  }
  if (to) {
    q = q.lte("timestamp", to)
  }
  if (service) {
    q = q.eq("service", service)
  }
  if (level) {
    q = q.eq("level", level)
  }
  if (host) {
    q = q.eq("host", host)
  }

  const { data, error } = await q

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const nextCursor = data && data.length === limit ? data[data.length - 1].id : null

  return NextResponse.json({ logs: data || [], next_cursor: nextCursor })
}
