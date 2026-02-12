use crate::config::AgentConfig;
use chrono::Utc;
use reqwest::Client;
use serde::Serialize;
use tokio::sync::mpsc::Receiver;
use tokio::time::{interval, Duration};
use tracing::{info, warn, error};

#[derive(Serialize)]
struct LogPayload {
    timestamp: String,
    service: String,
    host: String,
    level: String,
    message: String,
}

/// Run the shipper loop: collects lines from the channel,
/// batches them, and POSTs to the ingest endpoint.
pub async fn run(cfg: AgentConfig, mut rx: Receiver<String>) -> anyhow::Result<()> {
    let client = Client::builder()
        .timeout(Duration::from_secs(10))
        .build()?;

    let mut batch: Vec<LogPayload> = Vec::with_capacity(cfg.batch_size);
    let mut tick = interval(Duration::from_millis(cfg.flush_interval_ms));

    loop {
        tokio::select! {
            Some(line) = rx.recv() => {
                let level = detect_level(&line);
                batch.push(LogPayload {
                    timestamp: Utc::now().to_rfc3339(),
                    service: cfg.service.clone(),
                    host: cfg.host.clone(),
                    level,
                    message: line,
                });

                if batch.len() >= cfg.batch_size {
                    flush(&client, &cfg, &mut batch).await;
                }
            }
            _ = tick.tick() => {
                if !batch.is_empty() {
                    flush(&client, &cfg, &mut batch).await;
                }
            }
        }
    }
}

async fn flush(client: &Client, cfg: &AgentConfig, batch: &mut Vec<LogPayload>) {
    let count = batch.len();
    info!(count, "Flushing batch to {}", cfg.endpoint);

    match client
        .post(&cfg.endpoint)
        .bearer_auth(&cfg.api_key)
        .json(batch)
        .send()
        .await
    {
        Ok(resp) => {
            if resp.status().is_success() {
                info!(count, status = %resp.status(), "Batch accepted");
            } else {
                warn!(count, status = %resp.status(), "Ingest rejected batch");
            }
        }
        Err(e) => {
            error!(count, error = %e, "Failed to send batch (will retry next cycle)");
            // In a production agent we'd implement retry with exponential backoff
            // and persist to a local WAL. For MVP we just log and drop.
        }
    }

    batch.clear();
}

/// Simple heuristic: detect log level from the line content.
fn detect_level(line: &str) -> String {
    let lower = line.to_lowercase();
    if lower.contains("error") || lower.contains("fatal") || lower.contains("panic") {
        "error".to_string()
    } else if lower.contains("warn") {
        "warn".to_string()
    } else if lower.contains("debug") || lower.contains("trace") {
        "debug".to_string()
    } else {
        "info".to_string()
    }
}
