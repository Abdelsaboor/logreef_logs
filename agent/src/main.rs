use anyhow::{bail, Context, Result};
use clap::Parser;
use glob::glob;
use tokio::signal;
use tokio::sync::mpsc;
use tracing::{error, info, warn};
use tracing_subscriber::EnvFilter;

mod config;
mod shipper;
mod tailer;

#[derive(Parser, Debug)]
#[command(
    name = "logreef-agent",
    version,
    about = "Ship logs to LogReef"
)]
struct Cli {
    /// Path(s) to log files, supports glob patterns (e.g. /var/log/*.log)
    #[arg(short, long, value_delimiter = ',', required = true)]
    files: Vec<String>,

    /// LogReef ingest endpoint
    #[arg(long, default_value = "https://api.logreef.dev/api/v1/ingest")]
    endpoint: String,

    /// API key for authentication (can also be set via LOGREEF_API_KEY env var)
    #[arg(long, env = "LOGREEF_API_KEY")]
    api_key: String,

    /// Service name tag applied to every log line
    #[arg(long, default_value = "default")]
    service: String,

    /// Hostname tag (auto-detected if omitted)
    #[arg(long)]
    host: Option<String>,

    /// Number of log lines to batch before flushing
    #[arg(long, default_value_t = 50)]
    batch_size: usize,

    /// Maximum milliseconds between flushes
    #[arg(long, default_value_t = 2000)]
    flush_interval_ms: u64,
}

/// Expand glob patterns into concrete file paths.
fn expand_globs(patterns: &[String]) -> Result<Vec<String>> {
    let mut paths = Vec::new();
    for pattern in patterns {
        let matches: Vec<_> = glob(pattern)
            .with_context(|| format!("Invalid glob pattern: {pattern}"))?
            .collect();

        if matches.is_empty() {
            warn!(pattern = %pattern, "Glob matched zero files (will wait for file to appear)");
            // Keep the literal pattern so the tailer can wait for it
            paths.push(pattern.clone());
        } else {
            for entry in matches {
                match entry {
                    Ok(p) => {
                        if let Some(s) = p.to_str() {
                            paths.push(s.to_string());
                        }
                    }
                    Err(e) => warn!(error = %e, "Skipping unreadable glob entry"),
                }
            }
        }
    }
    Ok(paths)
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::from_default_env()
                .add_directive("logreef_agent=info".parse()?),
        )
        .init();

    let cli = Cli::parse();

    let hostname = cli.host.unwrap_or_else(|| {
        hostname::get()
            .map(|h| h.to_string_lossy().to_string())
            .unwrap_or_else(|_| "unknown".to_string())
    });

    let resolved_files = expand_globs(&cli.files)?;

    if resolved_files.is_empty() {
        bail!("No files to tail. Provide at least one --files path or glob pattern.");
    }

    info!(
        files = ?resolved_files,
        endpoint = %cli.endpoint,
        service = %cli.service,
        host = %hostname,
        batch_size = cli.batch_size,
        flush_interval_ms = cli.flush_interval_ms,
        "LogReef agent starting"
    );

    let cfg = config::AgentConfig {
        endpoint: cli.endpoint,
        api_key: cli.api_key,
        service: cli.service,
        host: hostname,
        batch_size: cli.batch_size,
        flush_interval_ms: cli.flush_interval_ms,
    };

    // Channel for tailers -> shipper
    let (tx, rx) = mpsc::channel::<String>(10_000);

    // Spawn one tailer per file
    let mut tailer_handles = Vec::new();
    for file_path in &resolved_files {
        let tx = tx.clone();
        let path = file_path.clone();
        let handle = tokio::spawn(async move {
            if let Err(e) = tailer::tail_file(&path, tx).await {
                error!(file = %path, error = %e, "Tailer exited with error");
            }
        });
        tailer_handles.push(handle);
    }

    // Drop the original sender so the shipper can detect when all tailers stop
    drop(tx);

    // Spawn the shipper
    let shipper_cfg = cfg.clone();
    let shipper_handle = tokio::spawn(async move {
        if let Err(e) = shipper::run(shipper_cfg, rx).await {
            error!(error = %e, "Shipper exited with error");
        }
    });

    // Graceful shutdown: wait for Ctrl+C
    tokio::select! {
        _ = signal::ctrl_c() => {
            info!("Received SIGINT, shutting down gracefully...");
        }
        _ = shipper_handle => {
            info!("Shipper finished (all tailers likely exited)");
        }
    }

    // Abort remaining tailers
    for handle in tailer_handles {
        handle.abort();
    }

    info!("LogReef agent stopped.");
    Ok(())
}
