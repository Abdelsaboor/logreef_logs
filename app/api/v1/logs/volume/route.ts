import { NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"
import { getSessionUserId } from "@/lib/session"

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const params = request.nextUrl.searchParams
  const from = params.get("from") || new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  const to = params.get("to") || new Date().toISOString()
  const bucket = params.get("bucket") || "minute"
  const service = params.get("service")

  const supabase = getSupabase()

  // Fetch raw logs and aggregate client-side (no custom RPC needed)
  let q = supabase
    .from("logs")
    .select("timestamp")
    .eq("user_id", userId)
    .gte("timestamp", from)
    .lte("timestamp", to)
    .order("timestamp", { ascending: true })
    .limit(5000)

  if (service) {
    q = q.eq("service", service)
  }

  const { data: rawLogs, error: fetchError } = await q

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const bucketMs = bucket === "hour" ? 3600000 : 60000
  const buckets = new Map<string, number>()

  for (const log of rawLogs || []) {
    const ts = new Date(log.timestamp).getTime()
    const bucketKey = new Date(Math.floor(ts / bucketMs) * bucketMs).toISOString()
    buckets.set(bucketKey, (buckets.get(bucketKey) || 0) + 1)
  }

  const volume = Array.from(buckets.entries()).map(([t, count]) => ({ t, count }))
  return NextResponse.json({ volume })
}
