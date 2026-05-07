use std::path::Path;
use std::time::Duration;

use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::types::{Delete, ObjectIdentifier};
use aws_sdk_s3::Client;
use tauri::AppHandle;
use tokio::io::AsyncWriteExt;

use crate::error::AppError;
use crate::s3::sdk_error::map_s3_sdk_error;
use crate::s3::types::{BucketFile, FileVersion};
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

    out.sort_by(|a, b| {
        match (a.is_folder, b.is_folder) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.key.cmp(&b.key),
        }
    });

    Ok(out)
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
    let body = ByteStream::from_path(local_path)
        .await
        .map_err(|e| AppError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;
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
    let total: Option<u64> = head
        .content_length()
        .and_then(|c| u64::try_from(c).ok());

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
            return Err(AppError::TooManyObjects {
                max: max_keys,
            });
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
                    return Err(AppError::TooManyObjects {
                        max: max_keys,
                    });
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

pub async fn put_folder_marker(
    client: &Client,
    bucket: &str,
    key: &str,
) -> Result<(), AppError> {
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
        let last_modified = v
            .last_modified()
            .map(|t| t.to_string())
            .unwrap_or_default();
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
    let total: Option<u64> = head
        .content_length()
        .and_then(|c| u64::try_from(c).ok());

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
