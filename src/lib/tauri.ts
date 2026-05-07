import { invoke } from "@tauri-apps/api/core";

import type {
  BucketFile,
  BulkAddConnectionsResult,
  ConnectionConfig,
  FileVersion,
  LocalUploadItem,
} from "../types";

export async function addConnection(payload: {
  label: string;
  provider: string;
  endpoint: string;
  bucket: string;
  region: string | null;
  accessKeyId: string;
  secretAccessKey: string;
}): Promise<ConnectionConfig> {
  return invoke<ConnectionConfig>("add_connection", {
    label: payload.label,
    provider: payload.provider,
    endpoint: payload.endpoint,
    bucket: payload.bucket,
    region: payload.region,
    accessKeyId: payload.accessKeyId,
    secretAccessKey: payload.secretAccessKey,
  });
}

export async function listConnections(): Promise<ConnectionConfig[]> {
  return invoke<ConnectionConfig[]>("list_connections");
}

export async function removeConnection(id: string): Promise<void> {
  return invoke<void>("remove_connection", { id });
}

export async function activateConnection(id: string): Promise<void> {
  return invoke<void>("activate_connection", { id });
}

export async function listFiles(prefix: string): Promise<BucketFile[]> {
  return invoke<BucketFile[]>("list_files", { prefix });
}

export interface SearchResult {
  matches: BucketFile[];
  scanned: number;
  truncated: boolean;
}

export async function searchObjects(
  query: string,
  prefix: string,
): Promise<SearchResult> {
  return invoke<SearchResult>("search_objects", { query, prefix });
}

export async function collectUploadCandidates(
  paths: string[],
): Promise<LocalUploadItem[]> {
  return invoke<LocalUploadItem[]>("collect_upload_candidates", { paths });
}

export async function uploadFile(
  localPath: string,
  key: string,
): Promise<void> {
  return invoke<void>("upload_file", { localPath, key });
}

export async function downloadFile(key: string, destPath: string): Promise<void> {
  return invoke<void>("download_file", { key, destPath });
}

export async function deleteFile(key: string): Promise<void> {
  return invoke<void>("delete_file", { key });
}

export async function createFolder(key: string): Promise<void> {
  return invoke<void>("create_folder", { key });
}

export async function getPresignedUrl(
  key: string,
  expiresInSecs?: number,
): Promise<string> {
  return invoke<string>("get_presigned_url", {
    key,
    expiresInSecs: expiresInSecs ?? null,
  });
}

export async function moveObject(
  fromKey: string,
  toKey: string,
): Promise<void> {
  return invoke<void>("move_object", { fromKey, toKey });
}

export async function deleteObjects(keys: string[]): Promise<void> {
  return invoke<void>("delete_objects", { keys });
}

export async function deletePrefixRecursive(
  prefix: string,
  maxKeys?: number,
): Promise<number> {
  return invoke<number>("delete_prefix_recursive", {
    prefix,
    maxKeys: maxKeys ?? null,
  });
}

export async function openObject(key: string): Promise<void> {
  return invoke<void>("open_object", { key });
}

export async function duplicateObject(key: string): Promise<string> {
  return invoke<string>("duplicate_object", { key });
}

export async function downloadAsZip(
  keys: string[],
  destPath: string,
): Promise<void> {
  return invoke<void>("download_as_zip", { keys, destPath });
}

export async function listFileVersions(key: string): Promise<FileVersion[]> {
  return invoke<FileVersion[]>("list_file_versions", { key });
}

export async function downloadFileVersion(
  key: string,
  versionId: string,
  destPath: string,
): Promise<void> {
  return invoke<void>("download_file_version", { key, versionId, destPath });
}

export async function updateConnection(payload: {
  id: string;
  label: string;
  provider: string;
  endpoint: string;
  bucket: string;
  region: string | null;
  accessKeyId: string;
  secretAccessKey: string | null;
}): Promise<ConnectionConfig> {
  return invoke<ConnectionConfig>("update_connection", {
    id: payload.id,
    label: payload.label,
    provider: payload.provider,
    endpoint: payload.endpoint,
    bucket: payload.bucket,
    region: payload.region,
    accessKeyId: payload.accessKeyId,
    secretAccessKey: payload.secretAccessKey,
  });
}

export async function duplicateConnection(id: string): Promise<ConnectionConfig> {
  return invoke<ConnectionConfig>("duplicate_connection", { id });
}

export async function checkConnectionHealth(id: string): Promise<void> {
  return invoke<void>("check_connection_health", { id });
}

export async function listAccountBuckets(payload: {
  provider: string;
  endpoint: string;
  region: string | null;
  accessKeyId: string;
  secretAccessKey: string;
}): Promise<string[]> {
  return invoke<string[]>("list_account_buckets", {
    provider: payload.provider,
    endpoint: payload.endpoint,
    region: payload.region,
    accessKeyId: payload.accessKeyId,
    secretAccessKey: payload.secretAccessKey,
  });
}

export async function bulkAddConnections(payload: {
  provider: string;
  endpoint: string;
  region: string | null;
  accessKeyId: string;
  secretAccessKey: string;
  buckets: string[];
}): Promise<BulkAddConnectionsResult> {
  return invoke<BulkAddConnectionsResult>("bulk_add_connections", {
    provider: payload.provider,
    endpoint: payload.endpoint,
    region: payload.region,
    accessKeyId: payload.accessKeyId,
    secretAccessKey: payload.secretAccessKey,
    buckets: payload.buckets,
  });
}
