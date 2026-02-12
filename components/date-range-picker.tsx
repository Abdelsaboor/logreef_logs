"use client"

import * as React from "react"
import { format, subMinutes, subHours, subDays } from "date-fns"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const PRESETS = [
  { label: "15m", value: () => ({ from: subMinutes(new Date(), 15), to: new Date() }) },
  { label: "1h", value: () => ({ from: subHours(new Date(), 1), to: new Date() }) },
  { label: "3h", value: () => ({ from: subHours(new Date(), 3), to: new Date() }) },
  { label: "24h", value: () => ({ from: subDays(new Date(), 1), to: new Date() }) },
  { label: "7d", value: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
] as const

interface DateRangePickerProps {
  from: Date | undefined
  to: Date | undefined
  onRangeChange: (range: { from: Date | undefined; to: Date | undefined }) => void
  className?: string
}

export function DateRangePicker({
  from,
  to,
  onRangeChange,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)

  const dateRange: DateRange | undefined =
    from || to ? { from, to } : undefined

  function handlePreset(preset: (typeof PRESETS)[number]) {
    const range = preset.value()
    onRangeChange(range)
    setOpen(false)
  }

  function handleCalendarSelect(range: DateRange | undefined) {
    onRangeChange({ from: range?.from, to: range?.to })
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {/* Quick presets */}
      <div className="flex items-center gap-1">
        {PRESETS.map((preset) => (
          <Button
            key={preset.label}
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => handlePreset(preset)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Calendar popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 justify-start text-left text-xs font-normal",
              !from && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
            {from ? (
              to ? (
                <>
                  {format(from, "MMM d, HH:mm")} - {format(to, "MMM d, HH:mm")}
                </>
              ) : (
                format(from, "MMM d, HH:mm")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={from}
            selected={dateRange}
            onSelect={handleCalendarSelect}
            numberOfMonths={1}
            disabled={{ after: new Date() }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
