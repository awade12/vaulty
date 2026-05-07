import { collectUploadCandidates, uploadFile } from "./tauri";
import { joinObjectKey } from "./utils";
import { useUploadBatchStore } from "../store/uploadBatchStore";

export interface UploadBatchResult {
  completed: number;
  total: number;
  cancelled: boolean;
}

export async function runLocalUploadBatch(
  prefix: string,
  localPaths: string[],
): Promise<UploadBatchResult> {
  useUploadBatchStore.getState().resetCancel();
  const items = await collectUploadCandidates(localPaths);
  if (items.length === 0) {
    throw new Error("No files to upload");
  }
  let completed = 0;
  for (const item of items) {
    if (useUploadBatchStore.getState().cancelRequested) {
      return { completed, total: items.length, cancelled: true };
    }
    const key = joinObjectKey(prefix, item.objectRelativeKey);
    await uploadFile(item.localPath, key);
    completed++;
  }
  return { completed, total: items.length, cancelled: false };
}
