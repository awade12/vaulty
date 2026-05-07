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
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unexpected error";
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
