use std::path::Path;

use tauri::State;

use crate::error::AppError;
use crate::s3::operations;
use crate::state::AppState;

#[tauri::command]
pub async fn download_file(
    app: tauri::AppHandle,
    key: String,
    dest_path: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    if key.trim().is_empty() || key.ends_with('/') {
        return Err(AppError::InvalidKey("Download key must be a file".into()).into_string());
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
    let dest = Path::new(&dest_path);
    if let Some(parent) = dest.parent() {
        if !parent.as_os_str().is_empty() {
            tokio::fs::create_dir_all(parent)
                .await
                .map_err(|e| AppError::Io(e).into_string())?;
        }
    }
    operations::get_object_to_file(&client, &bucket, &key, dest, &app)
        .await
        .map_err(AppError::into_string)
}
