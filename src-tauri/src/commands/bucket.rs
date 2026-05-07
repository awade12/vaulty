use serde::Serialize;
use tauri::State;

use crate::error::AppError;
use crate::s3::operations;
use crate::s3::types::BucketFile;
use crate::state::AppState;

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
pub async fn delete_file(key: String, state: State<'_, AppState>) -> Result<(), String> {
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
        .map_err(AppError::into_string)
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
