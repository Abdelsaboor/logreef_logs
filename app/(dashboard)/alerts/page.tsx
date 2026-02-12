"use client"

import { useState } from "react"
import useSWR from "swr"
import { PageHeader } from "@/components/page-header"
import { AlertCard } from "@/components/alert-card"
import { CreateAlertDialog } from "@/components/create-alert-dialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import type { Alert } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function AlertsPage() {
  const { data, mutate } = useSWR("/api/v1/alerts", fetcher)
  const [showCreate, setShowCreate] = useState(false)

  const alerts: Alert[] = data?.alerts || []

  const handleToggle = async (id: string, enabled: boolean) => {
    await fetch(`/api/v1/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_enabled: enabled }),
    })
    mutate()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/v1/alerts/${id}`, { method: "DELETE" })
    mutate()
  }

  const handleCreate = async (payload: {
    name: string
    rule_type: string
    rule_value: string
  }) => {
    await fetch("/api/v1/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    mutate()
    setShowCreate(false)
  }

  return (
    <>
      <PageHeader title="Alerts" />
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Alert Rules</h2>
            <p className="text-sm text-muted-foreground">
              Get notified when your logs match specific conditions.
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Alert
          </Button>
        </div>

        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
            <p>No alerts configured yet.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreate(true)}
            >
              Create your first alert
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        <CreateAlertDialog
          open={showCreate}
          onOpenChange={setShowCreate}
          onCreate={handleCreate}
        />
      </div>
    </>
  )
}
