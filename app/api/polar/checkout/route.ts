import { NextResponse } from "next/server"

// Lazy-load Polar Checkout to avoid crashes when env vars are missing
let _handler: ((req: Request) => Promise<Response>) | null = null

function getHandler() {
  if (!_handler) {
    if (!process.env.POLAR_ACCESS_TOKEN) {
      return null
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Checkout } = require("@polar-sh/nextjs")
    _handler = Checkout({
      accessToken: process.env.POLAR_ACCESS_TOKEN,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/billing?success=true`,
      server: (process.env.POLAR_SERVER as "sandbox" | "production") || "sandbox",
    })
  }
  return _handler
}

export async function GET(req: Request) {
  const handler = getHandler()
  if (!handler) {
    return NextResponse.json(
      { error: "Polar payment is not configured. Set POLAR_ACCESS_TOKEN." },
      { status: 503 }
    )
  }
  return handler(req)
}
