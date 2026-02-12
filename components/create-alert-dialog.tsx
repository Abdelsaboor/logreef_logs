"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface CreateAlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (payload: {
    name: string
    rule_type: string
    rule_value: string
  }) => void
}

export function CreateAlertDialog({
  open,
  onOpenChange,
  onCreate,
}: CreateAlertDialogProps) {
  const [name, setName] = useState("")
  const [ruleType, setRuleType] = useState("KEYWORD_CONTAINS")
  const [ruleValue, setRuleValue] = useState("")

  const handleSubmit = () => {
    if (!name || !ruleValue) return
    onCreate({ name, rule_type: ruleType, rule_value: ruleValue })
    setName("")
    setRuleType("KEYWORD_CONTAINS")
    setRuleValue("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Alert Rule</DialogTitle>
          <DialogDescription>
            Define conditions that will trigger an email notification.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="alert-name">Name</Label>
            <Input
              id="alert-name"
              placeholder="e.g., Error Spike"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Rule Type</Label>
            <Select value={ruleType} onValueChange={setRuleType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="KEYWORD_CONTAINS">
                  Keyword Contains
                </SelectItem>
                <SelectItem value="VOLUME_THRESHOLD">
                  Volume Threshold
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="rule-value">
              {ruleType === "KEYWORD_CONTAINS"
                ? "Keyword to match"
                : "Log count threshold"}
            </Label>
            <Input
              id="rule-value"
              placeholder={
                ruleType === "KEYWORD_CONTAINS" ? "error" : "1000"
              }
              value={ruleValue}
              onChange={(e) => setRuleValue(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name || !ruleValue}>
            Create Alert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
