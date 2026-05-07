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
  uploadFile,
} from "../lib/tauri";
import { joinObjectKey, sanitizePathSegment } from "../lib/utils";
import { useBucketStore } from "../store/bucketStore";

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
    mutationFn: async (localPaths: string[]) => {
      for (const localPath of localPaths) {
        const base = localPath.split(/[/\\]/).pop() ?? "file";
        const key = joinObjectKey(prefix, base);
        await uploadFile(localPath, key);
      }
    },
    onSuccess: () => {
      invalidate();
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
