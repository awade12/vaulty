use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AppError;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CredentialProfile {
    pub id: String,
    pub label: String,
    pub provider: String,
    pub endpoint: String,
    pub region: Option<String>,
    pub access_key_id: String,
}

fn profiles_path(app_data: &Path) -> PathBuf {
    app_data.join("credential_profiles.json")
}

pub fn load_profiles(app_data: &Path) -> Result<Vec<CredentialProfile>, AppError> {
    let path = profiles_path(app_data);
    if !path.exists() {
        return Ok(vec![]);
    }
    let raw = std::fs::read_to_string(&path)?;
    Ok(serde_json::from_str(&raw)?)
}

pub fn save_profiles(app_data: &Path, profiles: &[CredentialProfile]) -> Result<(), AppError> {
    std::fs::create_dir_all(app_data)?;
    let raw = serde_json::to_string_pretty(profiles)?;
    std::fs::write(profiles_path(app_data), raw)?;
    Ok(())
}

pub fn find_matching_profile<'a>(
    profiles: &'a [CredentialProfile],
    provider: &str,
    endpoint: &str,
    region: Option<&str>,
    access_key_id: &str,
) -> Option<&'a CredentialProfile> {
    let provider = provider.trim();
    let endpoint = endpoint.trim();
    let access_key_id = access_key_id.trim();
    let region = normalize_region(region);

    profiles.iter().find(|p| {
        p.provider == provider
            && p.endpoint.trim() == endpoint
            && p.access_key_id == access_key_id
            && normalize_region(p.region.as_deref()) == region
    })
}

pub fn find_or_create_profile(
    profiles: &mut Vec<CredentialProfile>,
    label: &str,
    provider: &str,
    endpoint: &str,
    region: Option<String>,
    access_key_id: &str,
) -> String {
    if let Some(existing) = find_matching_profile(
        profiles,
        provider,
        endpoint,
        region.as_deref(),
        access_key_id,
    ) {
        return existing.id.clone();
    }

    let profile = CredentialProfile {
        id: Uuid::new_v4().to_string(),
        label: label.trim().to_string(),
        provider: provider.trim().to_string(),
        endpoint: endpoint.trim().to_string(),
        region: region.filter(|s| !s.trim().is_empty()),
        access_key_id: access_key_id.trim().to_string(),
    };
    let id = profile.id.clone();
    profiles.push(profile);
    id
}

fn normalize_region(region: Option<&str>) -> Option<String> {
    region
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(ToOwned::to_owned)
}
