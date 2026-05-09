import { invoke } from "@tauri-apps/api/core";

import type {
  BucketFile,
  ActivityEvent,
  BucketDiffReport,
  BucketPermissionReport,
  BulkAddConnectionsResult,
  ConnectionConfig,
  CleanupReport,
  CredentialProfile,
  DeletePreview,
  GlobalSearchReport,
  FileVersion,
  CatalogSearchResult,
  LocalUploadItem,
  MimeScanReport,
  ObjectDetails,
  UsageSummary,
} from "../types";

export async function addConnection(payload: {
  label: string;
  provider: string;
  endpoint: string;
  bucket: string;
  region: string | null;
  accessKeyId: string;
  secretAccessKey: string;
  credentialProfileId?: string | null;
}): Promise<ConnectionConfig> {
  return invoke<ConnectionConfig>("add_connection", {
    label: payload.label,
    provider: payload.provider,
    endpoint: payload.endpoint,
    bucket: payload.bucket,
    region: payload.region,
    accessKeyId: payload.accessKeyId,
    secretAccessKey: payload.secretAccessKey,
    credentialProfileId: payload.credentialProfileId ?? null,
  });
}

export async function listCredentialProfiles(): Promise<CredentialProfile[]> {
  return invoke<CredentialProfile[]>("list_credential_profiles");
}

export async function updateCredentialProfile(payload: {
  id: string;
  label: string;
}): Promise<CredentialProfile> {
  return invoke<CredentialProfile>("update_credential_profile", {
    id: payload.id,
    label: payload.label,
  });
}

export async function rotateCredentialProfileSecret(payload: {
  id: string;
  secretAccessKey: string;
}): Promise<void> {
  return invoke<void>("rotate_credential_profile_secret", {
    id: payload.id,
    secretAccessKey: payload.secretAccessKey,
  });
}

export async function checkCredentialProfilePermissions(
  id: string,
): Promise<BucketPermissionReport> {
  return invoke<BucketPermissionReport>("check_credential_profile_permissions", {
    id,
  });
}

export async function moveConnectionToProfile(payload: {
  id: string;
  credentialProfileId: string;
}): Promise<ConnectionConfig> {
  return invoke<ConnectionConfig>("move_connection_to_profile", {
    id: payload.id,
    credentialProfileId: payload.credentialProfileId,
  });
}

export async function globalSearch(query: string): Promise<GlobalSearchReport> {
  return invoke<GlobalSearchReport>("global_search", { query });
}

export async function listActivity(): Promise<ActivityEvent[]> {
  return invoke<ActivityEvent[]>("list_activity");
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

export interface DragExportResult {
  path: string;
  /** True when the OS file manager was opened instead of a real drag session. */
  revealedOnly: boolean;
}

export async function startDragExport(key: string): Promise<DragExportResult> {
  return invoke<DragExportResult>("start_drag_export", { key });
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

export async function uploadOptimizedImage(payload: {
  localPath: string;
  key: string;
  maxWidth: number;
  quality: number;
  format: "jpeg" | "webp";
}): Promise<void> {
  return invoke<void>("upload_optimized_image", {
    localPath: payload.localPath,
    key: payload.key,
    maxWidth: payload.maxWidth,
    quality: payload.quality,
    format: payload.format,
  });
}

export async function deleteLocalFile(localPath: string): Promise<void> {
  return invoke<void>("delete_local_file", { localPath });
}

export async function downloadFile(key: string, destPath: string): Promise<void> {
  return invoke<void>("download_file", { key, destPath });
}

export async function deleteFile(key: string): Promise<void> {
  return invoke<void>("delete_file", { key });
}

export async function previewDelete(payload: {
  keys?: string[];
  prefix?: string;
}): Promise<DeletePreview> {
  return invoke<DeletePreview>("preview_delete", {
    keys: payload.keys ?? null,
    prefix: payload.prefix ?? null,
  });
}

export async function scanMimeIssues(prefix: string): Promise<MimeScanReport> {
  return invoke<MimeScanReport>("scan_mime_issues", { prefix });
}

export async function fixMimeIssues(keys: string[]): Promise<number> {
  return invoke<number>("fix_mime_issues", { keys });
}

export async function indexCatalog(payload: {
  connectionId: string;
  prefix: string;
}): Promise<number> {
  return invoke<number>("index_catalog", {
    connectionId: payload.connectionId,
    prefix: payload.prefix,
  });
}

export async function searchCatalog(payload: {
  connectionId: string;
  query: string;
}): Promise<CatalogSearchResult> {
  return invoke<CatalogSearchResult>("search_catalog", {
    connectionId: payload.connectionId,
    query: payload.query,
  });
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

export async function objectExists(key: string): Promise<boolean> {
  return invoke<boolean>("object_exists", { key });
}

export async function getObjectDetails(key: string): Promise<ObjectDetails> {
  return invoke<ObjectDetails>("get_object_details", { key });
}

export async function getCleanupReport(payload: {
  prefix: string;
  oldDays?: number;
  largeBytes?: number;
  maxScanned?: number;
}): Promise<CleanupReport> {
  return invoke<CleanupReport>("get_cleanup_report", {
    prefix: payload.prefix,
    oldDays: payload.oldDays ?? null,
    largeBytes: payload.largeBytes ?? null,
    maxScanned: payload.maxScanned ?? null,
  });
}

export async function getUsageSummary(payload: {
  prefix: string;
  maxScanned?: number;
}): Promise<UsageSummary> {
  return invoke<UsageSummary>("get_usage_summary", {
    prefix: payload.prefix,
    maxScanned: payload.maxScanned ?? null,
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

export async function transferToConnection(payload: {
  targetConnectionId: string;
  keys: string[];
  deleteSource: boolean;
}): Promise<number> {
  return invoke<number>("transfer_to_connection", {
    targetConnectionId: payload.targetConnectionId,
    keys: payload.keys,
    deleteSource: payload.deleteSource,
  });
}

export async function compareBucketToConnection(payload: {
  targetConnectionId: string;
  prefix: string | null;
}): Promise<BucketDiffReport> {
  return invoke<BucketDiffReport>("compare_bucket_to_connection", {
    targetConnectionId: payload.targetConnectionId,
    prefix: payload.prefix,
  });
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
