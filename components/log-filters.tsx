"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { LOG_LEVELS } from "@/lib/constants"

interface LogFiltersProps {
  query: string
  setQuery: (q: string) => void
  service: string
  setService: (s: string) => void
  level: string
  setLevel: (l: string) => void
  host: string
  setHost: (h: string) => void
  onSearch: () => void
  services: string[]
  hosts: string[]
}

export function LogFilters({
  query,
  setQuery,
  service,
  setService,
  level,
  setLevel,
  host,
  setHost,
  onSearch,
  services,
  hosts,
}: LogFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[240px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search logs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
          className="pl-9"
        />
      </div>
      <Select value={service} onValueChange={setService}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All Services" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Services</SelectItem>
          {services.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={level} onValueChange={setLevel}>
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="All Levels" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Levels</SelectItem>
          {LOG_LEVELS.map((l) => (
            <SelectItem key={l} value={l}>
              {l.toUpperCase()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={host} onValueChange={setHost}>
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="All Hosts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Hosts</SelectItem>
          {hosts.map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={onSearch}>Search</Button>
    </div>
  )
}
