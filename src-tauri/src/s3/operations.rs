use std::collections::HashMap;
use std::path::Path;
use std::time::Duration;
use std::time::{SystemTime, UNIX_EPOCH};

use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::types::{Delete, MetadataDirective, ObjectIdentifier};
use aws_sdk_s3::Client;
use tauri::AppHandle;
use tokio::io::AsyncWriteExt;

use crate::error::AppError;
use crate::s3::sdk_error::map_s3_sdk_error;
use crate::s3::types::{
    BucketFile, CatalogEntry, CleanupReport, DuplicateNameGroup, FileTypeUsage, FileVersion,
    MimeIssue, MimeScanReport, ObjectDetails, PrefixUsage, UsageSummary,
};
use crate::transfer_emit::TransferEmitter;

pub async fn test_connection(client: &Client, bucket: &str) -> Result<(), AppError> {
    client
        .head_bucket()
        .bucket(bucket)
        .send()
        .await
        .map_err(map_s3_sdk_error)?;
    Ok(())
}

pub async fn list_account_buckets(client: &Client) -> Result<Vec<String>, AppError> {
    let mut names: Vec<String> = Vec::new();
    let mut continuation: Option<String> = None;
    loop {
        let mut req = client.list_buckets();
        if let Some(ref t) = continuation {
            req = req.continuation_token(t);
        }
        let resp = req.send().await.map_err(map_s3_sdk_error)?;
        for b in resp.buckets() {
            if let Some(n) = b.name() {
                names.push(n.to_string());
            }
        }
        continuation = resp.continuation_token().map(|s| s.to_string());
        if continuation.is_none() {
            break;
        }
    }
    names.sort();
    names.dedup();
    Ok(names)
}

pub async fn list_objects(
    client: &Client,
    bucket: &str,
    prefix: &str,
) -> Result<Vec<BucketFile>, AppError> {
    let mut out: Vec<BucketFile> = Vec::new();
    let mut token: Option<String> = None;

    loop {
        let mut req = client
            .list_objects_v2()
            .bucket(bucket)
            .delimiter("/")
            .prefix(prefix.to_string());
        if let Some(ref t) = token {
            req = req.continuation_token(t);
        }

        let resp = req.send().await.map_err(map_s3_sdk_error)?;

        for p in resp.common_prefixes() {
            if let Some(pr) = p.prefix() {
                let key = pr.to_string();
                out.push(BucketFile {
                    key,
                    size: 0,
                    last_modified: String::new(),
                    etag: String::new(),
                    is_folder: true,
                });
            }
        }

        for obj in resp.contents() {
            let key = obj.key().unwrap_or("").to_string();
            if key.is_empty() || key == prefix {
                continue;
            }
            if key.ends_with('/') {
                if out.iter().any(|e| e.key == key) {
                    continue;
                }
                out.push(BucketFile {
                    key,
                    size: 0,
                    last_modified: String::new(),
                    etag: String::new(),
                    is_folder: true,
                });
                continue;
            }
            let size = obj.size().unwrap_or(0) as u64;
            let last_modified = obj
                .last_modified()
                .map(|t| t.to_string())
                .unwrap_or_default();
            let etag = obj.e_tag().map(|s| s.to_string()).unwrap_or_default();
            out.push(BucketFile {
                key,
                size,
                last_modified,
                etag,
                is_folder: false,
            });
        }

        if resp.is_truncated() == Some(true) {
            token = resp.next_continuation_token().map(|s| s.to_string());
            if token.is_none() {
                break;
            }
        } else {
            break;
        }
    }

    out.sort_by(|a, b| match (a.is_folder, b.is_folder) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.key.cmp(&b.key),
    });

    Ok(out)
}

/// Recursively list objects under `prefix` (no `/` delimiter so we get every
/// nested key) and return those whose key contains `query` (case-insensitive).
///
/// Caps:
/// - `max_matches`: stop collecting matches after this many.
/// - `max_scanned`: hard cap on objects examined regardless of matches, so we
///   bail before paging through enormous buckets.
///
/// Returns `(matches, scanned, truncated)`. `truncated` is true when either
/// cap kicked in before the listing was complete — the UI can use this to
/// show a "first N results, refine to narrow" hint.
pub async fn search_objects_recursive(
    client: &Client,
    bucket: &str,
    prefix: &str,
    query: &str,
    max_matches: usize,
    max_scanned: u32,
) -> Result<(Vec<BucketFile>, u32, bool), AppError> {
    let needle = query.to_lowercase();
    let mut matches: Vec<BucketFile> = Vec::new();
    let mut scanned: u32 = 0;
    let mut truncated = false;
    let mut token: Option<String> = None;

    loop {
        let mut req = client
            .list_objects_v2()
            .bucket(bucket)
            .prefix(prefix.to_string());
        if let Some(ref t) = token {
            req = req.continuation_token(t);
        }
        let resp = req.send().await.map_err(map_s3_sdk_error)?;

        for obj in resp.contents() {
            scanned = scanned.saturating_add(1);
            let key = obj.key().unwrap_or("").to_string();
            if key.is_empty() || key.ends_with('/') {
                continue;
            }
            if key.to_lowercase().contains(&needle) {
                let size = obj.size().unwrap_or(0) as u64;
                let last_modified = obj
                    .last_modified()
                    .map(|t| t.to_string())
                    .unwrap_or_default();
                let etag = obj.e_tag().map(|s| s.to_string()).unwrap_or_default();
                matches.push(BucketFile {
                    key,
                    size,
                    last_modified,
                    etag,
                    is_folder: false,
                });
                if matches.len() >= max_matches {
                    truncated = true;
                    break;
                }
            }
            if scanned >= max_scanned {
                truncated = true;
                break;
            }
        }

        if truncated {
            break;
        }
        if resp.is_truncated() == Some(true) {
            token = resp.next_continuation_token().map(|s| s.to_string());
            if token.is_none() {
                break;
            }
        } else {
            break;
        }
    }

    Ok((matches, scanned, truncated))
}

pub async fn list_objects_recursive_limited(
    client: &Client,
    bucket: &str,
    prefix: &str,
    max_scanned: u32,
) -> Result<(Vec<BucketFile>, u32, bool), AppError> {
    let mut out: Vec<BucketFile> = Vec::new();
    let mut scanned: u32 = 0;
    let mut truncated = false;
    let mut token: Option<String> = None;

    loop {
        let mut req = client
            .list_objects_v2()
            .bucket(bucket)
            .prefix(prefix.to_string());
        if let Some(ref t) = token {
            req = req.continuation_token(t);
        }
        let resp = req.send().await.map_err(map_s3_sdk_error)?;

        for obj in resp.contents() {
            scanned = scanned.saturating_add(1);
            let key = obj.key().unwrap_or("").to_string();
            if key.is_empty() || key.ends_with('/') {
                continue;
            }
            out.push(BucketFile {
                key,
                size: obj.size().unwrap_or(0) as u64,
                last_modified: obj
                    .last_modified()
                    .map(|t| t.to_string())
                    .unwrap_or_default(),
                etag: obj.e_tag().map(|s| s.to_string()).unwrap_or_default(),
                is_folder: false,
            });
            if scanned >= max_scanned {
                truncated = true;
                break;
            }
        }
        if truncated {
            break;
        }
        if resp.is_truncated() == Some(true) {
            token = resp.next_continuation_token().map(|s| s.to_string());
            if token.is_none() {
                break;
            }
        } else {
            break;
        }
    }

    Ok((out, scanned, truncated))
}

pub async fn object_exists(client: &Client, bucket: &str, key: &str) -> Result<bool, AppError> {
    let resp = client
        .list_objects_v2()
        .bucket(bucket)
        .prefix(key.to_string())
        .max_keys(1)
        .send()
        .await
        .map_err(map_s3_sdk_error)?;
    Ok(resp
        .contents()
        .iter()
        .any(|obj| obj.key().unwrap_or_default() == key))
}

pub async fn object_details(
    client: &Client,
    bucket: &str,
    key: &str,
) -> Result<ObjectDetails, AppError> {
    let head = client
        .head_object()
        .bucket(bucket)
        .key(key)
        .send()
        .await
        .map_err(map_s3_sdk_error)?;
    let versioning = client
        .get_bucket_versioning()
        .bucket(bucket)
        .send()
        .await
        .ok()
        .and_then(|v| v.status().map(|s| s.as_str().to_string()))
        .unwrap_or_else(|| "Unknown".to_string());
    Ok(ObjectDetails {
        key: key.to_string(),
        size: head
            .content_length()
            .and_then(|n| u64::try_from(n).ok())
            .unwrap_or(0),
        last_modified: head
            .last_modified()
            .map(|t| t.to_string())
            .unwrap_or_default(),
        etag: head.e_tag().map(|s| s.to_string()).unwrap_or_default(),
        content_type: head.content_type().unwrap_or("Unknown").to_string(),
        storage_class: head
            .storage_class()
            .map(|s| s.as_str().to_string())
            .unwrap_or_else(|| "STANDARD".to_string()),
        cache_control: head.cache_control().unwrap_or("").to_string(),
        metadata: head.metadata().cloned().unwrap_or_default(),
        versioning_status: versioning,
    })
}

fn object_from_listing(obj: &aws_sdk_s3::types::Object) -> BucketFile {
    BucketFile {
        key: obj.key().unwrap_or_default().to_string(),
        size: obj.size().unwrap_or(0) as u64,
        last_modified: obj
            .last_modified()
            .map(|t| t.to_string())
            .unwrap_or_default(),
        etag: obj.e_tag().map(|s| s.to_string()).unwrap_or_default(),
        is_folder: obj.key().unwrap_or_default().ends_with('/'),
    }
}

fn basename(key: &str) -> String {
    key.trim_end_matches('/')
        .rsplit('/')
        .next()
        .unwrap_or(key)
        .to_string()
}

pub async fn cleanup_report(
    client: &Client,
    bucket: &str,
    prefix: &str,
    old_days: u64,
    large_bytes: u64,
    max_scanned: u32,
) -> Result<CleanupReport, AppError> {
    let now_secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    let old_cutoff = now_secs.saturating_sub((old_days.saturating_mul(86_400)) as i64);
    let mut scanned: u32 = 0;
    let mut truncated = false;
    let mut token: Option<String> = None;
    let mut old_objects = Vec::new();
    let mut large_objects = Vec::new();
    let mut empty_folder_markers = Vec::new();
    let mut by_name: HashMap<String, Vec<BucketFile>> = HashMap::new();

    loop {
        let mut req = client
            .list_objects_v2()
            .bucket(bucket)
            .prefix(prefix.to_string());
        if let Some(ref t) = token {
            req = req.continuation_token(t);
        }
        let resp = req.send().await.map_err(map_s3_sdk_error)?;

        for obj in resp.contents() {
            scanned = scanned.saturating_add(1);
            let file = object_from_listing(obj);
            if file.key.is_empty() {
                continue;
            }
            if file.is_folder && file.size == 0 {
                empty_folder_markers.push(file.clone());
            }
            if !file.is_folder {
                if file.size >= large_bytes {
                    large_objects.push(file.clone());
                }
                if obj
                    .last_modified()
                    .map(|t| t.secs() <= old_cutoff)
                    .unwrap_or(false)
                {
                    old_objects.push(file.clone());
                }
                by_name.entry(basename(&file.key)).or_default().push(file);
            }
            if scanned >= max_scanned {
                truncated = true;
                break;
            }
        }

        if truncated {
            break;
        }
        if resp.is_truncated() == Some(true) {
            token = resp.next_continuation_token().map(|s| s.to_string());
            if token.is_none() {
                break;
            }
        } else {
            break;
        }
    }

    let mut duplicate_name_groups: Vec<DuplicateNameGroup> = by_name
        .into_iter()
        .filter_map(|(name, objects)| {
            if objects.len() > 1 {
                Some(DuplicateNameGroup { name, objects })
            } else {
                None
            }
        })
        .collect();
    duplicate_name_groups.sort_by(|a, b| b.objects.len().cmp(&a.objects.len()));
    large_objects.sort_by(|a, b| b.size.cmp(&a.size));
    old_objects.sort_by(|a, b| a.last_modified.cmp(&b.last_modified));

    let noncurrent_versions = list_noncurrent_versions_under_prefix(client, bucket, prefix)
        .await
        .unwrap_or_default();

    Ok(CleanupReport {
        scanned,
        truncated,
        old_objects,
        large_objects,
        duplicate_name_groups,
        empty_folder_markers,
        noncurrent_versions,
    })
}

fn top_level_prefix(prefix: &str, key: &str) -> String {
    let rest = key.strip_prefix(prefix).unwrap_or(key);
    match rest.split('/').next() {
        Some(part) if !part.is_empty() && rest.contains('/') => {
            if prefix.is_empty() {
                format!("{part}/")
            } else {
                format!("{prefix}{part}/")
            }
        }
        _ => prefix.to_string(),
    }
}

fn file_type_for_key(key: &str) -> String {
    let name = basename(key).to_lowercase();
    match name.rsplit_once('.') {
        Some((_, ext)) if !ext.is_empty() => ext.to_string(),
        _ => "no extension".to_string(),
    }
}

pub async fn usage_summary(
    client: &Client,
    bucket: &str,
    prefix: &str,
    max_scanned: u32,
) -> Result<UsageSummary, AppError> {
    let mut scanned: u32 = 0;
    let mut truncated = false;
    let mut token: Option<String> = None;
    let mut total_size: u64 = 0;
    let mut object_count: u32 = 0;
    let mut by_prefix: HashMap<String, (u64, u32)> = HashMap::new();
    let mut by_type: HashMap<String, (u64, u32)> = HashMap::new();

    loop {
        let mut req = client
            .list_objects_v2()
            .bucket(bucket)
            .prefix(prefix.to_string());
        if let Some(ref t) = token {
            req = req.continuation_token(t);
        }
        let resp = req.send().await.map_err(map_s3_sdk_error)?;

        for obj in resp.contents() {
            scanned = scanned.saturating_add(1);
            let key = obj.key().unwrap_or_default();
            if key.is_empty() || key.ends_with('/') {
                continue;
            }
            let size = obj.size().unwrap_or(0) as u64;
            total_size = total_size.saturating_add(size);
            object_count = object_count.saturating_add(1);
            let prefix_entry = by_prefix
                .entry(top_level_prefix(prefix, key))
                .or_insert((0, 0));
            prefix_entry.0 = prefix_entry.0.saturating_add(size);
            prefix_entry.1 = prefix_entry.1.saturating_add(1);
            let type_entry = by_type.entry(file_type_for_key(key)).or_insert((0, 0));
            type_entry.0 = type_entry.0.saturating_add(size);
            type_entry.1 = type_entry.1.saturating_add(1);
            if scanned >= max_scanned {
                truncated = true;
                break;
            }
        }

        if truncated {
            break;
        }
        if resp.is_truncated() == Some(true) {
            token = resp.next_continuation_token().map(|s| s.to_string());
            if token.is_none() {
                break;
            }
        } else {
            break;
        }
    }

    let mut largest_prefixes: Vec<PrefixUsage> = by_prefix
        .into_iter()
        .map(|(prefix, (size, count))| PrefixUsage {
            prefix,
            size,
            count,
        })
        .collect();
    largest_prefixes.sort_by(|a, b| b.size.cmp(&a.size));
    largest_prefixes.truncate(12);

    let mut file_types: Vec<FileTypeUsage> = by_type
        .into_iter()
        .map(|(file_type, (size, count))| FileTypeUsage {
            file_type,
            size,
            count,
        })
        .collect();
    file_types.sort_by(|a, b| b.size.cmp(&a.size));
    file_types.truncate(12);

    Ok(UsageSummary {
        scanned,
        truncated,
        total_size,
        object_count,
        largest_prefixes,
        file_types,
    })
}

pub async fn copy_object_between_buckets(
    source_client: &Client,
    source_bucket: &str,
    target_client: &Client,
    target_bucket: &str,
    from_key: &str,
    to_key: &str,
) -> Result<(), AppError> {
    let resp = source_client
        .get_object()
        .bucket(source_bucket)
        .key(from_key)
        .send()
        .await
        .map_err(map_s3_sdk_error)?;
    target_client
        .put_object()
        .bucket(target_bucket)
        .key(to_key)
        .body(resp.body)
        .send()
        .await
        .map_err(map_s3_sdk_error)?;
    Ok(())
}

fn copy_source_for_key(bucket: &str, key: &str) -> String {
    let enc: String = key
        .split('/')
        .map(|seg| urlencoding::encode(seg).into_owned())
        .collect::<Vec<_>>()
        .join("/");
    format!("{}/{}", bucket, enc)
}

pub async fn copy_object_same_bucket(
    client: &Client,
    bucket: &str,
    from_key: &str,
    to_key: &str,
) -> Result<(), AppError> {
    if from_key == to_key {
        return Ok(());
    }
    let src = copy_source_for_key(bucket, from_key);
    client
        .copy_object()
        .bucket(bucket)
        .key(to_key)
        .copy_source(src)
        .send()
        .await
        .map_err(map_s3_sdk_error)?;
    Ok(())
}

pub async fn put_object_from_file(
    client: &Client,
    bucket: &str,
    key: &str,
    local_path: &Path,
    app: &AppHandle,
) -> Result<(), AppError> {
    let emitter = TransferEmitter::new(app.clone());
    let meta = tokio::fs::metadata(local_path).await?;
    let total = meta.len();
    emitter.start("upload", key, Some(total));
    let body = ByteStream::from_path(local_path).await.map_err(|e| {
        AppError::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            e.to_string(),
        ))
    })?;
    let res = client
        .put_object()
        .bucket(bucket)
        .key(key)
        .body(body)
        .send()
        .await;
    match res {
        Ok(_) => {
            emitter.end("upload", key, total, Some(total));
            Ok(())
        }
        Err(e) => {
            let ae = map_s3_sdk_error(e);
            emitter.error("upload", key, ae.to_string());
            Err(ae)
        }
    }
}

pub async fn get_object_to_file(
    client: &Client,
    bucket: &str,
    key: &str,
    dest_path: &Path,
    app: &AppHandle,
) -> Result<(), AppError> {
    let mut emitter = TransferEmitter::new(app.clone());

    let head = client
        .head_object()
        .bucket(bucket)
        .key(key)
        .send()
        .await
        .map_err(map_s3_sdk_error)?;
    let total: Option<u64> = head.content_length().and_then(|c| u64::try_from(c).ok());

    emitter.start("download", key, total);

    let resp = client
        .get_object()
        .bucket(bucket)
        .key(key)
        .send()
        .await
        .map_err(map_s3_sdk_error)?;

    let mut stream = resp.body;
    let mut file = tokio::fs::File::create(dest_path).await?;
    let mut transferred: u64 = 0;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| AppError::S3(format!("download stream: {e}")))?;
        file.write_all(&chunk).await?;
        transferred = transferred.saturating_add(chunk.len() as u64);
        emitter.progress("download", key, transferred, total);
    }

    file.flush().await?;

    match total {
        Some(t) if transferred != t => {
            let msg = format!("incomplete download: {transferred}/{t}");
            emitter.error("download", key, msg.clone());
            return Err(AppError::S3(msg));
        }
        _ => {}
    }

    emitter.end("download", key, transferred, total);
    Ok(())
}

pub async fn delete_object(client: &Client, bucket: &str, key: &str) -> Result<(), AppError> {
    client
        .delete_object()
        .bucket(bucket)
        .key(key)
        .send()
        .await
        .map_err(map_s3_sdk_error)?;
    Ok(())
}

pub async fn delete_objects(
    client: &Client,
    bucket: &str,
    keys: &[String],
) -> Result<(), AppError> {
    if keys.is_empty() {
        return Ok(());
    }
    const CHUNK: usize = 900;
    for part in keys.chunks(CHUNK) {
        let mut objs = Vec::with_capacity(part.len());
        for k in part {
            objs.push(
                ObjectIdentifier::builder()
                    .key(k)
                    .build()
                    .map_err(|e| AppError::S3(e.to_string()))?,
            );
        }
        let del = Delete::builder()
            .set_objects(Some(objs))
            .build()
            .map_err(|e| AppError::S3(e.to_string()))?;
        client
            .delete_objects()
            .bucket(bucket)
            .delete(del)
            .send()
            .await
            .map_err(map_s3_sdk_error)?;
    }
    Ok(())
}

pub async fn list_all_keys_under_prefix(
    client: &Client,
    bucket: &str,
    prefix: &str,
    max_keys: u32,
) -> Result<Vec<String>, AppError> {
    let mut keys: Vec<String> = Vec::new();
    let mut token: Option<String> = None;
    let max = max_keys as usize;

    loop {
        if keys.len() >= max {
            return Err(AppError::TooManyObjects { max: max_keys });
        }
        let mut req = client
            .list_objects_v2()
            .bucket(bucket)
            .prefix(prefix.to_string());
        if let Some(ref t) = token {
            req = req.continuation_token(t);
        }
        let resp = req.send().await.map_err(map_s3_sdk_error)?;

        for obj in resp.contents() {
            let k = obj.key().unwrap_or("");
            if !k.is_empty() {
                keys.push(k.to_string());
                if keys.len() >= max {
                    return Err(AppError::TooManyObjects { max: max_keys });
                }
            }
        }

        if resp.is_truncated() == Some(true) {
            token = resp.next_continuation_token().map(|s| s.to_string());
            if token.is_none() {
                break;
            }
        } else {
            break;
        }
    }

    Ok(keys)
}

pub async fn preview_delete_prefix(
    client: &Client,
    bucket: &str,
    prefix: &str,
    max_keys: u32,
) -> Result<crate::s3::types::DeletePreview, AppError> {
    let mut token: Option<String> = None;
    let mut object_count: u32 = 0;
    let mut total_size: u64 = 0;
    let mut sample_keys: Vec<String> = Vec::new();

    loop {
        let mut req = client
            .list_objects_v2()
            .bucket(bucket)
            .prefix(prefix.to_string());
        if let Some(ref t) = token {
            req = req.continuation_token(t);
        }
        let resp = req.send().await.map_err(map_s3_sdk_error)?;

        for obj in resp.contents() {
            let key = obj.key().unwrap_or("");
            if key.is_empty() {
                continue;
            }
            object_count = object_count.saturating_add(1);
            if let Some(size) = obj.size().and_then(|s| u64::try_from(s).ok()) {
                total_size = total_size.saturating_add(size);
            }
            if sample_keys.len() < 8 {
                sample_keys.push(key.to_string());
            }
            if object_count >= max_keys {
                return Ok(crate::s3::types::DeletePreview {
                    object_count,
                    total_size,
                    truncated: true,
                    sample_keys,
                });
            }
        }

        if resp.is_truncated() == Some(true) {
            token = resp.next_continuation_token().map(|s| s.to_string());
            if token.is_none() {
                break;
            }
        } else {
            break;
        }
    }

    Ok(crate::s3::types::DeletePreview {
        object_count,
        total_size,
        truncated: false,
        sample_keys,
    })
}

pub fn suggested_content_type(key: &str) -> Option<&'static str> {
    let ext = key.rsplit('.').next()?.to_ascii_lowercase();
    match ext.as_str() {
        "html" | "htm" => Some("text/html; charset=utf-8"),
        "css" => Some("text/css; charset=utf-8"),
        "js" | "mjs" => Some("text/javascript; charset=utf-8"),
        "json" => Some("application/json; charset=utf-8"),
        "svg" => Some("image/svg+xml"),
        "png" => Some("image/png"),
        "jpg" | "jpeg" => Some("image/jpeg"),
        "webp" => Some("image/webp"),
        "gif" => Some("image/gif"),
        "ico" => Some("image/x-icon"),
        "pdf" => Some("application/pdf"),
        "txt" => Some("text/plain; charset=utf-8"),
        "xml" => Some("application/xml; charset=utf-8"),
        "wasm" => Some("application/wasm"),
        "mp4" => Some("video/mp4"),
        "webm" => Some("video/webm"),
        "mp3" => Some("audio/mpeg"),
        "wav" => Some("audio/wav"),
        "zip" => Some("application/zip"),
        _ => None,
    }
}

pub async fn scan_mime_issues(
    client: &Client,
    bucket: &str,
    prefix: &str,
    max_scanned: u32,
) -> Result<MimeScanReport, AppError> {
    let (files, scanned, truncated) =
        list_objects_recursive_limited(client, bucket, prefix, max_scanned).await?;
    let mut issues = Vec::new();
    for file in files {
        let Some(suggested) = suggested_content_type(&file.key) else {
            continue;
        };
        let head = client
            .head_object()
            .bucket(bucket)
            .key(&file.key)
            .send()
            .await
            .map_err(map_s3_sdk_error)?;
        let current = head.content_type().unwrap_or("").to_string();
        if current != suggested {
            issues.push(MimeIssue {
                key: file.key,
                current_content_type: if current.is_empty() {
                    "(missing)".to_string()
                } else {
                    current
                },
                suggested_content_type: suggested.to_string(),
                size: file.size,
            });
        }
    }
    Ok(MimeScanReport {
        issues,
        scanned,
        truncated,
    })
}

pub async fn fix_object_content_type(
    client: &Client,
    bucket: &str,
    key: &str,
    content_type: &str,
) -> Result<(), AppError> {
    let head = client
        .head_object()
        .bucket(bucket)
        .key(key)
        .send()
        .await
        .map_err(map_s3_sdk_error)?;
    let src = copy_source_for_key(bucket, key);
    let mut req = client
        .copy_object()
        .bucket(bucket)
        .key(key)
        .copy_source(src)
        .metadata_directive(MetadataDirective::Replace)
        .content_type(content_type);
    if let Some(cache_control) = head.cache_control() {
        req = req.cache_control(cache_control);
    }
    if let Some(disposition) = head.content_disposition() {
        req = req.content_disposition(disposition);
    }
    if let Some(encoding) = head.content_encoding() {
        req = req.content_encoding(encoding);
    }
    if let Some(metadata) = head.metadata() {
        if !metadata.is_empty() {
            req = req.set_metadata(Some(metadata.clone()));
        }
    }
    req.send().await.map_err(map_s3_sdk_error)?;
    Ok(())
}

pub async fn catalog_prefix(
    client: &Client,
    bucket: &str,
    prefix: &str,
    max_scanned: u32,
) -> Result<(Vec<CatalogEntry>, u32, bool), AppError> {
    let (files, scanned, truncated) =
        list_objects_recursive_limited(client, bucket, prefix, max_scanned).await?;
    let mut entries = Vec::with_capacity(files.len());
    for file in files {
        let content_type = match client
            .head_object()
            .bucket(bucket)
            .key(&file.key)
            .send()
            .await
        {
            Ok(head) => head.content_type().unwrap_or("").to_string(),
            Err(_) => String::new(),
        };
        entries.push(CatalogEntry {
            key: file.key,
            size: file.size,
            last_modified: file.last_modified,
            etag: file.etag,
            content_type,
        });
    }
    Ok((entries, scanned, truncated))
}

pub async fn put_folder_marker(client: &Client, bucket: &str, key: &str) -> Result<(), AppError> {
    if !key.ends_with('/') || key.len() < 2 {
        return Err(AppError::InvalidKey(
            "Folder key must end with / and not be empty".into(),
        ));
    }
    client
        .put_object()
        .bucket(bucket)
        .key(key)
        .body(ByteStream::from(Vec::new()))
        .send()
        .await
        .map_err(map_s3_sdk_error)?;
    Ok(())
}

pub async fn presign_get_object_url(
    client: &Client,
    bucket: &str,
    key: &str,
    expires_in_secs: u64,
) -> Result<String, AppError> {
    if key.ends_with('/') {
        return Err(AppError::InvalidKey(
            "Cannot presign a folder marker".into(),
        ));
    }
    let secs = expires_in_secs.clamp(60, 604_800);
    let cfg = aws_sdk_s3::presigning::PresigningConfig::expires_in(Duration::from_secs(secs))
        .map_err(|e| AppError::S3(format!("presign config: {e}")))?;
    let out = client
        .get_object()
        .bucket(bucket)
        .key(key)
        .presigned(cfg)
        .await
        .map_err(|e| AppError::S3(e.to_string()))?;
    Ok(out.uri().to_string())
}

pub async fn list_object_versions(
    client: &Client,
    bucket: &str,
    key: &str,
) -> Result<Vec<FileVersion>, AppError> {
    let resp = client
        .list_object_versions()
        .bucket(bucket)
        .prefix(key)
        .send()
        .await
        .map_err(map_s3_sdk_error)?;

    let mut versions: Vec<FileVersion> = Vec::new();

    for v in resp.versions() {
        let v_key = v.key().unwrap_or("");
        if v_key != key {
            continue;
        }
        let version_id = v.version_id().unwrap_or("null").to_string();
        let last_modified = v.last_modified().map(|t| t.to_string()).unwrap_or_default();
        let size = v.size().unwrap_or(0) as u64;
        let is_latest = v.is_latest().unwrap_or(false);
        let etag = v.e_tag().map(|s| s.to_string()).unwrap_or_default();

        versions.push(FileVersion {
            version_id,
            last_modified,
            size,
            is_latest,
            etag,
        });
    }

    versions.sort_by(|a, b| b.last_modified.cmp(&a.last_modified));

    Ok(versions)
}

pub async fn list_noncurrent_versions_under_prefix(
    client: &Client,
    bucket: &str,
    prefix: &str,
) -> Result<Vec<FileVersion>, AppError> {
    let resp = client
        .list_object_versions()
        .bucket(bucket)
        .prefix(prefix)
        .send()
        .await
        .map_err(map_s3_sdk_error)?;
    let mut versions = Vec::new();

    for v in resp.versions() {
        if v.is_latest().unwrap_or(false) {
            continue;
        }
        let version_id = v.version_id().unwrap_or("null").to_string();
        let last_modified = v.last_modified().map(|t| t.to_string()).unwrap_or_default();
        let size = v.size().unwrap_or(0) as u64;
        let etag = v.e_tag().map(|s| s.to_string()).unwrap_or_default();
        versions.push(FileVersion {
            version_id,
            last_modified,
            size,
            is_latest: false,
            etag,
        });
    }

    versions.sort_by(|a, b| b.last_modified.cmp(&a.last_modified));
    Ok(versions)
}

pub async fn get_object_version_to_file(
    client: &Client,
    bucket: &str,
    key: &str,
    version_id: &str,
    dest_path: &Path,
    app: &AppHandle,
) -> Result<(), AppError> {
    let mut emitter = TransferEmitter::new(app.clone());

    let head = client
        .head_object()
        .bucket(bucket)
        .key(key)
        .version_id(version_id)
        .send()
        .await
        .map_err(map_s3_sdk_error)?;
    let total: Option<u64> = head.content_length().and_then(|c| u64::try_from(c).ok());

    emitter.start("download", key, total);

    let resp = client
        .get_object()
        .bucket(bucket)
        .key(key)
        .version_id(version_id)
        .send()
        .await
        .map_err(map_s3_sdk_error)?;

    let mut stream = resp.body;
    let mut file = tokio::fs::File::create(dest_path).await?;
    let mut transferred: u64 = 0;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| AppError::S3(format!("download stream: {e}")))?;
        file.write_all(&chunk).await?;
        transferred = transferred.saturating_add(chunk.len() as u64);
        emitter.progress("download", key, transferred, total);
    }

    file.flush().await?;

    match total {
        Some(t) if transferred != t => {
            let msg = format!("incomplete download: {transferred}/{t}");
            emitter.error("download", key, msg.clone());
            return Err(AppError::S3(msg));
        }
        _ => {}
    }

    emitter.end("download", key, transferred, total);
    Ok(())
}
