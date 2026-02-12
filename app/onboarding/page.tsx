"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Copy, Check, Waves, ArrowRight, Terminal } from "lucide-react"

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [keyLabel, setKeyLabel] = useState("My First Key")
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const handleCreateKey = async () => {
    const res = await fetch("/api/v1/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: keyLabel }),
    })
    const json = await res.json()
    setApiKey(json.plaintext_key)
    setStep(2)
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  const installCmd = "cargo install logreef-agent"
  const initCmd = `logreef-agent init --endpoint https://your-api.logreef.dev --api-key ${apiKey || "<YOUR_API_KEY>"}`
  const runCmd = 'logreef-agent tail --file /var/log/syslog --service my-app --host prod-1'

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Waves className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl">Get Started with LogReef</CardTitle>
          <CardDescription>
            Set up your first API key and install the log agent.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* Step 1: Create API Key */}
          <div className="flex flex-col gap-4 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                1
              </div>
              <h3 className="font-semibold">Create an API Key</h3>
              {step > 1 && <Check className="ml-auto h-5 w-5 text-primary" />}
            </div>
            {step === 1 ? (
              <div className="flex flex-col gap-3 pl-9">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="onboard-label">Key label</Label>
                  <Input
                    id="onboard-label"
                    value={keyLabel}
                    onChange={(e) => setKeyLabel(e.target.value)}
                    placeholder="e.g., Production Agent"
                  />
                </div>
                <Button onClick={handleCreateKey} className="w-fit">
                  Generate API Key
                </Button>
              </div>
            ) : (
              <div className="pl-9">
                <div className="flex items-center gap-2 rounded-md border bg-muted p-3 font-mono text-sm">
                  <code className="flex-1 break-all">{apiKey}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      apiKey && copyToClipboard(apiKey, "key")
                    }
                  >
                    {copied === "key" ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Save this key securely. It will not be shown again.
                </p>
              </div>
            )}
          </div>

          {/* Step 2: Install Agent */}
          <div className="flex flex-col gap-4 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                2
              </div>
              <h3 className="font-semibold">Install the Agent</h3>
            </div>
            <div className="flex flex-col gap-3 pl-9">
              <CodeBlock
                label="Install"
                code={installCmd}
                copied={copied}
                onCopy={copyToClipboard}
              />
              <CodeBlock
                label="Configure"
                code={initCmd}
                copied={copied}
                onCopy={copyToClipboard}
              />
              <CodeBlock
                label="Start tailing"
                code={runCmd}
                copied={copied}
                onCopy={copyToClipboard}
              />
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={() => router.push("/dashboard")}
          >
            Go to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function CodeBlock({
  label,
  code,
  copied,
  onCopy,
}: {
  label: string
  code: string
  copied: string | null
  onCopy: (text: string, label: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Terminal className="h-3 w-3" />
        {label}
      </span>
      <div className="flex items-center gap-2 rounded-md border bg-muted p-2 font-mono text-xs">
        <code className="flex-1 break-all">{code}</code>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => onCopy(code, label)}
        >
          {copied === label ? (
            <Check className="h-3 w-3 text-primary" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  )
}
