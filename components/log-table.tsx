"use client"

import { format } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { LogEntry } from "@/lib/types"

function levelVariant(level: string) {
  switch (level) {
    case "error":
      return "destructive" as const
    case "warn":
      return "secondary" as const
    default:
      return "outline" as const
  }
}

function levelColor(level: string) {
  switch (level) {
    case "error":
      return "text-red-400"
    case "warn":
      return "text-yellow-400"
    case "debug":
      return "text-blue-400"
    default:
      return "text-emerald-400"
  }
}

export function LogTable({ logs }: { logs: LogEntry[] }) {
  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        No logs found. Adjust your filters or time range.
      </div>
    )
  }

  return (
    <ScrollArea className="h-[500px] rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Timestamp</TableHead>
            <TableHead className="w-[80px]">Level</TableHead>
            <TableHead className="w-[140px]">Service</TableHead>
            <TableHead className="w-[90px]">Host</TableHead>
            <TableHead>Message</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id} className="font-mono text-xs">
              <TableCell className="text-muted-foreground whitespace-nowrap">
                {format(new Date(log.timestamp), "MMM dd HH:mm:ss.SSS")}
              </TableCell>
              <TableCell>
                <Badge
                  variant={levelVariant(log.level)}
                  className={`text-[10px] uppercase font-bold ${levelColor(log.level)}`}
                >
                  {log.level}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {log.service}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {log.host}
              </TableCell>
              <TableCell className="max-w-[400px] truncate">
                {log.message}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  )
}
