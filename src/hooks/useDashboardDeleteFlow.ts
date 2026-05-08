import { useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";

import type { PendingDelete } from "../dashboard/utils/deleteModalCopy";
import { previewDelete } from "../lib/tauri";
import {
  useBulkDeleteMutation,
  useDeleteFileMutation,
  useRecursiveDeleteMutation,
} from "./useBucketFileMutations";
import { folderConfirmToken, handleTauriError } from "../lib/utils";
import type { BucketFile } from "../types";
import type { DeletePreview } from "../types";

function singlePreview(file: BucketFile): DeletePreview {
  return {
    objectCount: 1,
    totalSize: file.size,
    truncated: false,
    sampleKeys: [file.key],
  };
}

interface UseDashboardDeleteFlowParams {
  prefix: string;
  selectedKeys: Set<string>;
  setSelectedKeys: Dispatch<SetStateAction<Set<string>>>;
}

export function useDashboardDeleteFlow({
  prefix,
  selectedKeys,
  setSelectedKeys,
}: UseDashboardDeleteFlowParams) {
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);

  const deleteMut = useDeleteFileMutation();
  const bulkDeleteMut = useBulkDeleteMutation();
  const recursiveDeleteMut = useRecursiveDeleteMutation();

  function handleDeleteRequest(file: BucketFile): void {
    setPendingDelete({ kind: "single", file, preview: singlePreview(file) });
  }

  function handleBulkDeleteRequest(): void {
    const keys = Array.from(selectedKeys);
    if (keys.length === 0) {
      return;
    }
    void loadBulkPreview(keys);
  }

  function handleBulkDeleteWithKeys(keys: string[]): void {
    if (keys.length === 0) {
      return;
    }
    void loadBulkPreview(keys);
  }

  function handleRecursiveRequestForPrefix(): void {
    if (prefix.trim().length === 0) {
      toast.error("Open a folder first");
      return;
    }
    const token = folderConfirmToken(prefix);
    void loadRecursivePreview(prefix, token);
  }

  function handleRecursiveRequestFolder(folder: BucketFile): void {
    const token = folderConfirmToken(folder.key);
    void loadRecursivePreview(folder.key, token);
  }

  async function loadBulkPreview(keys: string[]): Promise<void> {
    try {
      const preview = await previewDelete({ keys });
      setPendingDelete({ kind: "bulk", keys, preview });
    } catch (e) {
      toast.error(handleTauriError(e));
    }
  }

  async function loadRecursivePreview(
    recursivePrefix: string,
    token: string,
  ): Promise<void> {
    try {
      const preview = await previewDelete({ prefix: recursivePrefix });
      setPendingDelete({
        kind: "recursive",
        prefix: recursivePrefix,
        token,
        preview,
      });
    } catch (e) {
      toast.error(handleTauriError(e));
    }
  }

  function handleDeleteModalClose(): void {
    setPendingDelete(null);
  }

  function handleDeleteConfirmed(): void {
    if (pendingDelete == null) {
      return;
    }
    if (pendingDelete.kind === "single") {
      const deletedKey = pendingDelete.file.key;
      deleteMut.mutate(deletedKey, {
        onError: (e) => {
          toast.error(handleTauriError(e));
        },
        onSuccess: () => {
          toast.success("Deleted");
          setPendingDelete(null);
          setSelectedKeys((prev) => {
            const n = new Set(prev);
            n.delete(deletedKey);
            return n;
          });
        },
      });
      return;
    }
    if (pendingDelete.kind === "bulk") {
      const keys = pendingDelete.keys;
      bulkDeleteMut.mutate(keys, {
        onError: (e) => {
          toast.error(handleTauriError(e));
        },
        onSuccess: () => {
          toast.success(`Deleted ${keys.length} files`);
          setPendingDelete(null);
          setSelectedKeys(new Set());
        },
      });
      return;
    }
    const recursivePrefix = pendingDelete.prefix;
    recursiveDeleteMut.mutate(
      { prefix: recursivePrefix },
      {
        onError: (e) => {
          toast.error(handleTauriError(e));
        },
        onSuccess: (n) => {
          toast.success(`Deleted ${n} objects`);
          setPendingDelete(null);
          setSelectedKeys(new Set());
        },
      },
    );
  }

  const deleteBusy =
    deleteMut.isPending ||
    bulkDeleteMut.isPending ||
    recursiveDeleteMut.isPending;

  return {
    pendingDelete,
    bulkDeleteMut,
    recursiveDeleteMut,
    deleteBusy,
    handleDeleteRequest,
    handleBulkDeleteRequest,
    handleBulkDeleteWithKeys,
    handleRecursiveRequestForPrefix,
    handleRecursiveRequestFolder,
    handleDeleteModalClose,
    handleDeleteConfirmed,
  };
}
