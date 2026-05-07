use tauri::State;

use crate::error::AppError;
use crate::s3::operations;
use crate::s3::types::BucketFile;
use crate::state::AppState;

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
