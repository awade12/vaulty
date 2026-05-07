export function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0 B";
  }
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    sizes.length - 1,
  );
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

export function handleTauriError(error: unknown): string {
  const raw =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : "Unexpected error";
  return friendlyS3Error(raw);
}

// Map common AWS / S3 SDK error fragments to human language. We match on
// substrings that show up in the SDK's stringified errors so this works
// regardless of whether the error came back as `S3 error: ...` or raw.
const S3_ERROR_RULES: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /InvalidAccessKeyId/i,
    message:
      "That access key wasn't recognized. Double-check it didn't get truncated when pasting.",
  },
  {
    pattern: /SignatureDoesNotMatch/i,
    message:
      "The secret access key doesn't match this access key. Re-paste the secret to be sure.",
  },
  {
    pattern: /AccessDenied|Forbidden|403/i,
    message:
      "Access denied. Your credentials are valid but don't have permission for this bucket or object.",
  },
  {
    pattern: /NoSuchBucket/i,
    message:
      "That bucket doesn't exist (or your credentials can't see it). Check the bucket name and the endpoint.",
  },
  {
    pattern: /NoSuchKey|key does not exist/i,
    message: "That object doesn't exist (it may have just been deleted).",
  },
  {
    pattern: /BucketAlreadyExists|BucketAlreadyOwnedByYou/i,
    message: "A bucket with that name already exists.",
  },
  {
    pattern: /RequestTimeTooSkewed/i,
    message:
      "Your computer's clock is too far off from the server. Sync your system time and try again.",
  },
  {
    pattern: /InvalidBucketName/i,
    message:
      "Bucket name is invalid (must be 3–63 chars, lowercase, no underscores or spaces).",
  },
  {
    pattern: /SlowDown|TooManyRequests|429/i,
    message:
      "The provider is rate-limiting requests. Wait a few seconds and try again.",
  },
  {
    pattern: /EntityTooLarge/i,
    message:
      "The file exceeds this provider's single-object size limit. Try splitting it.",
  },
  {
    pattern: /dispatch failure|dns error|name resolution failed/i,
    message:
      "Couldn't reach the endpoint. Check your internet connection and that the endpoint URL is correct.",
  },
  {
    pattern: /tls handshake|certificate/i,
    message:
      "TLS error connecting to the endpoint. The hostname or certificate may be misconfigured.",
  },
  {
    pattern: /timed? out|timeout/i,
    message: "The request timed out. The connection or server is slow.",
  },
  {
    pattern: /Read-only file system|os error 30/i,
    message:
      "Couldn't write to disk because the location is read-only. On macOS, drag Vaulty.app from the DMG into /Applications first.",
  },
  {
    pattern: /No active connection/i,
    message: "No bucket selected yet — pick one from Settings to get started.",
  },
];

export function friendlyS3Error(raw: string): string {
  for (const rule of S3_ERROR_RULES) {
    if (rule.pattern.test(raw)) {
      return rule.message;
    }
  }
  return raw;
}

export function displayNameForKey(key: string, prefix: string): string {
  const rest = key.startsWith(prefix) ? key.slice(prefix.length) : key;
  const trimmed = rest.replace(/\/$/, "");
  return trimmed || key;
}

export function joinPrefix(parts: string[]): string {
  if (parts.length === 0) {
    return "";
  }
  return `${parts.map((p) => p.replace(/\/+$/, "")).join("/")}/`;
}

export function joinObjectKey(prefix: string, name: string): string {
  const base = prefix.replace(/\/+$/, "");
  const leaf = name.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!leaf) {
    return base;
  }
  return base.length > 0 ? `${base}/${leaf}` : leaf;
}

export function sanitizePathSegment(name: string): string {
  return name
    .trim()
    .replace(/\\/g, "")
    .replace(/\//g, "")
    .replace(/\.\./g, "")
    .replace(/[/\\:*?"<>|]/g, "");
}

export function basenameKey(key: string): string {
  const trimmed = key.replace(/\/+$/, "");
  const i = trimmed.lastIndexOf("/");
  return i === -1 ? trimmed : trimmed.slice(i + 1);
}

export function transferDisplayLabel(objectKey: string): string {
  const trimmed = objectKey.replace(/\/+$/, "");
  const parts = trimmed.split("/").filter((s) => s.length > 0);
  if (parts.length === 0) {
    return trimmed;
  }
  if (parts.length === 1) {
    return parts[0]!;
  }
  const parent = parts[parts.length - 2]!;
  const leaf = parts[parts.length - 1]!;
  return `${parent}/${leaf}`;
}

export function folderConfirmToken(prefix: string): string {
  const trimmed = prefix.replace(/\/+$/, "");
  const seg = trimmed.split("/").pop() ?? "";
  return seg.length > 0 ? seg : "ROOT";
}

export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}
