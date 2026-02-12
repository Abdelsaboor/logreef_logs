import { NextRequest } from "next/server"
import { CustomerPortal } from "@polar-sh/nextjs"

export const GET = CustomerPortal({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  getCustomerId: (req: NextRequest) => {
    // In production, resolve this from the authenticated user's subscription record
    // For now, use query param or default
    const customerId = req.nextUrl.searchParams.get("customerId")
    return customerId || ""
  },
  server: (process.env.POLAR_SERVER as "sandbox" | "production") || "sandbox",
})
