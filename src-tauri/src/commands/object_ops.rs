use std::io::Write;
use std::path::PathBuf;

use tauri::Manager;
use tauri::State;
use tauri_plugin_opener::OpenerExt;
use uuid::Uuid;
use zip::write::SimpleFileOptions;
use zip::ZipWriter;

use crate::error::AppError;
use crate::s3::client;
use crate::s3::operations;
use crate::s3::types::{BucketDiffReport, BucketFile, FileVersion};
use crate::state::AppState;
use crate::storage::{activity, connections, credentials};

#[tauri::command]
pub async fn move_object(
    from_key: String,
    to_key: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    if from_key.trim().is_empty() || to_key.trim().is_empty() {
        return Err(AppError::InvalidKey("Keys required".into()).into_string());
    }
    if from_key == to_key {
        return Ok(());
    }
    let client = state.client().await.map_err(AppError::into_string)?;
    let bucket = state.active_bucket().await;
    if bucket.is_empty() {
        return Err(AppError::NoActiveConnection.into_string());
    }
    operations::copy_object_same_bucket(&client, &bucket, &from_key, &to_key)
        .await
        .map_err(AppError::into_string)?;
    operations::delete_object(&client, &bucket, &from_key)
        .await
        .map_err(AppError::into_string)
}

#[tauri::command]
pub async fn delete_objects(
    app: tauri::AppHandle,
    keys: Vec<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    if keys.is_empty() {
        return Ok(());
    }
    let client = state.client().await.map_err(AppError::into_string)?;
    let bucket = state.active_bucket().await;
    if bucket.is_empty() {
        return Err(AppError::NoActiveConnection.into_string());
    }
    operations::delete_objects(&client, &bucket, &keys)
        .await
        .map_err(AppError::into_string)?;
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Path(e.to_string()).into_string())?;
    activity::append_activity(
        &app_data,
        "objects_deleted",
        &bucket,
        &format!("Deleted {} object(s)", keys.len()),
    )
    .map_err(AppError::into_string)
}

#[tauri::command]
pub async fn delete_prefix_recursive(
    app: tauri::AppHandle,
    prefix: String,
    max_keys: Option<u32>,
    state: State<'_, AppState>,
) -> Result<u32, String> {
    let cap = max_keys.unwrap_or(10_000).min(100_000).max(1);
    if prefix.trim().is_empty() {
        return Err(AppError::InvalidKey("Prefix required".into()).into_string());
    }
    let client = state.client().await.map_err(AppError::into_string)?;
    let bucket = state.active_bucket().await;
    if bucket.is_empty() {
        return Err(AppError::NoActiveConnection.into_string());
    }
    let keys = operations::list_all_keys_under_prefix(&client, &bucket, &prefix, cap)
        .await
        .map_err(AppError::into_string)?;
    let n = keys.len() as u32;
    if keys.is_empty() {
        return Ok(0);
    }
    operations::delete_objects(&client, &bucket, &keys)
        .await
        .map_err(AppError::into_string)?;
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Path(e.to_string()).into_string())?;
    activity::append_activity(
        &app_data,
        "folder_deleted",
        &prefix,
        &format!("Deleted {n} object(s) from {bucket}"),
    )
    .map_err(AppError::into_string)?;
    Ok(n)
}

#[tauri::command]
pub async fn duplicate_object(key: String, state: State<'_, AppState>) -> Result<String, String> {
    if key.trim().is_empty() || key.ends_with('/') {
        return Err(AppError::InvalidKey("Duplicate requires a file key".into()).into_string());
    }
    let client = state.client().await.map_err(AppError::into_string)?;
    let bucket = state.active_bucket().await;
    if bucket.is_empty() {
        return Err(AppError::NoActiveConnection.into_string());
    }

    let (base, ext) = if let Some(pos) = key.rfind('.') {
        let name_part = &key[..pos];
        let ext_part = &key[pos..];
        (name_part.to_string(), ext_part.to_string())
    } else {
        (key.clone(), String::new())
    };

    let new_key = format!("{} copy{}", base, ext);

    operations::copy_object_same_bucket(&client, &bucket, &key, &new_key)
        .await
        .map_err(AppError::into_string)?;

    Ok(new_key)
}

#[tauri::command]
pub async fn open_object(
    app: tauri::AppHandle,
    key: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    if key.trim().is_empty() || key.ends_with('/') {
        return Err(AppError::InvalidKey("Open requires a file key".into()).into_string());
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
    let cache = app
        .path()
        .cache_dir()
        .map_err(|e| AppError::Path(e.to_string()).into_string())?
        .join("vaulty-open");
    tokio::fs::create_dir_all(&cache)
        .await
        .map_err(|e| AppError::Io(e).into_string())?;
    let base = key
        .trim_end_matches('/')
        .rsplit('/')
        .next()
        .filter(|s| !s.is_empty())
        .unwrap_or("file");
    let safe: String = base
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '.' || *c == '-' || *c == '_')
        .collect();
    let fname = if safe.is_empty() {
        "file"
    } else {
        safe.as_str()
    };
    let dest: PathBuf = cache.join(format!("{}_{}", Uuid::new_v4(), fname));
    operations::get_object_to_file(&client, &bucket, &key, &dest, &app)
        .await
        .map_err(AppError::into_string)?;
    app.opener()
        .open_path(dest.to_string_lossy().as_ref(), None::<&str>)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn download_as_zip(
    app: tauri::AppHandle,
    keys: Vec<String>,
    dest_path: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    if keys.is_empty() {
        return Err(AppError::InvalidKey("No keys provided".into()).into_string());
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

    let cache = app
        .path()
        .cache_dir()
        .map_err(|e| AppError::Path(e.to_string()).into_string())?
        .join("vaulty-zip-temp");
    tokio::fs::create_dir_all(&cache)
        .await
        .map_err(|e| AppError::Io(e).into_string())?;

    let zip_id = Uuid::new_v4().to_string();
    let temp_dir = cache.join(&zip_id);
    tokio::fs::create_dir_all(&temp_dir)
        .await
        .map_err(|e| AppError::Io(e).into_string())?;

    let mut downloaded_files: Vec<(PathBuf, String)> = Vec::new();

    for key in &keys {
        if key.ends_with('/') {
            continue;
        }
        let filename = key.rsplit('/').next().unwrap_or(key);
        let local_path = temp_dir.join(filename);

        operations::get_object_to_file(&client, &bucket, key, &local_path, &app)
            .await
            .map_err(AppError::into_string)?;

        downloaded_files.push((local_path, filename.to_string()));
    }

    let dest = PathBuf::from(&dest_path);
    let file = std::fs::File::create(&dest).map_err(|e| AppError::Io(e).into_string())?;
    let mut zip = ZipWriter::new(file);
    let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    for (local_path, name) in &downloaded_files {
        let data = std::fs::read(local_path).map_err(|e| AppError::Io(e).into_string())?;
        zip.start_file(&name, options)
            .map_err(|e| AppError::S3(e.to_string()).into_string())?;
        zip.write_all(&data)
            .map_err(|e| AppError::Io(e).into_string())?;
    }

    zip.finish()
        .map_err(|e| AppError::S3(e.to_string()).into_string())?;

    let _ = tokio::fs::remove_dir_all(&temp_dir).await;

    Ok(())
}

#[tauri::command]
pub async fn list_file_versions(
    key: String,
    state: State<'_, AppState>,
) -> Result<Vec<FileVersion>, String> {
    if key.trim().is_empty() || key.ends_with('/') {
        return Err(AppError::InvalidKey("Versions requires a file key".into()).into_string());
    }
    let client = state.client().await.map_err(AppError::into_string)?;
    let bucket = state.active_bucket().await;
    if bucket.is_empty() {
        return Err(AppError::NoActiveConnection.into_string());
    }
    operations::list_object_versions(&client, &bucket, &key)
        .await
        .map_err(AppError::into_string)
}

#[tauri::command]
pub async fn download_file_version(
    app: tauri::AppHandle,
    key: String,
    version_id: String,
    dest_path: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    if key.trim().is_empty() || key.ends_with('/') {
        return Err(AppError::InvalidKey("Download requires a file key".into()).into_string());
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
    let dest = PathBuf::from(&dest_path);
    operations::get_object_version_to_file(&client, &bucket, &key, &version_id, &dest, &app)
        .await
        .map_err(AppError::into_string)
}

#[tauri::command]
pub async fn transfer_to_connection(
    app: tauri::AppHandle,
    target_connection_id: String,
    keys: Vec<String>,
    delete_source: bool,
    state: State<'_, AppState>,
) -> Result<u32, String> {
    if keys.is_empty() {
        return Ok(0);
    }
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Path(e.to_string()).into_string())?;
    let conns = connections::load_connections(&app_data).map_err(AppError::into_string)?;
    let target = conns
        .into_iter()
        .find(|c| c.id == target_connection_id)
        .ok_or_else(|| {
            AppError::ConnectionNotFound {
                id: target_connection_id.clone(),
            }
            .into_string()
        })?;
    let secret = credentials::get_profile_secret(&target.credential_profile_id)
        .map_err(AppError::into_string)?;
    let target_client = client::build_client(&target, &secret)
        .await
        .map_err(AppError::into_string)?;
    let source_client = state.client().await.map_err(AppError::into_string)?;
    let source_bucket = state.active_bucket().await;
    if source_bucket.is_empty() {
        return Err(AppError::NoActiveConnection.into_string());
    }

    let mut expanded: Vec<String> = Vec::new();
    for key in keys {
        if key.ends_with('/') {
            let nested = operations::list_all_keys_under_prefix(
                &source_client,
                &source_bucket,
                &key,
                10_000,
            )
            .await
            .map_err(AppError::into_string)?;
            expanded.extend(nested);
        } else {
            expanded.push(key);
        }
    }
    expanded.sort();
    expanded.dedup();

    for key in &expanded {
        operations::copy_object_between_buckets(
            &source_client,
            &source_bucket,
            &target_client,
            &target.bucket,
            key,
            key,
        )
        .await
        .map_err(AppError::into_string)?;
    }
    if delete_source {
        operations::delete_objects(&source_client, &source_bucket, &expanded)
            .await
            .map_err(AppError::into_string)?;
    }
    Ok(expanded.len() as u32)
}

#[tauri::command]
pub async fn compare_bucket_to_connection(
    app: tauri::AppHandle,
    target_connection_id: String,
    prefix: Option<String>,
    state: State<'_, AppState>,
) -> Result<BucketDiffReport, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Path(e.to_string()).into_string())?;
    let conns = connections::load_connections(&app_data).map_err(AppError::into_string)?;
    let target = conns
        .into_iter()
        .find(|c| c.id == target_connection_id)
        .ok_or_else(|| {
            AppError::ConnectionNotFound {
                id: target_connection_id.clone(),
            }
            .into_string()
        })?;
    let target_secret = credentials::get_profile_secret(&target.credential_profile_id)
        .map_err(AppError::into_string)?;
    let target_client = client::build_client(&target, &target_secret)
        .await
        .map_err(AppError::into_string)?;
    let source_client = state.client().await.map_err(AppError::into_string)?;
    let source_bucket = state.active_bucket().await;
    if source_bucket.is_empty() {
        return Err(AppError::NoActiveConnection.into_string());
    }
    let prefix = prefix.unwrap_or_default();
    let (source, scanned_source, source_truncated) =
        operations::list_objects_recursive_limited(&source_client, &source_bucket, &prefix, 10_000)
            .await
            .map_err(AppError::into_string)?;
    let (target_files, scanned_target, target_truncated) =
        operations::list_objects_recursive_limited(&target_client, &target.bucket, &prefix, 10_000)
            .await
            .map_err(AppError::into_string)?;

    let mut target_map = std::collections::HashMap::new();
    for file in target_files {
        target_map.insert(file.key.clone(), file);
    }
    let mut source_only: Vec<BucketFile> = Vec::new();
    let mut changed: Vec<BucketFile> = Vec::new();
    for file in source {
        match target_map.remove(&file.key) {
            None => source_only.push(file),
            Some(other) if other.size != file.size || other.etag != file.etag => changed.push(file),
            Some(_) => {}
        }
    }
    let target_only = target_map.into_values().collect();

    Ok(BucketDiffReport {
        source_only,
        target_only,
        changed,
        scanned_source,
        scanned_target,
        truncated: source_truncated || target_truncated,
    })
}
