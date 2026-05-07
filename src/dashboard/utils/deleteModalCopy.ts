import { displayNameForKey } from "../../lib/utils";
import type { BucketFile } from "../../types";

export type PendingDelete =
  | { kind: "single"; file: BucketFile }
  | { kind: "bulk"; keys: string[] }
  | { kind: "recursive"; prefix: string; token: string }
  | null;

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
      body: `Permanently delete "${displayNameForKey(pending.file.key, listPrefix)}"? This cannot be undone.`,
      confirmLabel: "Delete file",
      requireMatch: null,
    };
  }
  if (pending?.kind === "bulk") {
    return {
      title: "Delete selected files",
      body: `Permanently delete ${pending.keys.length} file(s)? This cannot be undone.`,
      confirmLabel: "Delete all",
      requireMatch: pending.keys.length >= 3 ? "DELETE" : null,
    };
  }
  if (pending?.kind === "recursive") {
    return {
      title: "Delete folder contents",
      body:
        "Permanently delete every object under this prefix. This cannot be undone. Large folders are capped at 10,000 objects per run.",
      confirmLabel: "Delete everything",
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
