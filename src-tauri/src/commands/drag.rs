// Drag-out support: drag a remote object out of Vaulty into Finder
// (or any other app that accepts files).
//
// We can't currently do a true seamless drag-out (file appears at the
// drop location instantly) because Tauri 2 doesn't expose a webview→OS
// drag API. The proper fix on macOS is `NSFilePromiseProvider` + a
// custom Objective-C delegate, which is a focused project of its own.
//
// What we do instead: when the user drops outside the Vaulty window,
// the JS layer calls this command. We download the object to a
// per-process temp directory and reveal it in the platform's file
// manager (Finder on macOS, Explorer with `/select` on Windows,
// `xdg-open` on the parent dir on Linux). The user finishes the drag
// from there. One extra click, but the file ends up where they want
// it without any of the brittle native-drag glue.

use std::path::PathBuf;
use std::sync::OnceLock;

use tauri::{AppHandle, State};
use tokio::fs;

use crate::error::AppError;
use crate::s3::operations;
use crate::state::AppState;

/// Cache the per-process drag temp dir so repeated drags reuse the same
/// folder and we don't litter `$TMPDIR` with one-off staging dirs.
static DRAG_TEMP_DIR: OnceLock<PathBuf> = OnceLock::new();

fn drag_temp_root() -> PathBuf {
    DRAG_TEMP_DIR
        .get_or_init(|| {
            let mut p = std::env::temp_dir();
            p.push("vaulty-drag");
            let _ = std::fs::create_dir_all(&p);
            p
        })
        .clone()
}

fn basename_from_key(key: &str) -> String {
    let trimmed = key.trim_end_matches('/');
    let after_slash = trimmed.rsplit('/').next().unwrap_or(trimmed);
    if after_slash.is_empty() {
        "vaulty-export".to_string()
    } else {
        after_slash.to_string()
    }
}

/// Result of `start_drag_export`. `revealedOnly` is always `true` today
/// (we always fall back to revealing in the file manager). The flag is
/// kept so the JS layer doesn't need to change when we add a real native
/// drag path.
#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DragExportResult {
    pub path: String,
    pub revealed_only: bool,
}

#[tauri::command]
pub async fn start_drag_export(
    app: AppHandle,
    key: String,
    state: State<'_, AppState>,
) -> Result<DragExportResult, String> {
    if key.trim().is_empty() || key.ends_with('/') {
        return Err(AppError::InvalidKey("Drag-out requires a file key".into()).into_string());
    }
    let client = state.client().await.map_err(AppError::into_string)?;
    let bucket = state.active_bucket().await;
    if bucket.is_empty() {
        return Err(AppError::NoActiveConnection.into_string());
    }

    let _permit = state
        .acquire_transfer_permit()
        .await
        .map_err(AppError::into_string)?;

    let basename = basename_from_key(&key);
    let mut dest = drag_temp_root();
    // One subdir per object so concurrent drags of files with the same name
    // don't trample each other.
    dest.push(format!("{:x}", uuid::Uuid::new_v4().as_u128()));
    fs::create_dir_all(&dest)
        .await
        .map_err(|e| AppError::Io(e).into_string())?;
    dest.push(&basename);

    operations::get_object_to_file(&client, &bucket, &key, &dest, &app)
        .await
        .map_err(AppError::into_string)?;

    let path_str = dest.to_string_lossy().to_string();

    // Reveal in the platform file manager. Best-effort — failures here
    // shouldn't block returning the staged path to the JS caller.
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open")
            .arg("-R")
            .arg(&dest)
            .spawn();
    }
    #[cfg(target_os = "windows")]
    {
        let arg = format!("/select,{}", dest.display());
        let _ = std::process::Command::new("explorer").arg(arg).spawn();
    }
    #[cfg(target_os = "linux")]
    {
        if let Some(parent) = dest.parent() {
            let _ = std::process::Command::new("xdg-open").arg(parent).spawn();
        }
    }

    Ok(DragExportResult {
        path: path_str,
        revealed_only: true,
    })
}
