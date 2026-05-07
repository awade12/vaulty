use std::collections::HashSet;

use serde::Serialize;
use tauri::Manager;
use tauri::State;
use uuid::Uuid;

use crate::error::AppError;
use crate::s3::client;
use crate::s3::operations;
use crate::state::AppState;
use crate::storage::connections::{self, ConnectionConfig};
use crate::storage::credentials;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BulkAddFailure {
    pub bucket: String,
    pub error: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BulkAddConnectionsResult {
    pub added: Vec<ConnectionConfig>,
    pub skipped_existing: Vec<String>,
    pub failed: Vec<BulkAddFailure>,
}

fn is_connection_duplicate(
    conns: &[ConnectionConfig],
    provider: &str,
    endpoint: &str,
    bucket: &str,
) -> bool {
    let pv = provider.trim();
    let ep = endpoint.trim();
    let b = bucket.trim();
    conns.iter().any(|c| {
        c.provider == pv && c.endpoint.trim() == ep && c.bucket == b
    })
}

#[tauri::command]
pub async fn list_account_buckets(
    provider: String,
    endpoint: String,
    region: Option<String>,
    access_key_id: String,
    secret_access_key: String,
) -> Result<Vec<String>, String> {
    let region = region.filter(|s| !s.trim().is_empty());
    let s3_client = client::build_client_raw(
        &provider,
        &endpoint,
        &access_key_id,
        &secret_access_key,
        region.as_deref(),
    )
    .await
    .map_err(AppError::into_string)?;
    operations::list_account_buckets(&s3_client)
        .await
        .map_err(AppError::into_string)
}

#[tauri::command]
pub async fn bulk_add_connections(
    app: tauri::AppHandle,
    provider: String,
    endpoint: String,
    region: Option<String>,
    access_key_id: String,
    secret_access_key: String,
    buckets: Vec<String>,
) -> Result<BulkAddConnectionsResult, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Path(e.to_string()).into_string())?;

    let region = region.filter(|s| !s.trim().is_empty());
    let endpoint = endpoint.trim().to_string();
    let pv = provider.trim().to_string();
    let ak = access_key_id.trim().to_string();

    let s3_client = client::build_client_raw(
        &pv,
        &endpoint,
        &ak,
        &secret_access_key,
        region.as_deref(),
    )
    .await
    .map_err(AppError::into_string)?;

    let mut conns =
        connections::load_connections(&app_data).map_err(AppError::into_string)?;

    let mut added: Vec<ConnectionConfig> = Vec::new();
    let mut skipped_existing: Vec<String> = Vec::new();
    let mut failed: Vec<BulkAddFailure> = Vec::new();
    let mut seen: HashSet<String> = HashSet::new();

    for raw in buckets {
        let bucket = raw.trim().to_string();
        if bucket.is_empty() {
            continue;
        }
        if !seen.insert(bucket.clone()) {
            continue;
        }
        if is_connection_duplicate(&conns, &pv, &endpoint, &bucket) {
            skipped_existing.push(bucket);
            continue;
        }
        if let Err(e) = operations::test_connection(&s3_client, &bucket).await {
            failed.push(BulkAddFailure {
                bucket: bucket.clone(),
                error: e.to_string(),
            });
            continue;
        }
        let id = Uuid::new_v4().to_string();
        credentials::store_secret(&id, &secret_access_key).map_err(AppError::into_string)?;
        let conn = ConnectionConfig {
            id,
            label: bucket.clone(),
            provider: pv.clone(),
            endpoint: endpoint.clone(),
            bucket,
            region: region.clone(),
            access_key_id: ak.clone(),
        };
        conns.push(conn.clone());
        added.push(conn);
    }

    if !added.is_empty() {
        connections::save_connections(&app_data, &conns).map_err(AppError::into_string)?;
    }

    Ok(BulkAddConnectionsResult {
        added,
        skipped_existing,
        failed,
    })
}

#[tauri::command]
pub async fn add_connection(
    app: tauri::AppHandle,
    label: String,
    provider: String,
    endpoint: String,
    bucket: String,
    region: Option<String>,
    access_key_id: String,
    secret_access_key: String,
) -> Result<ConnectionConfig, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Path(e.to_string()).into_string())?;

    let id = Uuid::new_v4().to_string();

    let s3_client = client::build_client_raw(
        &provider,
        &endpoint,
        &access_key_id,
        &secret_access_key,
        region.as_deref(),
    )
    .await
    .map_err(AppError::into_string)?;

    operations::test_connection(&s3_client, &bucket)
        .await
        .map_err(AppError::into_string)?;

    credentials::store_secret(&id, &secret_access_key).map_err(AppError::into_string)?;

    let conn = ConnectionConfig {
        id,
        label,
        provider,
        endpoint,
        bucket,
        region,
        access_key_id,
    };

    let mut conns =
        connections::load_connections(&app_data).map_err(AppError::into_string)?;
    conns.push(conn.clone());
    connections::save_connections(&app_data, &conns).map_err(AppError::into_string)?;

    Ok(conn)
}

#[tauri::command]
pub async fn list_connections(app: tauri::AppHandle) -> Result<Vec<ConnectionConfig>, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Path(e.to_string()).into_string())?;
    connections::load_connections(&app_data).map_err(AppError::into_string)
}

#[tauri::command]
pub async fn remove_connection(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Path(e.to_string()).into_string())?;

    let mut conns =
        connections::load_connections(&app_data).map_err(AppError::into_string)?;
    let before = conns.len();
    conns.retain(|c| c.id != id);
    if conns.len() == before {
        return Err(AppError::ConnectionNotFound { id: id.clone() }.into_string());
    }
    connections::save_connections(&app_data, &conns).map_err(AppError::into_string)?;

    credentials::delete_secret(&id).map_err(AppError::into_string)?;

    if state.active_connection_id().await.as_deref() == Some(id.as_str()) {
        state.clear_session().await;
    }

    Ok(())
}

#[tauri::command]
pub async fn activate_connection(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Path(e.to_string()).into_string())?;

    let conns =
        connections::load_connections(&app_data).map_err(AppError::into_string)?;
    let conn = conns
        .into_iter()
        .find(|c| c.id == id)
        .ok_or_else(|| AppError::ConnectionNotFound { id: id.clone() }.into_string())?;

    let secret = credentials::get_secret(&conn.id).map_err(AppError::into_string)?;
    let s3_client = client::build_client(&conn, &secret)
        .await
        .map_err(AppError::into_string)?;

    operations::test_connection(&s3_client, &conn.bucket)
        .await
        .map_err(AppError::into_string)?;

    let bucket = conn.bucket.clone();
    let cid = conn.id.clone();
    state.set_session(s3_client, bucket, cid).await;

    Ok(())
}

#[tauri::command]
pub async fn update_connection(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    id: String,
    label: String,
    provider: String,
    endpoint: String,
    bucket: String,
    region: Option<String>,
    access_key_id: String,
    secret_access_key: Option<String>,
) -> Result<ConnectionConfig, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Path(e.to_string()).into_string())?;

    let mut conns =
        connections::load_connections(&app_data).map_err(AppError::into_string)?;
    let idx = conns
        .iter()
        .position(|c| c.id == id)
        .ok_or_else(|| AppError::ConnectionNotFound { id: id.clone() }.into_string())?;

    let region = region.filter(|s| !s.trim().is_empty());
    let secret_for_test: String = match &secret_access_key {
        Some(s) if !s.trim().is_empty() => s.trim().to_string(),
        _ => credentials::get_secret(&id).map_err(AppError::into_string)?,
    };

    let s3_client = client::build_client_raw(
        &provider,
        &endpoint,
        &access_key_id,
        secret_for_test.as_str(),
        region.as_deref(),
    )
    .await
    .map_err(AppError::into_string)?;

    operations::test_connection(&s3_client, &bucket)
        .await
        .map_err(AppError::into_string)?;

    if let Some(s) = &secret_access_key {
        let t = s.trim();
        if !t.is_empty() {
            credentials::store_secret(&id, t).map_err(AppError::into_string)?;
        }
    }

    let updated = ConnectionConfig {
        id: id.clone(),
        label,
        provider,
        endpoint,
        bucket,
        region,
        access_key_id,
    };
    conns[idx] = updated.clone();
    connections::save_connections(&app_data, &conns).map_err(AppError::into_string)?;

    if state.active_connection_id().await.as_deref() == Some(id.as_str()) {
        state.clear_session().await;
    }

    Ok(updated)
}

#[tauri::command]
pub async fn duplicate_connection(
    app: tauri::AppHandle,
    id: String,
) -> Result<ConnectionConfig, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Path(e.to_string()).into_string())?;

    let mut conns =
        connections::load_connections(&app_data).map_err(AppError::into_string)?;
    let existing = conns
        .iter()
        .find(|c| c.id == id)
        .ok_or_else(|| AppError::ConnectionNotFound { id: id.clone() }.into_string())?
        .clone();

    let secret = credentials::get_secret(&id).map_err(AppError::into_string)?;
    let new_id = Uuid::new_v4().to_string();
    credentials::store_secret(&new_id, &secret).map_err(AppError::into_string)?;

    let dup = ConnectionConfig {
        id: new_id,
        label: format!("{} copy", existing.label),
        provider: existing.provider,
        endpoint: existing.endpoint,
        bucket: existing.bucket,
        region: existing.region,
        access_key_id: existing.access_key_id,
    };
    conns.push(dup.clone());
    connections::save_connections(&app_data, &conns).map_err(AppError::into_string)?;

    Ok(dup)
}

#[tauri::command]
pub async fn check_connection_health(
    app: tauri::AppHandle,
    id: String,
) -> Result<(), String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Path(e.to_string()).into_string())?;

    let conns =
        connections::load_connections(&app_data).map_err(AppError::into_string)?;
    let conn = conns
        .into_iter()
        .find(|c| c.id == id)
        .ok_or_else(|| AppError::ConnectionNotFound { id: id.clone() }.into_string())?;

    let secret = credentials::get_secret(&conn.id).map_err(AppError::into_string)?;
    let s3_client = client::build_client(&conn, &secret)
        .await
        .map_err(AppError::into_string)?;
    operations::test_connection(&s3_client, &conn.bucket)
        .await
        .map_err(AppError::into_string)
}
