use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AppError;

const MAX_EVENTS: usize = 500;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ActivityEvent {
    pub id: String,
    pub timestamp_millis: u64,
    pub action: String,
    pub target: String,
    pub detail: String,
}

fn activity_path(app_data: &Path) -> PathBuf {
    app_data.join("activity_log.json")
}

pub fn load_activity(app_data: &Path) -> Result<Vec<ActivityEvent>, AppError> {
    let path = activity_path(app_data);
    if !path.exists() {
        return Ok(vec![]);
    }
    let raw = std::fs::read_to_string(&path)?;
    Ok(serde_json::from_str(&raw)?)
}

pub fn append_activity(
    app_data: &Path,
    action: &str,
    target: &str,
    detail: &str,
) -> Result<(), AppError> {
    let mut events = load_activity(app_data)?;
    events.insert(
        0,
        ActivityEvent {
            id: Uuid::new_v4().to_string(),
            timestamp_millis: now_millis(),
            action: action.to_string(),
            target: target.to_string(),
            detail: detail.to_string(),
        },
    );
    events.truncate(MAX_EVENTS);
    std::fs::create_dir_all(app_data)?;
    let raw = serde_json::to_string_pretty(&events)?;
    std::fs::write(activity_path(app_data), raw)?;
    Ok(())
}

fn now_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}
