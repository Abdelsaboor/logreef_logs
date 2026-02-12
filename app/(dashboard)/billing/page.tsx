"use client"

import { useSearchParams } from "next/navigation"
import useSWR from "swr"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  CreditCard,
  Zap,
  Shield,
  Clock,
  Key,
  Check,
  X,
  ExternalLink,
  ArrowUpRight,
} from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function UsageCard({
  icon: Icon,
  label,
  used,
  limit,
}: {
  icon: React.ElementType
  label: string
  used: number
  limit: number
}) {
  const pct = Math.min((used / limit) * 100, 100)
  const isNearLimit = pct >= 80
  const isAtLimit = pct >= 100

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </div>
          {isAtLimit && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              At limit
            </Badge>
          )}
          {isNearLimit && !isAtLimit && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-chart-3 border-chart-3/30 bg-chart-3/10">
              Near limit
            </Badge>
          )}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-foreground">
            {used.toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground">
            {"/ "}
            {limit.toLocaleString()}
          </span>
        </div>
        <Progress
          value={pct}
          className={
            isAtLimit ? "[&>div]:bg-destructive" : isNearLimit ? "[&>div]:bg-chart-3" : ""
          }
        />
      </CardContent>
    </Card>
  )
}

const LIMIT_ROWS = [
  { key: "logs_per_day", label: "Logs per day" },
  { key: "alerts", label: "Alert rules" },
  { key: "api_keys", label: "API keys" },
  { key: "retention_days", label: "Data retention (days)" },
  { key: "max_batch_size", label: "Max batch size" },
  { key: "rate_limit_per_minute", label: "Rate limit / min" },
] as const

const PERMISSION_ROWS = [
  { key: "full_text_search", label: "Full-text log search" },
  { key: "json_field_search", label: "JSON field search" },
  { key: "webhook_alerts", label: "Webhook alert channels" },
  { key: "priority_ingestion", label: "Priority ingestion" },
  { key: "export_csv", label: "CSV export" },
  { key: "team_members", label: "Team members" },
  { key: "sso_saml", label: "SSO / SAML" },
] as const

// Hard-coded plan data for comparison table (mirrors lib/plans.ts)
const FREE_LIMITS = { logs_per_day: 1_000, alerts: 3, api_keys: 1, retention_days: 7, max_batch_size: 100, rate_limit_per_minute: 60 }
const PRO_LIMITS = { logs_per_day: 100_000, alerts: 50, api_keys: 10, retention_days: 90, max_batch_size: 1_000, rate_limit_per_minute: 600 }
const FREE_PERMS = { full_text_search: true, json_field_search: false, webhook_alerts: false, priority_ingestion: false, export_csv: false, team_members: false, sso_saml: false }
const PRO_PERMS = { full_text_search: true, json_field_search: true, webhook_alerts: true, priority_ingestion: true, export_csv: true, team_members: false, sso_saml: false }

export default function BillingPage() {
  const searchParams = useSearchParams()
  const justUpgraded = searchParams.get("success") === "true"
  const { data } = useSWR("/api/v1/billing/status", fetcher)

  const plan = data?.plan || "free"
  const limits = data?.limits || FREE_LIMITS
  const usage = data?.usage || { logs_today: 0, alerts_count: 0, api_keys_count: 0 }
  const polarProductId = process.env.NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID

  return (
    <>
      <PageHeader title="Billing" />
      <div className="flex flex-col gap-6 p-6">
        {/* Success banner */}
        {justUpgraded && (
          <div className="rounded-lg border border-primary/50 bg-primary/10 px-4 py-3 text-sm text-primary">
            Your upgrade to Pro is being processed. It may take a moment for your new limits to take effect.
          </div>
        )}

        {/* Current Plan Header */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  Current Plan
                  <Badge
                    variant={plan === "pro" ? "default" : "secondary"}
                    className="uppercase"
                  >
                    {plan}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {plan === "pro"
                    ? "You have full access to all LogReef Pro features."
                    : "Upgrade to Pro for higher limits, longer retention, and advanced features."}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {plan === "pro" ? (
                  <Button variant="outline" asChild>
                    <a href="/api/polar/portal">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Manage Subscription
                    </a>
                  </Button>
                ) : (
                  <Button asChild>
                    <a
                      href={
                        polarProductId
                          ? `/api/polar/checkout?products=${polarProductId}`
                          : "#pricing-table"
                      }
                    >
                      <Zap className="mr-2 h-4 w-4" />
                      Upgrade to Pro -- $29/mo
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Live Usage */}
        <div>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Current Usage
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <UsageCard
              icon={CreditCard}
              label="Logs today"
              used={usage.logs_today}
              limit={limits.logs_per_day}
            />
            <UsageCard
              icon={Shield}
              label="Alert rules"
              used={usage.alerts_count}
              limit={limits.alerts}
            />
            <UsageCard
              icon={Key}
              label="API keys"
              used={usage.api_keys_count}
              limit={limits.api_keys}
            />
            <Card>
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Data retention</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-foreground">
                    {limits.retention_days}
                  </span>
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
                <Progress value={100} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Plan Comparison Table */}
        <Card id="pricing-table">
          <CardHeader>
            <CardTitle className="text-foreground">Plan Comparison</CardTitle>
            <CardDescription>
              See what is included in each plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/2">Feature</TableHead>
                  <TableHead className="text-center">Free</TableHead>
                  <TableHead className="text-center">
                    <span className="flex items-center justify-center gap-1.5">
                      Pro
                      <Badge variant="default" className="text-[10px] px-1.5 py-0">
                        $29/mo
                      </Badge>
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Limit rows */}
                {LIMIT_ROWS.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium text-foreground">
                      {row.label}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {(FREE_LIMITS[row.key as keyof typeof FREE_LIMITS]).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center font-medium text-foreground">
                      {(PRO_LIMITS[row.key as keyof typeof PRO_LIMITS]).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}

                {/* Separator */}
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="bg-muted/50 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    Permissions
                  </TableCell>
                </TableRow>

                {/* Permission rows */}
                {PERMISSION_ROWS.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium text-foreground">
                      {row.label}
                    </TableCell>
                    <TableCell className="text-center">
                      {FREE_PERMS[row.key as keyof typeof FREE_PERMS] ? (
                        <Check className="mx-auto h-4 w-4 text-primary" />
                      ) : (
                        <X className="mx-auto h-4 w-4 text-muted-foreground/40" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {PRO_PERMS[row.key as keyof typeof PRO_PERMS] ? (
                        <Check className="mx-auto h-4 w-4 text-primary" />
                      ) : (
                        <X className="mx-auto h-4 w-4 text-muted-foreground/40" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {plan !== "pro" && (
              <div className="mt-6 flex justify-center">
                <Button size="lg" asChild>
                  <a
                    href={
                      polarProductId
                        ? `/api/polar/checkout?products=${polarProductId}`
                        : "#"
                    }
                  >
                    <ArrowUpRight className="mr-2 h-4 w-4" />
                    Upgrade to Pro
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
