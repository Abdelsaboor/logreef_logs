import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { DEMO_USER_ID } from "@/lib/constants"

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const from = params.get("from") || new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  const to = params.get("to") || new Date().toISOString()
  const bucket = params.get("bucket") || "minute"
  const service = params.get("service")

  const truncFn = bucket === "hour" ? "hour" : "minute"

  let rpcQuery = `
    SELECT date_trunc('${truncFn}', timestamp) AS t, COUNT(*)::int AS count
    FROM logs
    WHERE user_id = '${DEMO_USER_ID}'
      AND timestamp >= '${from}'
      AND timestamp <= '${to}'
  `

  if (service) {
    rpcQuery += ` AND service = '${service}'`
  }

  rpcQuery += ` GROUP BY t ORDER BY t ASC`

  const { data, error } = await supabase.rpc("exec_sql", { query: rpcQuery }).maybeSingle()

  // Fallback: if RPC doesn't exist, fetch raw and aggregate client-side
  if (error) {
    let q = supabase
      .from("logs")
      .select("timestamp")
      .eq("user_id", DEMO_USER_ID)
      .gte("timestamp", from)
      .lte("timestamp", to)
      .order("timestamp", { ascending: true })

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

  return NextResponse.json({ volume: data || [] })
}
