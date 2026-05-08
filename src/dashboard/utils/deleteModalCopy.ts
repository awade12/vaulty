import { displayNameForKey, formatBytes } from "../../lib/utils";
import type { BucketFile, DeletePreview } from "../../types";

export type PendingDelete =
  | { kind: "single"; file: BucketFile; preview: DeletePreview }
  | { kind: "bulk"; keys: string[]; preview: DeletePreview }
  | { kind: "recursive"; prefix: string; token: string; preview: DeletePreview }
  | null;

function previewText(preview: DeletePreview): string {
  const size =
    preview.totalSize > 0 ? ` · ${formatBytes(preview.totalSize)}` : "";
  const cap = preview.truncated ? " Preview hit the 10,000 object cap." : "";
  const sample =
    preview.sampleKeys.length > 0
      ? ` Sample: ${preview.sampleKeys.slice(0, 3).join(", ")}`
      : "";
  return `Dry run found ${preview.objectCount.toLocaleString()} object(s)${size}.${cap}${sample}`;
}

export function deleteModalCopy(
  pending: PendingDelete,
  listPrefix: string,
): {
  title: string;
  body: string;
  confirmLabel: string;
  requireMatch: string | null;
} {
  if (pending?.kind === "single") {
    return {
      title: "Delete file",
      body: `Permanently delete "${displayNameForKey(pending.file.key, listPrefix)}"? ${previewText(pending.preview)} This cannot be undone.`,
      confirmLabel: "Delete file",
      requireMatch: null,
    };
  }
  if (pending?.kind === "bulk") {
    return {
      title: "Delete selected files",
      body: `Permanently delete ${pending.keys.length} file(s)? ${previewText(pending.preview)} This cannot be undone.`,
      confirmLabel: "Delete all",
      requireMatch: pending.keys.length >= 3 ? "DELETE" : null,
    };
  }
  if (pending?.kind === "recursive") {
    return {
      title: "Delete folder",
      body:
        `Permanently delete this folder and every object under it? ${previewText(pending.preview)} This cannot be undone.`,
      confirmLabel: "Delete folder",
      requireMatch: pending.token,
    };
  }
  return {
    title: "",
    body: "",
    confirmLabel: "Delete",
    requireMatch: null,
  };
}
