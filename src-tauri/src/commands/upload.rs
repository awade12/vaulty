use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

use image::codecs::jpeg::JpegEncoder;
use image::codecs::webp::WebPEncoder;
use image::{DynamicImage, GenericImageView};
use serde::Serialize;
use tauri::Manager;
use tauri::State;
use walkdir::WalkDir;

use crate::error::AppError;
use crate::s3::operations;
use crate::state::AppState;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalUploadItem {
    pub local_path: String,
    pub object_relative_key: String,
    pub size: u64,
    pub modified_millis: u128,
}

fn normalize_rel_key(rel: &Path) -> Option<String> {
    let s = rel.to_string_lossy().replace('\\', "/");
    let trimmed = s.trim_start_matches("./");
    if trimmed.is_empty() || trimmed == "/" || trimmed == "." {
        return None;
    }
    Some(trimmed.to_string())
}

fn root_segment_for_dir(dir: &Path) -> String {
    let raw = dir
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();
    let cleaned: String = raw
        .chars()
        .map(|c| match c {
            '\\' | '/' | ':' | '*' | '?' | '"' | '<' | '>' | '|' | '#' => '_',
            c if c.is_control() => '_',
            c => c,
        })
        .collect();
    let trimmed = cleaned.trim_matches(|c: char| c == '.' || c.is_whitespace());
    if trimmed.is_empty() {
        "folder".into()
    } else {
        trimmed.to_string()
    }
}

fn file_fingerprint(path: &Path) -> Result<(u64, u128), AppError> {
    let meta = std::fs::metadata(path)?;
    let size = meta.len();
    let modified_millis = meta
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis())
        .unwrap_or(0);
    Ok((size, modified_millis))
}

fn push_single_file(out: &mut Vec<LocalUploadItem>, path: &Path) -> Result<(), AppError> {
    let local_path = path
        .to_str()
        .ok_or_else(|| AppError::Path("invalid path encoding".into()))?;
    let name = path
        .file_name()
        .ok_or_else(|| AppError::Path("missing file name".into()))?;
    let object_relative_key = name.to_string_lossy().replace('\\', "/");
    let (size, modified_millis) = file_fingerprint(path)?;
    out.push(LocalUploadItem {
        local_path: local_path.to_string(),
        object_relative_key,
        size,
        modified_millis,
    });
    Ok(())
}

#[tauri::command]
pub fn collect_upload_candidates(paths: Vec<String>) -> Result<Vec<LocalUploadItem>, String> {
    let mut out: Vec<LocalUploadItem> = Vec::new();

    for p in paths {
        let path = PathBuf::from(&p);
        let meta = std::fs::metadata(&path).map_err(|e| AppError::Io(e).into_string())?;
        if meta.is_file() {
            push_single_file(&mut out, &path).map_err(AppError::into_string)?;
            continue;
        }
        if meta.is_dir() {
            let root = path;
            let root_seg = root_segment_for_dir(&root);
            for entry in WalkDir::new(&root)
                .follow_links(false)
                .into_iter()
                .filter_map(|e| e.ok())
            {
                if !entry.file_type().is_file() {
                    continue;
                }
                let fp = entry.path();
                let rel = fp.strip_prefix(&root).map_err(|_| {
                    AppError::Path("could not compute relative upload path".into()).into_string()
                })?;
                let Some(rel_key) = normalize_rel_key(rel) else {
                    continue;
                };
                let object_relative_key = format!("{root_seg}/{rel_key}");
                let local_path = fp
                    .to_str()
                    .ok_or_else(|| AppError::Path("invalid path encoding".into()).into_string())?;
                let (size, modified_millis) = file_fingerprint(fp).map_err(|e| e.into_string())?;
                out.push(LocalUploadItem {
                    local_path: local_path.to_string(),
                    object_relative_key,
                    size,
                    modified_millis,
                });
            }
            continue;
        }
    }

    out.sort_by(|a, b| {
        a.object_relative_key
            .cmp(&b.object_relative_key)
            .then_with(|| a.local_path.cmp(&b.local_path))
    });
    out.dedup_by(|a, b| {
        a.local_path == b.local_path && a.object_relative_key == b.object_relative_key
    });

    Ok(out)
}

#[tauri::command]
pub async fn upload_file(
    app: tauri::AppHandle,
    local_path: String,
    key: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let path = Path::new(&local_path);
    if !path.is_file() {
        return Err(AppError::Path("Select a valid file path".into()).into_string());
    }
    if key.trim().is_empty() || key.ends_with('/') {
        return Err(
            AppError::InvalidKey("Upload key must be a file object path".into()).into_string(),
        );
    }
    let client = state.client().await.map_err(AppError::into_string)?;
    let bucket = state.active_bucket().await;
    if bucket.is_empty() {
        return Err(AppError::NoActiveConnection.into_string());
    }
    let _permit = state
        .acquire_transfer_permit()
        .await
        .map_err(AppError::into_string)?;
    operations::put_object_from_file(&client, &bucket, &key, path, &app)
        .await
        .map_err(AppError::into_string)
}

#[tauri::command]
pub async fn upload_optimized_image(
    app: tauri::AppHandle,
    local_path: String,
    key: String,
    max_width: u32,
    quality: u8,
    format: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let path = Path::new(&local_path);
    if !path.is_file() {
        return Err(AppError::Path("Select a valid image path".into()).into_string());
    }
    let img = image::open(path).map_err(|e| AppError::Path(e.to_string()).into_string())?;
    let optimized = resize_image(img, max_width.max(64));
    let cache = app
        .path()
        .app_cache_dir()
        .map_err(|e| AppError::Path(e.to_string()).into_string())?
        .join("optimized");
    tokio::fs::create_dir_all(&cache)
        .await
        .map_err(|e| AppError::Io(e).into_string())?;
    let ext = if format == "webp" { "webp" } else { "jpg" };
    let out_path = cache.join(format!("{}.{}", uuid::Uuid::new_v4(), ext));
    let bytes = encode_image(&optimized, quality.clamp(40, 95), ext)?;
    tokio::fs::write(&out_path, bytes)
        .await
        .map_err(|e| AppError::Io(e).into_string())?;
    let upload_key = replace_image_extension(&key, ext);
    let client = state.client().await.map_err(AppError::into_string)?;
    let bucket = state.active_bucket().await;
    if bucket.is_empty() {
        return Err(AppError::NoActiveConnection.into_string());
    }
    let _permit = state
        .acquire_transfer_permit()
        .await
        .map_err(AppError::into_string)?;
    operations::put_object_from_file(&client, &bucket, &upload_key, &out_path, &app)
        .await
        .map_err(AppError::into_string)?;
    let _ = tokio::fs::remove_file(out_path).await;
    Ok(())
}

fn resize_image(img: DynamicImage, max_width: u32) -> DynamicImage {
    let (w, h) = img.dimensions();
    if w <= max_width {
        return img;
    }
    let next_h = ((h as f32) * (max_width as f32 / w as f32)).round() as u32;
    img.resize(
        max_width,
        next_h.max(1),
        image::imageops::FilterType::Lanczos3,
    )
}

fn encode_image(img: &DynamicImage, quality: u8, ext: &str) -> Result<Vec<u8>, String> {
    let mut out = Vec::new();
    match ext {
        "webp" => {
            let rgba = img.to_rgba8();
            WebPEncoder::new_lossless(&mut out)
                .encode(
                    &rgba,
                    rgba.width(),
                    rgba.height(),
                    image::ExtendedColorType::Rgba8,
                )
                .map_err(|e| AppError::Path(e.to_string()).into_string())?;
        }
        _ => {
            let rgb = img.to_rgb8();
            JpegEncoder::new_with_quality(&mut out, quality)
                .encode(
                    &rgb,
                    rgb.width(),
                    rgb.height(),
                    image::ExtendedColorType::Rgb8,
                )
                .map_err(|e| AppError::Path(e.to_string()).into_string())?;
        }
    }
    Ok(out)
}

fn replace_image_extension(key: &str, ext: &str) -> String {
    let slash = key.rfind('/').unwrap_or(0);
    let dot = key.rfind('.');
    if let Some(dot) = dot.filter(|dot| *dot > slash) {
        format!("{}.{}", &key[..dot], ext)
    } else {
        format!("{key}.{ext}")
    }
}

#[tauri::command]
pub async fn delete_local_file(local_path: String) -> Result<(), String> {
    let path = Path::new(&local_path);
    if !path.is_file() {
        return Ok(());
    }
    tokio::fs::remove_file(path)
        .await
        .map_err(|e| AppError::Io(e).into_string())
}
