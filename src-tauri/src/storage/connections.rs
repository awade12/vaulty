use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::error::AppError;
use crate::storage::credential_profiles::{self, CredentialProfile};
use crate::storage::credentials;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionConfig {
    pub id: String,
    pub label: String,
    pub provider: String,
    pub endpoint: String,
    pub bucket: String,
    pub region: Option<String>,
    pub access_key_id: String,
    #[serde(default)]
    pub credential_profile_id: String,
}

fn config_path(app_data: &Path) -> PathBuf {
    app_data.join("connections.json")
}

pub fn load_connections(app_data: &Path) -> Result<Vec<ConnectionConfig>, AppError> {
    let path = config_path(app_data);
    if !path.exists() {
        return Ok(vec![]);
    }
    let raw = std::fs::read_to_string(&path)?;
    let mut conns: Vec<ConnectionConfig> = serde_json::from_str(&raw)?;
    migrate_profiles(app_data, &mut conns)?;
    Ok(conns)
}

pub fn save_connections(app_data: &Path, conns: &[ConnectionConfig]) -> Result<(), AppError> {
    std::fs::create_dir_all(app_data)?;
    let raw = serde_json::to_string_pretty(conns)?;
    std::fs::write(config_path(app_data), raw)?;
    Ok(())
}

fn migrate_profiles(app_data: &Path, conns: &mut [ConnectionConfig]) -> Result<(), AppError> {
    let mut profiles = credential_profiles::load_profiles(app_data)?;
    let mut changed_connections = false;
    let mut changed_profiles = false;

    for conn in conns.iter_mut() {
        if conn.credential_profile_id.is_empty()
            || !profile_exists(&profiles, &conn.credential_profile_id)
        {
            let profile_id = credential_profiles::find_or_create_profile(
                &mut profiles,
                &conn.label,
                &conn.provider,
                &conn.endpoint,
                conn.region.clone(),
                &conn.access_key_id,
            );
            changed_profiles = true;
            conn.credential_profile_id = profile_id;
            changed_connections = true;
        }

        if let Some(profile) = profile_by_id(&profiles, &conn.credential_profile_id) {
            conn.provider = profile.provider.clone();
            conn.endpoint = profile.endpoint.clone();
            conn.region = profile.region.clone();
            conn.access_key_id = profile.access_key_id.clone();
        }

        match credentials::profile_secret_exists(&conn.credential_profile_id) {
            Ok(false) => {
                let _ =
                    credentials::migrate_connection_secret(&conn.id, &conn.credential_profile_id)?;
            }
            Ok(true) => {
                credentials::delete_legacy_connection_secret(&conn.id)?;
            }
            Err(_) => {}
        }
    }

    if changed_profiles {
        credential_profiles::save_profiles(app_data, &profiles)?;
    }
    if changed_connections {
        save_connections(app_data, conns)?;
    }

    Ok(())
}

fn profile_exists(profiles: &[CredentialProfile], id: &str) -> bool {
    profiles.iter().any(|p| p.id == id)
}

fn profile_by_id<'a>(profiles: &'a [CredentialProfile], id: &str) -> Option<&'a CredentialProfile> {
    profiles.iter().find(|p| p.id == id)
}
