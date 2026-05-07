use std::path::Path;

use tauri::State;

use crate::error::AppError;
use crate::s3::operations;
use crate::state::AppState;

#[tauri::command]
pub async fn upload_file(
    app: tauri::AppHandle,
    local_path: String,
    key: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let path = Path::new(&local_path);
    if !path.is_file() {
        return Err(AppError::Path("Select a valid file path".into()).into_string());
    }
    if key.trim().is_empty() || key.ends_with('/') {
        return Err(
            AppError::InvalidKey("Upload key must be a file object path".into()).into_string(),
        );
    }
    let client = state.client().await.map_err(AppError::into_string)?;
    let bucket = state.active_bucket().await;
    if bucket.is_empty() {
        return Err(AppError::NoActiveConnection.into_string());
    }
    operations::put_object_from_file(&client, &bucket, &key, path, &app)
        .await
        .map_err(AppError::into_string)
}
