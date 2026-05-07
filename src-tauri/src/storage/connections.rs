use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::error::AppError;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionConfig { // should work for most providers i think
    pub id: String,
    pub label: String,
    pub provider: String,
    pub endpoint: String,
    pub bucket: String,
    pub region: Option<String>,
    pub access_key_id: String,
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
    Ok(serde_json::from_str(&raw)?)
}

pub fn save_connections(app_data: &Path, conns: &[ConnectionConfig]) -> Result<(), AppError> {
    std::fs::create_dir_all(app_data)?;
    let raw = serde_json::to_string_pretty(conns)?;
    std::fs::write(config_path(app_data), raw)?;
    Ok(())
}
