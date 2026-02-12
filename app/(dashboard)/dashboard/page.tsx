"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { subHours } from "date-fns"
import useSWR from "swr"
import { PageHeader } from "@/components/page-header"
import { LogFilters } from "@/components/log-filters"
import { LogTable } from "@/components/log-table"
import { LogVolumeChart } from "@/components/log-volume-chart"
import { Card, CardContent } from "@/components/ui/card"
import { Activity, AlertTriangle, Server, FileText } from "lucide-react"

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Unauthorized")
    return r.json()
  })

function buildSearchUrl(params: {
  query: string
  service: string
  level: string
  host: string
  from: Date | undefined
  to: Date | undefined
}) {
  const url = new URL("/api/v1/logs/search", window.location.origin)
  if (params.query) url.searchParams.set("query", params.query)
  if (params.service && params.service !== "all")
    url.searchParams.set("service", params.service)
  if (params.level && params.level !== "all")
    url.searchParams.set("level", params.level)
  if (params.host && params.host !== "all")
    url.searchParams.set("host", params.host)
  if (params.from) url.searchParams.set("from", params.from.toISOString())
  if (params.to) url.searchParams.set("to", params.to.toISOString())
  url.searchParams.set("limit", "100")
  return url.toString()
}

function buildVolumeUrl(params: {
  from: Date | undefined
  to: Date | undefined
}) {
  const url = new URL("/api/v1/logs/volume", window.location.origin)
  url.searchParams.set("bucket", "minute")
  if (params.from) url.searchParams.set("from", params.from.toISOString())
  if (params.to) url.searchParams.set("to", params.to.toISOString())
  return url.toString()
}

/** Custom hook to debounce a value by `delay` ms. */
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}

export default function DashboardPage() {
  const [query, setQuery] = useState("")
  const [service, setService] = useState("all")
  const [level, setLevel] = useState("all")
  const [host, setHost] = useState("all")
  const [from, setFrom] = useState<Date | undefined>(() => subHours(new Date(), 3))
  const [to, setTo] = useState<Date | undefined>(() => new Date())

  const debouncedQuery = useDebounce(query, 300)

  // Build URLs reactively based on current filter state
  const searchUrl = useMemo(
    () =>
      buildSearchUrl({
        query: debouncedQuery,
        service,
        level,
        host,
        from,
        to,
      }),
    [debouncedQuery, service, level, host, from, to]
  )

  const volumeUrl = useMemo(
    () => buildVolumeUrl({ from, to }),
    [from, to]
  )

  const { data: logsData, isLoading: logsLoading } = useSWR(searchUrl, fetcher, {
    refreshInterval: 10000,
  })
  const { data: volumeData } = useSWR(volumeUrl, fetcher, {
    refreshInterval: 30000,
  })
  const { data: filtersData } = useSWR("/api/v1/logs/filters", fetcher)

  const handleRangeChange = useCallback(
    (range: { from: Date | undefined; to: Date | undefined }) => {
      setFrom(range.from)
      setTo(range.to)
    },
    []
  )

  const logs = logsData?.logs || []
  const volume = volumeData?.volume || []
  const services: string[] = filtersData?.services || []
  const hosts: string[] = filtersData?.hosts || []

  const errorCount = logs.filter(
    (l: { level: string }) => l.level === "error"
  ).length
  const warnCount = logs.filter(
    (l: { level: string }) => l.level === "warn"
  ).length
  const uniqueServices = new Set(logs.map((l: { service: string }) => l.service))
    .size

  return (
    <>
      <PageHeader title="Log Explorer" />
      <div className="flex flex-col gap-6 p-6">
        {/* Stats cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Logs</p>
                <p className="text-2xl font-bold">{logs.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Errors</p>
                <p className="text-2xl font-bold">{errorCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-3/10">
                <Activity className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Warnings</p>
                <p className="text-2xl font-bold">{warnCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
                <Server className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Services</p>
                <p className="text-2xl font-bold">{uniqueServices}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Volume chart */}
        <LogVolumeChart data={volume} />

        {/* Filters */}
        <LogFilters
          query={query}
          setQuery={setQuery}
          service={service}
          setService={setService}
          level={level}
          setLevel={setLevel}
          host={host}
          setHost={setHost}
          from={from}
          to={to}
          onRangeChange={handleRangeChange}
          services={services}
          hosts={hosts}
        />

        {/* Log table */}
        {logsLoading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            Loading logs...
          </div>
        ) : (
          <LogTable logs={logs} />
        )}
      </div>
    </>
  )
}
