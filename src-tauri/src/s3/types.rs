use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BucketFile {
    pub key: String,
    pub size: u64,
    pub last_modified: String,
    pub etag: String,
    pub is_folder: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileVersion {
    pub version_id: String,
    pub last_modified: String,
    pub size: u64,
    pub is_latest: bool,
    pub etag: String,
}
