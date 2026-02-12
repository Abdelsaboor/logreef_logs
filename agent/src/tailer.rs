use std::path::Path;
use tokio::fs::File;
use tokio::io::{AsyncBufReadExt, BufReader, AsyncSeekExt, SeekFrom};
use tokio::sync::mpsc::Sender;
use tracing::{info, warn};

/// Tail a single file, sending each new line to the channel.
/// Starts from EOF (like `tail -f`).
pub async fn tail_file(path: &str, tx: Sender<String>) -> anyhow::Result<()> {
    let path = Path::new(path);

    // Wait for file to exist
    loop {
        if path.exists() {
            break;
        }
        warn!(path = %path.display(), "Waiting for file to appear...");
        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
    }

    let file = File::open(path).await?;
    let mut reader = BufReader::new(file);

    // Seek to end to only tail new lines
    reader.seek(SeekFrom::End(0)).await?;

    info!(path = %path.display(), "Tailing file");

    let mut line = String::new();
    loop {
        line.clear();
        match reader.read_line(&mut line).await {
            Ok(0) => {
                // No new data, wait a bit
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
            }
            Ok(_) => {
                let trimmed = line.trim().to_string();
                if !trimmed.is_empty() {
                    if tx.send(trimmed).await.is_err() {
                        warn!("Channel closed, stopping tailer");
                        break;
                    }
                }
            }
            Err(e) => {
                warn!(error = %e, "Error reading file, retrying...");
                tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
            }
        }
    }

    Ok(())
}
