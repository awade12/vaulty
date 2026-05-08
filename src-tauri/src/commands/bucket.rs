use serde::Serialize;
use tauri::Manager;
use tauri::State;

use crate::error::AppError;
use crate::s3::operations;
use crate::s3::types::{BucketFile, CleanupReport, DeletePreview, ObjectDetails, UsageSummary};
use crate::state::AppState;
use crate::storage::activity;

/// Result of a recursive bucket-wide search. `truncated` is true when we hit
/// the listing cap before the bucket was fully scanned, so the UI can hint
/// the user to refine their query.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub matches: Vec<BucketFile>,
    pub scanned: u32,
    pub truncated: bool,
}

#[tauri::command]
pub async fn list_files(
    prefix: String,
    state: State<'_, AppState>,
) -> Result<Vec<BucketFile>, String> {
    let client = state.client().await.map_err(AppError::into_string)?;
    let bucket = state.active_bucket().await;
    if bucket.is_empty() {
        return Err(AppError::NoActiveConnection.into_string());
    }
    operations::list_objects(&client, &bucket, &prefix)
        .await
        .map_err(AppError::into_string)
}

#[tauri::command]
pub async fn delete_file(
    app: tauri::AppHandle,
    key: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    if key.trim().is_empty() {
        return Err(AppError::InvalidKey("Key required".into()).into_string());
    }
    let client = state.client().await.map_err(AppError::into_string)?;
    let bucket = state.active_bucket().await;
    if bucket.is_empty() {
        return Err(AppError::NoActiveConnection.into_string());
    }
    operations::delete_object(&client, &bucket, &key)
        .await
        .map_err(AppError::into_string)?;
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Path(e.to_string()).into_string())?;
    activity::append_activity(
        &app_data,
        "object_deleted",
        &key,
        &format!("Deleted from {bucket}"),
    )
    .map_err(AppError::into_string)
}

#[tauri::command]
pub async fn preview_delete(
    keys: Option<Vec<String>>,
    prefix: Option<String>,
    state: State<'_, AppState>,
) -> Result<DeletePreview, String> {
    let client = state.client().await.map_err(AppError::into_string)?;
    let bucket = state.active_bucket().await;
    if bucket.is_empty() {
        return Err(AppError::NoActiveConnection.into_string());
    }
    if let Some(prefix) = prefix.filter(|p| !p.trim().is_empty()) {
        return operations::preview_delete_prefix(&client, &bucket, &prefix, 10_000)
            .await
            .map_err(AppError::into_string);
    }
    let keys = keys.unwrap_or_default();
    Ok(DeletePreview {
        object_count: keys.len() as u32,
        total_size: 0,
        truncated: false,
        sample_keys: keys.into_iter().take(8).collect(),
    })
}

#[tauri::command]
pub async fn create_folder(key: String, state: State<'_, AppState>) -> Result<(), String> {
    if key.trim().is_empty() {
        return Err(AppError::InvalidKey("Folder key required".into()).into_string());
    }
    let client = state.client().await.map_err(AppError::into_string)?;
    let bucket = state.active_bucket().await;
    if bucket.is_empty() {
        return Err(AppError::NoActiveConnection.into_string());
    }
    operations::put_folder_marker(&client, &bucket, &key)
        .await
        .map_err(AppError::into_string)
}

#[tauri::command]
pub async fn search_objects(
    query: String,
    prefix: String,
    state: State<'_, AppState>,
) -> Result<SearchResult, String> {
    let q = query.trim().to_lowercase();
    if q.len() < 2 {
        return Ok(SearchResult {
            matches: Vec::new(),
            scanned: 0,
            truncated: false,
        });
    }
    let client = state.client().await.map_err(AppError::into_string)?;
    let bucket = state.active_bucket().await;
    if bucket.is_empty() {
        return Err(AppError::NoActiveConnection.into_string());
    }
    operations::search_objects_recursive(&client, &bucket, &prefix, &q, 250, 10_000)
        .await
        .map(|(matches, scanned, truncated)| SearchResult {
            matches,
            scanned,
            truncated,
        })
        .map_err(AppError::into_string)
}

#[tauri::command]
pub async fn get_presigned_url(
    key: String,
    expires_in_secs: Option<u64>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    if key.trim().is_empty() {
        return Err(AppError::InvalidKey("Key required".into()).into_string());
    }
    let client = state.client().await.map_err(AppError::into_string)?;
    let bucket = state.active_bucket().await;
    if bucket.is_empty() {
        return Err(AppError::NoActiveConnection.into_string());
    }
    let exp = expires_in_secs.unwrap_or(3600);
    operations::presign_get_object_url(&client, &bucket, &key, exp)
        .await
        .map_err(AppError::into_string)
}

#[tauri::command]
pub async fn object_exists(key: String, state: State<'_, AppState>) -> Result<bool, String> {
    if key.trim().is_empty() {
        return Err(AppError::InvalidKey("Key required".into()).into_string());
    }
    let client = state.client().await.map_err(AppError::into_string)?;
    let bucket = state.active_bucket().await;
    if bucket.is_empty() {
        return Err(AppError::NoActiveConnection.into_string());
    }
    operations::object_exists(&client, &bucket, &key)
        .await
        .map_err(AppError::into_string)
}

#[tauri::command]
pub async fn get_object_details(
    key: String,
    state: State<'_, AppState>,
) -> Result<ObjectDetails, String> {
    if key.trim().is_empty() || key.ends_with('/') {
        return Err(AppError::InvalidKey("Details requires a file key".into()).into_string());
    }
    let client = state.client().await.map_err(AppError::into_string)?;
    let bucket = state.active_bucket().await;
    if bucket.is_empty() {
        return Err(AppError::NoActiveConnection.into_string());
    }
    operations::object_details(&client, &bucket, &key)
        .await
        .map_err(AppError::into_string)
}

#[tauri::command]
pub async fn get_cleanup_report(
    prefix: String,
    old_days: Option<u64>,
    large_bytes: Option<u64>,
    max_scanned: Option<u32>,
    state: State<'_, AppState>,
) -> Result<CleanupReport, String> {
    let client = state.client().await.map_err(AppError::into_string)?;
    let bucket = state.active_bucket().await;
    if bucket.is_empty() {
        return Err(AppError::NoActiveConnection.into_string());
    }
    operations::cleanup_report(
        &client,
        &bucket,
        &prefix,
        old_days.unwrap_or(90),
        large_bytes.unwrap_or(100 * 1024 * 1024),
        max_scanned.unwrap_or(10_000).min(100_000).max(1),
    )
    .await
    .map_err(AppError::into_string)
}

#[tauri::command]
pub async fn get_usage_summary(
    prefix: String,
    max_scanned: Option<u32>,
    state: State<'_, AppState>,
) -> Result<UsageSummary, String> {
    let client = state.client().await.map_err(AppError::into_string)?;
    let bucket = state.active_bucket().await;
    if bucket.is_empty() {
        return Err(AppError::NoActiveConnection.into_string());
    }
    operations::usage_summary(
        &client,
        &bucket,
        &prefix,
        max_scanned.unwrap_or(25_000).min(100_000).max(1),
    )
    .await
    .map_err(AppError::into_string)
}
