import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Waves, ArrowRight } from "lucide-react"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const error = params.error

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Waves className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Welcome to LogReef
          </CardTitle>
          <CardDescription>
            Centralized log collection, search, and alerting for your
            infrastructure.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error === "no_code"
                ? "Authentication was cancelled. Please try again."
                : "Authentication failed. Please try again."}
            </div>
          )}

          <Button className="w-full" size="lg" asChild>
            <a href="/api/auth/login">
              Sign in with WorkOS
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-3 text-xs text-muted-foreground">
                or continue in demo mode
              </span>
            </div>
          </div>

          <Button variant="outline" className="w-full" size="lg" asChild>
            <Link href="/dashboard">
              Enter Demo Dashboard
            </Link>
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            WorkOS provides Magic Link, Google OAuth, and SAML SSO
            authentication. Demo mode uses seeded data.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
