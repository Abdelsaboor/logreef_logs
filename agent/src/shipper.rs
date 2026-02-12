use crate::config::AgentConfig;
use anyhow::Result;
use backoff::exponential::ExponentialBackoff;
use backoff::ExponentialBackoffBuilder;
use chrono::Utc;
use reqwest::Client;
use serde::Serialize;
use std::time::Duration;
use tokio::sync::mpsc::Receiver;
use tokio::time::interval;
use tracing::{error, info, warn};

/// A single log entry matching the LogReef ingest API schema.
#[derive(Serialize, Clone)]
struct LogEntry {
    timestamp: String,
    service: String,
    host: String,
    level: String,
    message: String,
}

/// Wrapper that matches the expected `{ "logs": [...] }` payload.
#[derive(Serialize)]
struct IngestPayload<'a> {
    logs: &'a [LogEntry],
}

const MAX_RETRIES: u32 = 5;
const MAX_RETRY_INTERVAL_SECS: u64 = 30;

/// Run the shipper loop: collects lines from the channel,
/// batches them, and POSTs to the ingest endpoint with retry.
pub async fn run(cfg: AgentConfig, mut rx: Receiver<String>) -> Result<()> {
    let client = Client::builder()
        .timeout(Duration::from_secs(15))
        .build()?;

    let mut batch: Vec<LogEntry> = Vec::with_capacity(cfg.batch_size);
    let mut tick = interval(Duration::from_millis(cfg.flush_interval_ms));

    loop {
        tokio::select! {
            msg = rx.recv() => {
                match msg {
                    Some(line) => {
                        let level = detect_level(&line);
                        batch.push(LogEntry {
                            timestamp: Utc::now().to_rfc3339(),
                            service: cfg.service.clone(),
                            host: cfg.host.clone(),
                            level,
                            message: line,
                        });

                        if batch.len() >= cfg.batch_size {
                            flush_with_retry(&client, &cfg, &mut batch).await;
                        }
                    }
                    None => {
                        // All senders dropped (all tailers exited).
                        // Flush remaining and exit.
                        if !batch.is_empty() {
                            flush_with_retry(&client, &cfg, &mut batch).await;
                        }
                        info!("All tailers disconnected, shipper exiting.");
                        return Ok(());
                    }
                }
            }
            _ = tick.tick() => {
                if !batch.is_empty() {
                    flush_with_retry(&client, &cfg, &mut batch).await;
                }
            }
        }
    }
}

/// Attempt to flush the batch with exponential backoff.
/// On permanent failure after MAX_RETRIES, drops the batch and logs an error.
async fn flush_with_retry(client: &Client, cfg: &AgentConfig, batch: &mut Vec<LogEntry>) {
    let count = batch.len();
    let payload = IngestPayload { logs: &batch };

    let backoff_config: ExponentialBackoff = ExponentialBackoffBuilder::new()
        .with_initial_interval(Duration::from_millis(500))
        .with_max_interval(Duration::from_secs(MAX_RETRY_INTERVAL_SECS))
        .with_max_elapsed_time(Some(Duration::from_secs(
            MAX_RETRY_INTERVAL_SECS * MAX_RETRIES as u64,
        )))
        .build();

    let body = match serde_json::to_vec(&payload) {
        Ok(b) => b,
        Err(e) => {
            error!(error = %e, "Failed to serialize batch, dropping {count} logs");
            batch.clear();
            return;
        }
    };

    let op = || async {
        let resp = client
            .post(&cfg.endpoint)
            .header("X-API-Key", &cfg.api_key)
            .header("Content-Type", "application/json")
            .body(body.clone())
            .send()
            .await
            .map_err(|e| {
                warn!(count, error = %e, "Network error sending batch, will retry");
                backoff::Error::Transient {
                    err: format!("network: {e}"),
                    retry_after: None,
                }
            })?;

        let status = resp.status();

        if status.is_success() {
            let resp_body: serde_json::Value = resp
                .json()
                .await
                .unwrap_or(serde_json::json!({}));
            let accepted = resp_body["accepted"].as_u64().unwrap_or(0);
            let dropped = resp_body["dropped"].as_u64().unwrap_or(0);

            info!(
                accepted,
                dropped,
                status = %status,
                "Batch sent successfully"
            );
            Ok(())
        } else if status == reqwest::StatusCode::TOO_MANY_REQUESTS
            || status.is_server_error()
        {
            // Transient: 429 rate-limited or 5xx server errors -> retry
            warn!(count, status = %status, "Transient error, will retry");
            Err(backoff::Error::Transient {
                err: format!("HTTP {status}"),
                retry_after: None,
            })
        } else {
            // Permanent: 400, 401, 413, etc. -> don't retry
            let body_text = resp.text().await.unwrap_or_default();
            error!(
                count,
                status = %status,
                body = %body_text,
                "Permanent error from ingest API, dropping batch"
            );
            Err(backoff::Error::Permanent(format!(
                "HTTP {status}: {body_text}"
            )))
        }
    };

    match backoff::future::retry(backoff_config, op).await {
        Ok(()) => {}
        Err(e) => {
            error!(count, error = %e, "Exhausted retries, dropping {count} logs");
        }
    }

    batch.clear();
}

/// Heuristic log level detection from line content.
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
