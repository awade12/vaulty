use serde::{Deserialize, Serialize};
use std::collections::HashMap;

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
pub struct ObjectDetails {
    pub key: String,
    pub size: u64,
    pub last_modified: String,
    pub etag: String,
    pub content_type: String,
    pub storage_class: String,
    pub cache_control: String,
    pub metadata: HashMap<String, String>,
    pub versioning_status: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DuplicateNameGroup {
    pub name: String,
    pub objects: Vec<BucketFile>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CleanupReport {
    pub scanned: u32,
    pub truncated: bool,
    pub old_objects: Vec<BucketFile>,
    pub large_objects: Vec<BucketFile>,
    pub duplicate_name_groups: Vec<DuplicateNameGroup>,
    pub empty_folder_markers: Vec<BucketFile>,
    pub noncurrent_versions: Vec<FileVersion>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PrefixUsage {
    pub prefix: String,
    pub size: u64,
    pub count: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileTypeUsage {
    pub file_type: String,
    pub size: u64,
    pub count: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UsageSummary {
    pub scanned: u32,
    pub truncated: bool,
    pub total_size: u64,
    pub object_count: u32,
    pub largest_prefixes: Vec<PrefixUsage>,
    pub file_types: Vec<FileTypeUsage>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DeletePreview {
    pub object_count: u32,
    pub total_size: u64,
    pub truncated: bool,
    pub sample_keys: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GlobalSearchMatch {
    pub connection_id: String,
    pub connection_label: String,
    pub bucket: String,
    pub file: BucketFile,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GlobalSearchReport {
    pub matches: Vec<GlobalSearchMatch>,
    pub scanned: u32,
    pub truncated: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BucketDiffReport {
    pub source_only: Vec<BucketFile>,
    pub target_only: Vec<BucketFile>,
    pub changed: Vec<BucketFile>,
    pub scanned_source: u32,
    pub scanned_target: u32,
    pub truncated: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BucketPermissionReport {
    pub profile_id: String,
    pub buckets_checked: u32,
    pub can_list: bool,
    pub can_write: bool,
    pub can_delete: bool,
    pub versioning_checked: bool,
    pub failures: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MimeIssue {
    pub key: String,
    pub current_content_type: String,
    pub suggested_content_type: String,
    pub size: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MimeScanReport {
    pub issues: Vec<MimeIssue>,
    pub scanned: u32,
    pub truncated: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CatalogEntry {
    pub key: String,
    pub size: u64,
    pub last_modified: String,
    pub etag: String,
    pub content_type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CatalogSearchResult {
    pub entries: Vec<CatalogEntry>,
    pub indexed_count: u32,
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
