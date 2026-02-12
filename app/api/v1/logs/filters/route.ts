import { NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/session"
import { getUserFilterOptions } from "@/lib/filters"

export async function GET() {
  const userId = await getSessionUserId()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { services, hosts } = await getUserFilterOptions(userId)

  return NextResponse.json({ services, hosts })
}
