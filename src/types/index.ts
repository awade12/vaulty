export interface ConnectionConfig {
  id: string;
  label: string;
  provider: string;
  endpoint: string;
  bucket: string;
  region: string | null;
  accessKeyId: string;
}

export interface ListBucketsCredentials {
  provider: string;
  endpoint: string;
  region: string | null;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface BulkAddConnectionsResult {
  added: ConnectionConfig[];
  skippedExisting: string[];
  failed: { bucket: string; error: string }[];
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
