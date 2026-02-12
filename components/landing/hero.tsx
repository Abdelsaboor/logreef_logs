import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Terminal } from "lucide-react"

export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      {/* Subtle grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 pb-24 pt-24 text-center md:pt-32">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5">
          <Terminal className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">
            Open-source log management
          </span>
        </div>

        <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
          Logs that make
          <span className="text-primary"> sense</span>
        </h1>

        <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
          Collect, search, and alert on your infrastructure logs. A lightweight
          Rust agent ships your data to a fast Go backend with a clean
          dashboard.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/login">
              Start for free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <a
              href="https://github.com/logreef/logreef"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </a>
          </Button>
        </div>

        {/* Terminal preview */}
        <div className="mt-20 w-full max-w-3xl">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-primary/5">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-destructive/60" />
              <div className="h-3 w-3 rounded-full bg-chart-3/60" />
              <div className="h-3 w-3 rounded-full bg-primary/60" />
              <span className="ml-2 text-xs text-muted-foreground font-mono">
                terminal
              </span>
            </div>
            <div className="p-5 font-mono text-xs leading-6 md:text-sm md:leading-7">
              <div className="text-muted-foreground">
                {'$ curl -X POST https://api.logreef.dev/v1/ingest \\'}
              </div>
              <div className="text-muted-foreground pl-4">
                {'-H "Authorization: Bearer lr_abc...xyz" \\'}
              </div>
              <div className="text-muted-foreground pl-4">
                {'-d \'[{"level":"error","service":"api",'}
              </div>
              <div className="text-muted-foreground pl-8">
                {'"message":"Connection pool exhausted"}]\''}
              </div>
              <div className="mt-3 text-primary">
                {'{"status":"ok","ingested":1}'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
