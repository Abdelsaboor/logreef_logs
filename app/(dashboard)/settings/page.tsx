"use client"

import { useState } from "react"
import useSWR from "swr"
import { format } from "date-fns"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Copy, Check, Key } from "lucide-react"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function SettingsPage() {
  const { data, mutate } = useSWR("/api/v1/api-keys", fetcher)
  const [showCreate, setShowCreate] = useState(false)
  const [newKeyLabel, setNewKeyLabel] = useState("")
  const [newPlaintext, setNewPlaintext] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const apiKeys = data?.api_keys || []

  const handleCreate = async () => {
    const res = await fetch("/api/v1/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newKeyLabel }),
    })
    const json = await res.json()
    setNewPlaintext(json.plaintext_key)
    setNewKeyLabel("")
    mutate()
  }

  const handleRevoke = async (id: string) => {
    await fetch(`/api/v1/api-keys/${id}/revoke`, { method: "POST" })
    toast.success("API key revoked")
    mutate()
  }

  const handleCopy = () => {
    if (newPlaintext) {
      navigator.clipboard.writeText(newPlaintext)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <>
      <PageHeader title="Settings" />
      <div className="flex flex-col gap-6 p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>
                  Manage API keys used by the LogReef agent for log ingestion.
                </CardDescription>
              </div>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Key
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {apiKeys.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                <Key className="h-8 w-8" />
                <p>No API keys yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map(
                    (key: {
                      id: string
                      label: string
                      last4: string
                      created_at: string
                      revoked_at: string | null
                    }) => (
                      <TableRow key={key.id}>
                        <TableCell className="font-medium">
                          {key.label || "Unnamed"}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {"lr_****" + key.last4}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(key.created_at), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          {key.revoked_at ? (
                            <Badge variant="destructive">Revoked</Badge>
                          ) : (
                            <Badge variant="outline" className="text-emerald-400 border-emerald-400/30">
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!key.revoked_at && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevoke(key.id)}
                              className="text-destructive"
                            >
                              Revoke
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create Key Dialog */}
        <Dialog
          open={showCreate}
          onOpenChange={(open) => {
            setShowCreate(open)
            if (!open) {
              setNewPlaintext(null)
              setNewKeyLabel("")
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {newPlaintext ? "API Key Created" : "Create API Key"}
              </DialogTitle>
              <DialogDescription>
                {newPlaintext
                  ? "Copy this key now. You won't be able to see it again."
                  : "Create a new API key for the LogReef agent."}
              </DialogDescription>
            </DialogHeader>
            {newPlaintext ? (
              <div className="flex flex-col gap-4 py-4">
                <div className="flex items-center gap-2 rounded-md border bg-muted p-3 font-mono text-sm">
                  <code className="flex-1 break-all">{newPlaintext}</code>
                  <Button variant="ghost" size="icon" onClick={handleCopy}>
                    {copied ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 py-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="key-label">Label (optional)</Label>
                  <Input
                    id="key-label"
                    placeholder="e.g., Production Agent"
                    value={newKeyLabel}
                    onChange={(e) => setNewKeyLabel(e.target.value)}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              {newPlaintext ? (
                <Button
                  onClick={() => {
                    setShowCreate(false)
                    setNewPlaintext(null)
                  }}
                >
                  Done
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreate(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreate}>Create Key</Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
