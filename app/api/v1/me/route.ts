import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { DEMO_USER_ID } from "@/lib/constants"

export async function GET() {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", DEMO_USER_ID)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ user: data })
}
