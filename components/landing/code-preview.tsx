import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const curlExample = `# Ingest a batch of logs
curl -X POST https://api.logreef.dev/v1/ingest \\
  -H "Authorization: Bearer lr_your_key" \\
  -H "Content-Type: application/json" \\
  -d '[
    {
      "timestamp": "2026-02-12T10:30:00Z",
      "level": "error",
      "service": "payments",
      "host": "prod-3",
      "message": "Stripe webhook timeout after 30s"
    },
    {
      "level": "info",
      "service": "api-gateway",
      "message": "Health check passed"
    }
  ]'`

const agentConfig = `# /etc/logreef/agent.toml
api_key = "lr_your_key"
endpoint = "https://api.logreef.dev"
flush_interval = 5
batch_size = 100

[[files]]
path = "/var/log/myapp/*.log"
service = "myapp"

[[files]]
path = "/var/log/nginx/access.log"
service = "nginx"`

const searchExample = `# Search for errors in the last hour
curl "https://api.logreef.dev/v1/logs/search?\\
  q=timeout&\\
  level=error&\\
  service=payments&\\
  from=2026-02-12T09:30:00Z&\\
  limit=50" \\
  -H "Authorization: Bearer lr_your_key"

# Response
{
  "logs": [
    {
      "id": 42891,
      "timestamp": "2026-02-12T10:30:00Z",
      "level": "error",
      "service": "payments",
      "host": "prod-3",
      "message": "Stripe webhook timeout after 30s"
    }
  ]
}`

export function LandingCodePreview() {
  return (
    <section id="code" className="border-t border-border/50">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl text-balance">
            Integrate in minutes
          </h2>
          <p className="mt-4 text-base text-muted-foreground md:text-lg text-pretty max-w-2xl mx-auto">
            Ship logs via the REST API or drop in the Rust agent. Query
            everything with a simple search API.
          </p>
        </div>

        <div className="mt-12">
          <Tabs defaultValue="ingest" className="w-full">
            <TabsList className="w-full justify-start bg-card border border-border">
              <TabsTrigger value="ingest" className="font-mono text-xs">
                ingest
              </TabsTrigger>
              <TabsTrigger value="agent" className="font-mono text-xs">
                agent.toml
              </TabsTrigger>
              <TabsTrigger value="search" className="font-mono text-xs">
                search
              </TabsTrigger>
            </TabsList>
            <TabsContent value="ingest">
              <div className="overflow-hidden rounded-b-xl border border-t-0 border-border bg-card">
                <pre className="overflow-x-auto p-5 font-mono text-xs leading-6 text-muted-foreground md:text-sm md:leading-7">
                  <code>{curlExample}</code>
                </pre>
              </div>
            </TabsContent>
            <TabsContent value="agent">
              <div className="overflow-hidden rounded-b-xl border border-t-0 border-border bg-card">
                <pre className="overflow-x-auto p-5 font-mono text-xs leading-6 text-muted-foreground md:text-sm md:leading-7">
                  <code>{agentConfig}</code>
                </pre>
              </div>
            </TabsContent>
            <TabsContent value="search">
              <div className="overflow-hidden rounded-b-xl border border-t-0 border-border bg-card">
                <pre className="overflow-x-auto p-5 font-mono text-xs leading-6 text-muted-foreground md:text-sm md:leading-7">
                  <code>{searchExample}</code>
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  )
}
