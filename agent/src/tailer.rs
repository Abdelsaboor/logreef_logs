use anyhow::{Context, Result};
use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::{Path, PathBuf};
use tokio::fs::File;
use tokio::io::{AsyncBufReadExt, AsyncSeekExt, BufReader, SeekFrom};
use tokio::sync::mpsc::Sender;
use tracing::{info, warn};

/// Tail a single file, sending each new line to the channel.
///
/// Behaviour:
/// - If the file does not exist yet, waits for it to appear (polling every 1s).
/// - Starts reading from EOF (like `tail -f`).
/// - Uses `notify` to watch for filesystem events rather than busy-polling.
/// - Detects file rotation (truncation or replacement) and re-opens from the start.
pub async fn tail_file(path: &str, tx: Sender<String>) -> Result<()> {
    let path = PathBuf::from(path);

    // ---- Wait for the file to exist ----
    wait_for_file(&path).await;

    // ---- Initial open at EOF ----
    let (mut reader, mut inode) = open_at_end(&path).await?;

    // ---- Set up filesystem watcher with an async channel ----
    let (notify_tx, mut notify_rx) = tokio::sync::mpsc::channel::<()>(64);

    let watch_path = path.clone();
    let mut watcher: RecommendedWatcher =
        notify::recommended_watcher(move |res: notify::Result<Event>| {
            if let Ok(event) = res {
                match event.kind {
                    EventKind::Modify(_) | EventKind::Create(_) | EventKind::Remove(_) => {
                        let _ = notify_tx.blocking_send(());
                    }
                    _ => {}
                }
            }
        })
        .context("Failed to create filesystem watcher")?;

    // Watch the parent directory so we also catch file replacement / rotation
    let parent = watch_path
        .parent()
        .unwrap_or_else(|| Path::new("."));
    watcher
        .watch(parent, RecursiveMode::NonRecursive)
        .context("Failed to watch parent directory")?;

    info!(path = %path.display(), "Tailing file (notify watcher active)");

    // ---- Read loop ----
    let mut line_buf = String::new();

    loop {
        // Drain all available lines
        loop {
            line_buf.clear();
            match reader.read_line(&mut line_buf).await {
                Ok(0) => break, // no more data right now
                Ok(_) => {
                    let trimmed = line_buf.trim().to_string();
                    if !trimmed.is_empty() {
                        if tx.send(trimmed).await.is_err() {
                            warn!(path = %path.display(), "Channel closed, stopping tailer");
                            return Ok(());
                        }
                    }
                }
                Err(e) => {
                    warn!(path = %path.display(), error = %e, "Read error, will re-check file");
                    break;
                }
            }
        }

        // ---- Check for file rotation (inode changed or file truncated) ----
        if let Some(new_inode) = detect_rotation(&path, &mut reader, inode).await {
            info!(path = %path.display(), "File rotation detected, re-opening from start");
            match open_at_start(&path).await {
                Ok((new_reader, new_ino)) => {
                    reader = new_reader;
                    inode = new_ino;
                }
                Err(e) => {
                    warn!(path = %path.display(), error = %e, "Failed to re-open after rotation");
                    // Fall through and wait for next notify event
                }
            }
            continue;
        }

        // ---- Wait for the next filesystem event (or timeout as a safety net) ----
        tokio::select! {
            _ = notify_rx.recv() => { /* fs event, go read */ }
            _ = tokio::time::sleep(tokio::time::Duration::from_secs(2)) => {
                // Safety-net poll in case notify misses an event
            }
        }
    }
}

// ---------- Helpers ----------

/// Block (async) until the file exists on disk.
async fn wait_for_file(path: &Path) {
    let mut warned = false;
    loop {
        if path.exists() {
            return;
        }
        if !warned {
            warn!(path = %path.display(), "Waiting for file to appear...");
            warned = true;
        }
        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
    }
}

/// Open a file and seek to the end. Returns the buffered reader and the inode number.
async fn open_at_end(path: &Path) -> Result<(BufReader<File>, u64)> {
    let file = File::open(path).await.context("Opening file")?;
    let meta = file.metadata().await?;
    let ino = inode_of(&meta);
    let mut reader = BufReader::new(file);
    reader.seek(SeekFrom::End(0)).await?;
    Ok((reader, ino))
}

/// Open a file from the start (used after rotation). Returns the buffered reader and the inode.
async fn open_at_start(path: &Path) -> Result<(BufReader<File>, u64)> {
    let file = File::open(path).await.context("Re-opening rotated file")?;
    let meta = file.metadata().await?;
    let ino = inode_of(&meta);
    let reader = BufReader::new(file);
    Ok((reader, ino))
}

/// Detect file rotation by checking:
/// 1. The file's inode changed (log rotation replaced the file).
/// 2. The file was truncated (current position > file size).
///
/// Returns `Some(new_inode)` if rotation occurred, `None` otherwise.
async fn detect_rotation(
    path: &Path,
    reader: &mut BufReader<File>,
    old_inode: u64,
) -> Option<u64> {
    let meta = match tokio::fs::metadata(path).await {
        Ok(m) => m,
        Err(_) => return None, // file disappeared momentarily
    };

    let current_inode = inode_of(&meta);

    // Inode changed -> file was replaced
    if current_inode != old_inode {
        return Some(current_inode);
    }

    // File truncated -> size < our current position
    let file_size = meta.len();
    let pos = reader.seek(SeekFrom::Current(0)).await.unwrap_or(0);
    if file_size < pos {
        return Some(current_inode);
    }

    None
}

/// Extract the inode number from file metadata. Falls back to 0 on non-Unix systems.
#[cfg(unix)]
fn inode_of(meta: &std::fs::Metadata) -> u64 {
    use std::os::unix::fs::MetadataExt;
    meta.ino()
}

#[cfg(not(unix))]
fn inode_of(_meta: &std::fs::Metadata) -> u64 {
    0
}
