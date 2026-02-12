import { getSupabase } from "@/lib/supabase"

/**
 * Fetch distinct service and host values for a given user from their log data.
 */
export async function getUserFilterOptions(userId: string) {
  const supabase = getSupabase()

  const [servicesResult, hostsResult] = await Promise.all([
    supabase
      .from("logs")
      .select("service")
      .eq("user_id", userId)
      .limit(500),
    supabase
      .from("logs")
      .select("host")
      .eq("user_id", userId)
      .limit(500),
  ])

  const services = [
    ...new Set(
      (servicesResult.data || []).map(
        (row: { service: string }) => row.service
      )
    ),
  ].sort()

  const hosts = [
    ...new Set(
      (hostsResult.data || []).map((row: { host: string }) => row.host)
    ),
  ].sort()

  return { services, hosts }
}
