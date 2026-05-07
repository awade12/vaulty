import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createFolder,
  deleteFile,
  deleteObjects,
  deletePrefixRecursive,
  downloadFile,
  duplicateObject,
  moveObject,
  openObject,
} from "../lib/tauri";
import { runLocalUploadBatch } from "../lib/uploadBatch";
import { joinObjectKey, sanitizePathSegment } from "../lib/utils";
import { useBucketStore } from "../store/bucketStore";
import { useUploadBatchStore } from "../store/uploadBatchStore";

function useInvalidateBucketList(): () => void {
  const queryClient = useQueryClient();
  const activeConnectionId = useBucketStore((s) => s.activeConnectionId);

  function invalidate(): void {
    if (activeConnectionId != null) {
      void queryClient.invalidateQueries({
        queryKey: ["bucket-files", activeConnectionId],
      });
    }
  }

  return invalidate;
}

export function useUploadFilesMutation(prefix: string) {
  const invalidate = useInvalidateBucketList();

  return useMutation({
    // The mutation closes over `prefix` as the default upload target, but
    // callers can pass a string `targetPrefix` to override (e.g. when
    // dropping files onto a specific folder).
    mutationFn: (input: string[] | { paths: string[]; targetPrefix: string }) => {
      const paths = Array.isArray(input) ? input : input.paths;
      const target = Array.isArray(input) ? prefix : input.targetPrefix;
      return runLocalUploadBatch(target, paths);
    },
    onSuccess: () => {
      invalidate();
    },
    onSettled: () => {
      useUploadBatchStore.getState().resetCancel();
    },
  });
}

export function useDeleteFileMutation() {
  const invalidate = useInvalidateBucketList();

  return useMutation({
    mutationFn: (key: string) => deleteFile(key),
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useDownloadFileMutation() {
  return useMutation({
    mutationFn: (payload: { key: string; destPath: string }) =>
      downloadFile(payload.key, payload.destPath),
  });
}

export function useMoveObjectMutation() {
  const invalidate = useInvalidateBucketList();
  return useMutation({
    mutationFn: (p: { fromKey: string; toKey: string }) =>
      moveObject(p.fromKey, p.toKey),
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useBulkDeleteMutation() {
  const invalidate = useInvalidateBucketList();
  return useMutation({
    mutationFn: (keys: string[]) => deleteObjects(keys),
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useRecursiveDeleteMutation() {
  const invalidate = useInvalidateBucketList();
  return useMutation({
    mutationFn: (p: { prefix: string; maxKeys?: number }) =>
      deletePrefixRecursive(p.prefix, p.maxKeys),
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useOpenObjectMutation() {
  return useMutation({
    mutationFn: (key: string) => openObject(key),
  });
}

export function useDuplicateObjectMutation() {
  const invalidate = useInvalidateBucketList();
  return useMutation({
    mutationFn: (key: string) => duplicateObject(key),
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useCreateFolderMutation(prefix: string) {
  const invalidate = useInvalidateBucketList();

  return useMutation({
    mutationFn: async (rawName: string) => {
      const seg = sanitizePathSegment(rawName);
      if (seg.length === 0) {
        throw new Error("Enter a folder name");
      }
      const key = `${joinObjectKey(prefix, seg)}/`;
      await createFolder(key);
    },
    onSuccess: () => {
      invalidate();
    },
  });
}
