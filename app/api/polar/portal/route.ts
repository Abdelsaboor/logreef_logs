import { NextRequest, NextResponse } from "next/server"

let _handler: ((req: NextRequest) => Promise<Response>) | null = null

function getHandler() {
  if (!_handler) {
    if (!process.env.POLAR_ACCESS_TOKEN) {
      return null
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { CustomerPortal } = require("@polar-sh/nextjs")
    _handler = CustomerPortal({
      accessToken: process.env.POLAR_ACCESS_TOKEN,
      getCustomerId: (req: NextRequest) => {
        const customerId = req.nextUrl.searchParams.get("customerId")
        return customerId || ""
      },
      server: (process.env.POLAR_SERVER as "sandbox" | "production") || "sandbox",
    })
  }
  return _handler
}

export async function GET(req: NextRequest) {
  const handler = getHandler()
  if (!handler) {
    return NextResponse.json(
      { error: "Polar payment is not configured. Set POLAR_ACCESS_TOKEN." },
      { status: 503 }
    )
  }
  return handler(req)
}
