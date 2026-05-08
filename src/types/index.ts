export interface ConnectionConfig {
  id: string;
  label: string;
  provider: string;
  endpoint: string;
  bucket: string;
  region: string | null;
  accessKeyId: string;
  credentialProfileId: string;
}

export interface ListBucketsCredentials {
  provider: string;
  endpoint: string;
  region: string | null;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface CredentialProfile {
  id: string;
  label: string;
  provider: string;
  endpoint: string;
  region: string | null;
  accessKeyId: string;
  connectionCount: number;
}

export interface ActivityEvent {
  id: string;
  timestampMillis: number;
  action: string;
  target: string;
  detail: string;
}

export interface DeletePreview {
  objectCount: number;
  totalSize: number;
  truncated: boolean;
  sampleKeys: string[];
}

export interface BulkAddConnectionsResult {
  added: ConnectionConfig[];
  skippedExisting: string[];
  failed: { bucket: string; error: string }[];
}

export interface LocalUploadItem {
  localPath: string;
  objectRelativeKey: string;
  size: number;
  modifiedMillis: number;
}

export interface BucketFile {
  key: string;
  size: number;
  lastModified: string;
  etag: string;
  isFolder: boolean;
}

export interface TransferProgressPayload {
  op: string;
  key: string;
  phase: string;
  transferred: number;
  total: number | null;
  message: string | null;
}

export interface FileVersion {
  versionId: string;
  lastModified: string;
  size: number;
  isLatest: boolean;
  etag: string;
}

export interface ObjectDetails {
  key: string;
  size: number;
  lastModified: string;
  etag: string;
  contentType: string;
  storageClass: string;
  cacheControl: string;
  metadata: Record<string, string>;
  versioningStatus: string;
}

export interface DuplicateNameGroup {
  name: string;
  objects: BucketFile[];
}

export interface CleanupReport {
  scanned: number;
  truncated: boolean;
  oldObjects: BucketFile[];
  largeObjects: BucketFile[];
  duplicateNameGroups: DuplicateNameGroup[];
  emptyFolderMarkers: BucketFile[];
  noncurrentVersions: FileVersion[];
}

export interface PrefixUsage {
  prefix: string;
  size: number;
  count: number;
}

export interface FileTypeUsage {
  fileType: string;
  size: number;
  count: number;
}

export interface UsageSummary {
  scanned: number;
  truncated: boolean;
  totalSize: number;
  objectCount: number;
  largestPrefixes: PrefixUsage[];
  fileTypes: FileTypeUsage[];
}
