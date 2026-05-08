use std::collections::HashSet;

use serde::Serialize;
use tauri::Manager;
use tauri::State;
use uuid::Uuid;

use crate::error::AppError;
use crate::s3::client;
use crate::s3::operations;
use crate::state::AppState;
use crate::storage::activity;
use crate::storage::connections::{self, ConnectionConfig};
use crate::storage::credential_profiles;
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

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CredentialProfileSummary {
    pub id: String,
    pub label: String,
    pub provider: String,
    pub endpoint: String,
    pub region: Option<String>,
    pub access_key_id: String,
    pub connection_count: u32,
}

#[tauri::command]
pub fn list_credential_profiles(
    app: tauri::AppHandle,
) -> Result<Vec<CredentialProfileSummary>, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Path(e.to_string()).into_string())?;
    let conns = connections::load_connections(&app_data).map_err(AppError::into_string)?;
    let profiles = credential_profiles::load_profiles(&app_data).map_err(AppError::into_string)?;
    Ok(profiles
        .into_iter()
        .map(|p| CredentialProfileSummary {
            connection_count: conns
                .iter()
                .filter(|c| c.credential_profile_id == p.id)
                .count() as u32,
            id: p.id,
            label: p.label,
            provider: p.provider,
            endpoint: p.endpoint,
            region: p.region,
            access_key_id: p.access_key_id,
        })
        .collect())
}

#[tauri::command]
pub async fn update_credential_profile(
    app: tauri::AppHandle,
    id: String,
    label: String,
) -> Result<CredentialProfileSummary, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Path(e.to_string()).into_string())?;
    let mut profiles =
        credential_profiles::load_profiles(&app_data).map_err(AppError::into_string)?;
    let profile = profiles
        .iter_mut()
        .find(|p| p.id == id)
        .ok_or_else(|| AppError::ConnectionNotFound { id: id.clone() }.into_string())?;
    let old_label = profile.label.clone();
    profile.label = label.trim().to_string();
    let new_label = profile.label.clone();
    credential_profiles::save_profiles(&app_data, &profiles).map_err(AppError::into_string)?;

    let mut conns = connections::load_connections(&app_data).map_err(AppError::into_string)?;
    let mut conns_changed = false;
    for conn in conns.iter_mut() {
        if conn.credential_profile_id == id && conn.label == old_label {
            conn.label = new_label.clone();
            conns_changed = true;
        }
    }
    if conns_changed {
        connections::save_connections(&app_data, &conns).map_err(AppError::into_string)?;
    }
    activity::append_activity(
        &app_data,
        "storage_account_updated",
        &label,
        "Renamed storage account",
    )
    .map_err(AppError::into_string)?;
    let profiles = list_credential_profiles(app)?;
    profiles
        .into_iter()
        .find(|p| p.id == id)
        .ok_or_else(|| AppError::ConnectionNotFound { id }.into_string())
}

#[tauri::command]
pub async fn rotate_credential_profile_secret(
    app: tauri::AppHandle,
    id: String,
    secret_access_key: String,
) -> Result<(), String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Path(e.to_string()).into_string())?;
    let profiles = credential_profiles::load_profiles(&app_data).map_err(AppError::into_string)?;
    let profile = profiles
        .iter()
        .find(|p| p.id == id)
        .ok_or_else(|| AppError::ConnectionNotFound { id: id.clone() }.into_string())?
        .clone();
    let conns = connections::load_connections(&app_data).map_err(AppError::into_string)?;
    let attached: Vec<ConnectionConfig> = conns
        .into_iter()
        .filter(|c| c.credential_profile_id == id)
        .collect();
    let s3_client = client::build_client_raw(
        &profile.provider,
        &profile.endpoint,
        &profile.access_key_id,
        &secret_access_key,
        profile.region.as_deref(),
    )
    .await
    .map_err(AppError::into_string)?;
    for conn in &attached {
        operations::test_connection(&s3_client, &conn.bucket)
            .await
            .map_err(AppError::into_string)?;
    }
    credentials::store_profile_secret(&id, &secret_access_key).map_err(AppError::into_string)?;
    activity::append_activity(
        &app_data,
        "storage_account_secret_rotated",
        &profile.label,
        &format!("Retested {} bucket connection(s)", attached.len()),
    )
    .map_err(AppError::into_string)
}

#[tauri::command]
pub fn list_activity(app: tauri::AppHandle) -> Result<Vec<activity::ActivityEvent>, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Path(e.to_string()).into_string())?;
    activity::load_activity(&app_data).map_err(AppError::into_string)
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
    conns
        .iter()
        .any(|c| c.provider == pv && c.endpoint.trim() == ep && c.bucket == b)
}

fn profile_label(provider: &str, endpoint: &str, access_key_id: &str) -> String {
    let endpoint = endpoint.trim();
    let suffix: String = access_key_id
        .trim()
        .chars()
        .rev()
        .take(4)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect();
    if suffix.is_empty() {
        format!("{} {}", provider.trim(), endpoint)
    } else {
        format!("{} {} ({suffix})", provider.trim(), endpoint)
    }
}

fn upsert_profile(
    app_data: &std::path::Path,
    provider: &str,
    endpoint: &str,
    region: Option<String>,
    access_key_id: &str,
    secret_access_key: &str,
) -> Result<String, AppError> {
    let mut profiles = credential_profiles::load_profiles(app_data)?;
    let label = profile_label(provider, endpoint, access_key_id);
    let id = credential_profiles::find_or_create_profile(
        &mut profiles,
        &label,
        provider,
        endpoint,
        region,
        access_key_id,
    );
    credential_profiles::save_profiles(app_data, &profiles)?;
    credentials::store_profile_secret(&id, secret_access_key)?;
    Ok(id)
}

fn cleanup_unused_profile(app_data: &std::path::Path, profile_id: &str) -> Result<(), AppError> {
    if profile_id.is_empty() {
        return Ok(());
    }
    let conns = connections::load_connections(app_data)?;
    if conns.iter().any(|c| c.credential_profile_id == profile_id) {
        return Ok(());
    }

    let mut profiles = credential_profiles::load_profiles(app_data)?;
    let before = profiles.len();
    profiles.retain(|p| p.id != profile_id);
    if profiles.len() != before {
        credential_profiles::save_profiles(app_data, &profiles)?;
        credentials::delete_profile_secret(profile_id)?;
    }
    Ok(())
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

    let s3_client =
        client::build_client_raw(&pv, &endpoint, &ak, &secret_access_key, region.as_deref())
            .await
            .map_err(AppError::into_string)?;

    let mut conns = connections::load_connections(&app_data).map_err(AppError::into_string)?;
    let mut profile_id: Option<String> = None;

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
        let profile_id = match &profile_id {
            Some(id) => id.clone(),
            None => {
                let id = upsert_profile(
                    &app_data,
                    &pv,
                    &endpoint,
                    region.clone(),
                    &ak,
                    &secret_access_key,
                )
                .map_err(AppError::into_string)?;
                profile_id = Some(id.clone());
                id
            }
        };
        let id = Uuid::new_v4().to_string();
        let conn = ConnectionConfig {
            id,
            label: bucket.clone(),
            provider: pv.clone(),
            endpoint: endpoint.clone(),
            bucket,
            region: region.clone(),
            access_key_id: ak.clone(),
            credential_profile_id: profile_id.clone(),
        };
        conns.push(conn.clone());
        added.push(conn);
    }

    if !added.is_empty() {
        connections::save_connections(&app_data, &conns).map_err(AppError::into_string)?;
        activity::append_activity(
            &app_data,
            "connections_added",
            &endpoint,
            &format!("Added {} bucket connection(s)", added.len()),
        )
        .map_err(AppError::into_string)?;
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
    credential_profile_id: Option<String>,
) -> Result<ConnectionConfig, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Path(e.to_string()).into_string())?;

    let profiles = credential_profiles::load_profiles(&app_data).map_err(AppError::into_string)?;
    let existing_profile = credential_profile_id
        .as_deref()
        .filter(|id| !id.trim().is_empty())
        .and_then(|id| profiles.iter().find(|p| p.id == id))
        .cloned();

    let (provider, endpoint, region, access_key_id, secret_access_key, credential_profile_id) =
        if let Some(profile) = existing_profile {
            let secret =
                credentials::get_profile_secret(&profile.id).map_err(AppError::into_string)?;
            (
                profile.provider,
                profile.endpoint,
                profile.region,
                profile.access_key_id,
                secret,
                profile.id,
            )
        } else {
            let region = region.filter(|s| !s.trim().is_empty());
            let provider = provider.trim().to_string();
            let endpoint = endpoint.trim().to_string();
            let access_key_id = access_key_id.trim().to_string();
            (
                provider,
                endpoint,
                region,
                access_key_id,
                secret_access_key,
                String::new(),
            )
        };

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

    let credential_profile_id = if credential_profile_id.is_empty() {
        upsert_profile(
            &app_data,
            &provider,
            &endpoint,
            region.clone(),
            &access_key_id,
            &secret_access_key,
        )
        .map_err(AppError::into_string)?
    } else {
        credential_profile_id
    };

    let conn = ConnectionConfig {
        id,
        label,
        provider,
        endpoint,
        bucket,
        region,
        access_key_id,
        credential_profile_id,
    };

    let mut conns = connections::load_connections(&app_data).map_err(AppError::into_string)?;
    conns.push(conn.clone());
    connections::save_connections(&app_data, &conns).map_err(AppError::into_string)?;
    activity::append_activity(
        &app_data,
        "connection_added",
        &conn.label,
        &format!("Saved bucket {}", conn.bucket),
    )
    .map_err(AppError::into_string)?;

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

    let mut conns = connections::load_connections(&app_data).map_err(AppError::into_string)?;
    let removed_profile_id = conns
        .iter()
        .find(|c| c.id == id)
        .map(|c| c.credential_profile_id.clone());
    let before = conns.len();
    conns.retain(|c| c.id != id);
    if conns.len() == before {
        return Err(AppError::ConnectionNotFound { id: id.clone() }.into_string());
    }
    connections::save_connections(&app_data, &conns).map_err(AppError::into_string)?;

    credentials::delete_legacy_connection_secret(&id).map_err(AppError::into_string)?;
    if let Some(profile_id) = removed_profile_id {
        cleanup_unused_profile(&app_data, &profile_id).map_err(AppError::into_string)?;
    }
    activity::append_activity(
        &app_data,
        "connection_removed",
        &id,
        "Removed bucket connection",
    )
    .map_err(AppError::into_string)?;

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

    let conns = connections::load_connections(&app_data).map_err(AppError::into_string)?;
    let conn = conns
        .into_iter()
        .find(|c| c.id == id)
        .ok_or_else(|| AppError::ConnectionNotFound { id: id.clone() }.into_string())?;

    let secret = credentials::get_profile_secret(&conn.credential_profile_id)
        .map_err(AppError::into_string)?;
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

    let mut conns = connections::load_connections(&app_data).map_err(AppError::into_string)?;
    let idx = conns
        .iter()
        .position(|c| c.id == id)
        .ok_or_else(|| AppError::ConnectionNotFound { id: id.clone() }.into_string())?;
    let previous_profile_id = conns[idx].credential_profile_id.clone();

    let region = region.filter(|s| !s.trim().is_empty());
    let provider = provider.trim().to_string();
    let endpoint = endpoint.trim().to_string();
    let access_key_id = access_key_id.trim().to_string();
    let secret_for_test: String = match &secret_access_key {
        Some(s) if !s.trim().is_empty() => s.trim().to_string(),
        _ => {
            credentials::get_profile_secret(&previous_profile_id).map_err(AppError::into_string)?
        }
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

    let credential_profile_id = upsert_profile(
        &app_data,
        &provider,
        &endpoint,
        region.clone(),
        &access_key_id,
        &secret_for_test,
    )
    .map_err(AppError::into_string)?;

    let updated = ConnectionConfig {
        id: id.clone(),
        label,
        provider,
        endpoint,
        bucket,
        region,
        access_key_id,
        credential_profile_id: credential_profile_id.clone(),
    };
    conns[idx] = updated.clone();
    connections::save_connections(&app_data, &conns).map_err(AppError::into_string)?;
    cleanup_unused_profile(&app_data, &previous_profile_id).map_err(AppError::into_string)?;
    activity::append_activity(
        &app_data,
        "connection_updated",
        &updated.label,
        &format!("Updated bucket {}", updated.bucket),
    )
    .map_err(AppError::into_string)?;

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

    let mut conns = connections::load_connections(&app_data).map_err(AppError::into_string)?;
    let existing = conns
        .iter()
        .find(|c| c.id == id)
        .ok_or_else(|| AppError::ConnectionNotFound { id: id.clone() }.into_string())?
        .clone();

    let new_id = Uuid::new_v4().to_string();

    let dup = ConnectionConfig {
        id: new_id,
        label: format!("{} copy", existing.label),
        provider: existing.provider,
        endpoint: existing.endpoint,
        bucket: existing.bucket,
        region: existing.region,
        access_key_id: existing.access_key_id,
        credential_profile_id: existing.credential_profile_id,
    };
    conns.push(dup.clone());
    connections::save_connections(&app_data, &conns).map_err(AppError::into_string)?;
    activity::append_activity(
        &app_data,
        "connection_duplicated",
        &dup.label,
        &format!("Duplicated bucket {}", dup.bucket),
    )
    .map_err(AppError::into_string)?;

    Ok(dup)
}

#[tauri::command]
pub async fn check_connection_health(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Path(e.to_string()).into_string())?;

    let conns = connections::load_connections(&app_data).map_err(AppError::into_string)?;
    let conn = conns
        .into_iter()
        .find(|c| c.id == id)
        .ok_or_else(|| AppError::ConnectionNotFound { id: id.clone() }.into_string())?;

    let secret = credentials::get_profile_secret(&conn.credential_profile_id)
        .map_err(AppError::into_string)?;
    let s3_client = client::build_client(&conn, &secret)
        .await
        .map_err(AppError::into_string)?;
    operations::test_connection(&s3_client, &conn.bucket)
        .await
        .map_err(AppError::into_string)
}
