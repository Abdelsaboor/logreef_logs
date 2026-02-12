import {
  Search,
  Bell,
  Cpu,
  Zap,
  Shield,
  BarChart3,
} from "lucide-react"

const features = [
  {
    icon: Search,
    title: "Full-text search",
    description:
      "Query millions of log lines in milliseconds. Filter by service, host, level, or free-text with Postgres full-text indexing.",
  },
  {
    icon: Bell,
    title: "Smart alerts",
    description:
      "Create keyword-match or volume-threshold alerts. Get notified via email through Resend the moment something breaks.",
  },
  {
    icon: Cpu,
    title: "Rust agent",
    description:
      "A tiny, single-binary log shipper built in Rust. Tails your files, batches efficiently, and sends with near-zero overhead.",
  },
  {
    icon: Zap,
    title: "Go backend",
    description:
      "A fast, concurrent API server in Go. Handles ingestion, search, and alert evaluation with minimal latency.",
  },
  {
    icon: Shield,
    title: "Secure by default",
    description:
      "WorkOS-powered SSO and Magic Link auth. API keys with SHA-256 hashing. TLS everywhere. Row-level data isolation.",
  },
  {
    icon: BarChart3,
    title: "Volume analytics",
    description:
      "Visualize log volume trends with per-minute or per-hour bucketed charts. Spot spikes before they become incidents.",
  },
]

export function LandingFeatures() {
  return (
    <section id="features" className="border-t border-border/50 bg-card/50">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl text-balance">
            Everything you need for production logs
          </h2>
          <p className="mt-4 text-base text-muted-foreground md:text-lg text-pretty max-w-2xl mx-auto">
            From ingestion to alerting, LogReef covers the full pipeline with a
            simple, self-hostable stack.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/30"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
