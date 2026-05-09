import {
  collectUploadCandidates,
  objectExists,
  uploadFile,
  uploadOptimizedImage,
} from "./tauri";
import { joinObjectKey } from "./utils";
import { useUploadBatchStore } from "../store/uploadBatchStore";
import type { LocalUploadItem } from "../types";

export interface UploadBatchResult {
  completed: number;
  total: number;
  cancelled: boolean;
}

export type ConflictChoice = "replace" | "keepBoth" | "skip";
export type ConflictApplyMode = "once" | "all";

export interface UploadConflict {
  key: string;
  item: LocalUploadItem;
}

export interface UploadConflictResolution {
  choice: ConflictChoice;
  applyMode: ConflictApplyMode;
}

export interface UploadBatchOptions {
  onConflict?: (conflict: UploadConflict) => Promise<UploadConflictResolution>;
  skipConflictChecks?: boolean;
  optimizeImages?: boolean;
  imageMaxWidth?: number;
  imageQuality?: number;
  imageFormat?: "jpeg" | "webp";
}

function isImagePath(path: string): boolean {
  return /\.(png|jpe?g|webp)$/i.test(path);
}

function splitKey(key: string): { base: string; ext: string } {
  const slash = key.lastIndexOf("/");
  const dot = key.lastIndexOf(".");
  if (dot <= slash) {
    return { base: key, ext: "" };
  }
  return { base: key.slice(0, dot), ext: key.slice(dot) };
}

async function nextAvailableKey(key: string): Promise<string> {
  const { base, ext } = splitKey(key);
  for (let i = 1; i < 10_000; i++) {
    const candidate = `${base} (${i})${ext}`;
    if (!(await objectExists(candidate))) {
      return candidate;
    }
  }
  throw new Error("Could not find an available filename");
}

export async function runLocalUploadBatch(
  prefix: string,
  localPaths: string[],
  options: UploadBatchOptions = {},
): Promise<UploadBatchResult> {
  useUploadBatchStore.getState().resetCancel();
  const items = await collectUploadCandidates(localPaths);
  if (items.length === 0) {
    throw new Error("No files to upload");
  }
  let completed = 0;
  let applyAllChoice: ConflictChoice | null = null;
  for (const item of items) {
    if (useUploadBatchStore.getState().cancelRequested) {
      return { completed, total: items.length, cancelled: true };
    }
    let key = joinObjectKey(prefix, item.objectRelativeKey);
    if (!options.skipConflictChecks && await objectExists(key)) {
      const resolution: UploadConflictResolution | undefined =
        applyAllChoice != null
          ? { choice: applyAllChoice, applyMode: "all" as const }
          : await options.onConflict?.({ key, item });
      const choice: ConflictChoice = resolution?.choice ?? "replace";
      if (resolution?.applyMode === "all") {
        applyAllChoice = choice;
      }
      if (choice === "skip") {
        continue;
      }
      if (choice === "keepBoth") {
        key = await nextAvailableKey(key);
      }
    }
    if (options.optimizeImages === true && isImagePath(item.localPath)) {
      await uploadOptimizedImage({
        format: options.imageFormat ?? "webp",
        key,
        localPath: item.localPath,
        maxWidth: options.imageMaxWidth ?? 1600,
        quality: options.imageQuality ?? 82,
      });
    } else {
      await uploadFile(item.localPath, key);
    }
    completed++;
  }
  return { completed, total: items.length, cancelled: false };
}
