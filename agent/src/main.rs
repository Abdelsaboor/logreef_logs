use clap::Parser;
use tracing::{info, warn, error};
use tracing_subscriber::EnvFilter;

mod config;
mod shipper;
mod tailer;

#[derive(Parser, Debug)]
#[command(name = "logreef-agent", about = "Ship logs to LogReef")]
struct Cli {
    /// Path(s) to log files, supports glob patterns
    #[arg(short, long, value_delimiter = ',')]
    files: Vec<String>,

    /// LogReef ingest endpoint
    #[arg(long, default_value = "https://api.logreef.dev/api/v1/ingest")]
    endpoint: String,

    /// API key for authentication
    #[arg(long, env = "LOGREEF_API_KEY")]
    api_key: String,

    /// Service name tag
    #[arg(long, default_value = "default")]
    service: String,

    /// Hostname tag (auto-detected if omitted)
    #[arg(long)]
    host: Option<String>,

    /// Batch size before flushing
    #[arg(long, default_value_t = 50)]
    batch_size: usize,

    /// Flush interval in milliseconds
    #[arg(long, default_value_t = 2000)]
    flush_interval_ms: u64,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env().add_directive("logreef_agent=info".parse()?))
        .init();

    let cli = Cli::parse();

    let hostname = cli.host.unwrap_or_else(|| {
        hostname::get()
            .map(|h| h.to_string_lossy().to_string())
            .unwrap_or_else(|_| "unknown".to_string())
    });

    info!(
        files = ?cli.files,
        endpoint = %cli.endpoint,
        service = %cli.service,
        host = %hostname,
        batch_size = cli.batch_size,
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

    let (tx, rx) = tokio::sync::mpsc::channel::<String>(10_000);

    // Start file tailers
    for pattern in &cli.files {
        let tx = tx.clone();
        let pattern = pattern.clone();
        tokio::spawn(async move {
            if let Err(e) = tailer::tail_file(&pattern, tx).await {
                error!(file = %pattern, error = %e, "Tailer failed");
            }
        });
    }

    // Start the shipper
    shipper::run(cfg, rx).await?;

    Ok(())
}
