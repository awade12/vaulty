use std::path::{Path, PathBuf};

use crate::error::AppError;
use crate::s3::types::CatalogEntry;

fn catalog_path(app_data: &Path, connection_id: &str) -> PathBuf {
    app_data
        .join("catalogs")
        .join(format!("{connection_id}.json"))
}

pub fn load_catalog(app_data: &Path, connection_id: &str) -> Result<Vec<CatalogEntry>, AppError> {
    let path = catalog_path(app_data, connection_id);
    if !path.exists() {
        return Ok(vec![]);
    }
    let raw = std::fs::read_to_string(path)?;
    Ok(serde_json::from_str(&raw)?)
}

pub fn save_catalog(
    app_data: &Path,
    connection_id: &str,
    entries: &[CatalogEntry],
) -> Result<(), AppError> {
    let path = catalog_path(app_data, connection_id);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let raw = serde_json::to_string_pretty(entries)?;
    std::fs::write(path, raw)?;
    Ok(())
}
