"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2, Mail, Search, BarChart3 } from "lucide-react"
import type { Alert } from "@/lib/types"

interface AlertCardProps {
  alert: Alert
  onToggle: (id: string, enabled: boolean) => void
  onDelete: (id: string) => void
}

export function AlertCard({ alert, onToggle, onDelete }: AlertCardProps) {
  const isKeyword = alert.rule_type === "KEYWORD_CONTAINS"

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            {isKeyword ? (
              <Search className="h-5 w-5 text-primary" />
            ) : (
              <BarChart3 className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{alert.name}</span>
              <Badge variant="outline" className="text-xs">
                {isKeyword ? "Keyword" : "Threshold"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {isKeyword
                ? `Contains "${alert.rule_value}"`
                : `Volume >= ${alert.rule_value} logs`}
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span>{alert.channel}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={alert.is_enabled}
            onCheckedChange={(checked) => onToggle(alert.id, checked)}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(alert.id)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete alert</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
