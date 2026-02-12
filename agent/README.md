# LogReef Agent

A lightweight Rust CLI that tails log files and ships them to the LogReef ingest API.

## Features

- **Glob patterns** -- pass `/var/log/*.log` and the agent expands it at startup.
- **File rotation detection** -- detects inode changes and truncation, re-opens from the start automatically.
- **Filesystem watcher** -- uses `notify` (inotify/kqueue/FSEvents) instead of busy-polling.
- **Batching** -- configurable batch size and flush interval.
- **Retry with backoff** -- exponential backoff on transient errors (429, 5xx), permanent errors are logged and dropped.
- **Graceful shutdown** -- handles `SIGINT` (Ctrl+C), flushes remaining logs before exiting.

## Quick Start

```bash
# Build
cd agent
cargo build --release

# Run
./target/release/logreef-agent \
  --files "/var/log/myapp/*.log" \
  --api-key "lr_live_..." \
  --service my-api \
  --endpoint https://api.logreef.dev/api/v1/ingest
```

Or set the API key via environment variable:

```bash
export LOGREEF_API_KEY="lr_live_..."
logreef-agent --files /var/log/app.log --service my-api
```

## CLI Options

| Flag | Default | Description |
|------|---------|-------------|
| `--files` | (required) | Comma-separated file paths or glob patterns |
| `--api-key` | `$LOGREEF_API_KEY` | Your LogReef API key |
| `--endpoint` | `https://api.logreef.dev/api/v1/ingest` | Ingest API URL |
| `--service` | `default` | Service name tag |
| `--host` | auto-detected | Hostname tag |
| `--batch-size` | `50` | Lines to batch before flushing |
| `--flush-interval-ms` | `2000` | Max ms between flushes |

## Docker

```bash
cd agent
docker build -t logreef-agent .
docker run -v /var/log:/var/log:ro \
  -e LOGREEF_API_KEY="lr_live_..." \
  logreef-agent --files "/var/log/app.log" --service my-api
```

## Level Detection

The agent infers log level from line content using a simple heuristic:

- Lines containing `error`, `fatal`, or `panic` are tagged `error`
- Lines containing `warn` are tagged `warn`
- Lines containing `debug` or `trace` are tagged `debug`
- Everything else defaults to `info`

## Architecture

```
                   +-----------+
  file1.log -----> |  Tailer   | ---+
                   +-----------+    |    +----------+    +-----------------+
                                    +--> | Channel  | -> |    Shipper      | -> LogReef API
                   +-----------+    |    | (10,000) |    | (batch + retry) |
  file2.log -----> |  Tailer   | ---+    +----------+    +-----------------+
                   +-----------+
```

Each file gets its own `Tailer` task. All tailers send lines into a shared `mpsc` channel. The `Shipper` drains the channel, batches lines, and POSTs them to the ingest API with exponential backoff on failure.
