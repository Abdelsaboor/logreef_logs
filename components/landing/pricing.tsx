import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "For side projects and experimentation.",
    features: [
      "1 GB log storage",
      "7-day retention",
      "2 alert rules",
      "1 API key",
      "Community support",
    ],
    cta: "Get Started",
    variant: "outline" as const,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "For production workloads and small teams.",
    features: [
      "50 GB log storage",
      "30-day retention",
      "Unlimited alerts",
      "10 API keys",
      "Email support",
      "Priority ingestion",
    ],
    cta: "Start Free Trial",
    variant: "default" as const,
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large-scale infrastructure at any size.",
    features: [
      "Unlimited storage",
      "Custom retention",
      "SSO / SAML via WorkOS",
      "Unlimited API keys",
      "Dedicated support",
      "Self-hosted option",
    ],
    cta: "Contact Sales",
    variant: "outline" as const,
  },
]

export function LandingPricing() {
  return (
    <section id="pricing" className="border-t border-border/50 bg-card/50">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl text-balance">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-base text-muted-foreground md:text-lg text-pretty max-w-2xl mx-auto">
            Start free, upgrade when you need more. No surprise bills.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-xl border p-8 ${
                plan.popular
                  ? "border-primary bg-card shadow-lg shadow-primary/5"
                  : "border-border bg-card"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                  Most popular
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {plan.name}
                </h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-sm text-muted-foreground">
                      {plan.period}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </div>

              <ul className="mt-8 flex flex-1 flex-col gap-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                className="mt-8 w-full"
                variant={plan.variant}
                asChild
              >
                <Link href="/login">{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
