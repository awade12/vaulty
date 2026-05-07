import { join } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";

import {
  useCreateFolderMutation,
  useDownloadFileMutation,
  useDuplicateObjectMutation,
  useMoveObjectMutation,
  useOpenObjectMutation,
  useUploadFilesMutation,
} from "./useBucketFileMutations";
import { useDashboardDeleteFlow } from "./useDashboardDeleteFlow";
import { useDashboardFileDrop } from "./useDashboardFileDrop";
import {
  resolveBulkDownloadFolder,
  resolveFileDownloadPath,
  resolveZipSavePath,
} from "../lib/downloadDestination";
import { downloadAsZip, getPresignedUrl } from "../lib/tauri";
import { basenameKey, handleTauriError } from "../lib/utils";
import { useUploadBatchStore } from "../store/uploadBatchStore";
import type { BucketFile } from "../types";

interface UseDashboardFileCommandsParams {
  prefix: string;
  selectedKeys: Set<string>;
  setSelectedKeys: Dispatch<SetStateAction<Set<string>>>;
  activeConnectionId: string | null;
  sessionReady: boolean;
}

export function useDashboardFileCommands({
  prefix,
  selectedKeys,
  setSelectedKeys,
  activeConnectionId,
  sessionReady,
}: UseDashboardFileCommandsParams) {
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<BucketFile | null>(null);

  const del = useDashboardDeleteFlow({ prefix, selectedKeys, setSelectedKeys });

  const uploadMut = useUploadFilesMutation(prefix);
  const downloadMut = useDownloadFileMutation();
  const createFolderMut = useCreateFolderMutation(prefix);
  const moveMut = useMoveObjectMutation();
  const openMut = useOpenObjectMutation();
  const duplicateMut = useDuplicateObjectMutation();

  const handlePathsDropped = useCallback(
    (paths: string[], targetFolderKey: string | null) => {
      if (paths.length === 0) {
        return;
      }
      // If the user dropped on a specific folder card, upload into that
      // folder (its key already ends with `/`); otherwise upload to the
      // current prefix.
      const target = targetFolderKey ?? prefix;
      const folderName =
        targetFolderKey != null
          ? targetFolderKey.replace(/\/+$/, "").split("/").pop() ?? "folder"
          : null;
      uploadMut.mutate(
        { paths, targetPrefix: target },
        {
          onError: (e) => {
            toast.error(handleTauriError(e));
          },
          onSuccess: (result) => {
            if (result.cancelled) {
              toast.warning(
                `Stopped · uploaded ${result.completed} of ${result.total}`,
              );
            } else {
              const verb =
                result.completed === 1 ? "File uploaded" : `Uploaded ${result.completed} files`;
              toast.success(folderName != null ? `${verb} into ${folderName}/` : verb);
            }
          },
        },
      );
    },
    [uploadMut, prefix],
  );

  useDashboardFileDrop({
    enabled: activeConnectionId != null && sessionReady,
    onPathsDropped: handlePathsDropped,
  });

  async function handleUploadClick(): Promise<void> {
    const selected = await open({ multiple: true });
    if (selected == null) {
      return;
    }
    const paths = Array.isArray(selected) ? selected : [selected];
    uploadMut.mutate(paths, {
      onError: (e) => {
        toast.error(handleTauriError(e));
      },
      onSuccess: (result) => {
        if (result.cancelled) {
          toast.warning(`Stopped · uploaded ${result.completed} of ${result.total}`);
        } else {
          toast.success(
            result.completed === 1 ? "File uploaded" : `Uploaded ${result.completed} files`,
          );
        }
      },
    });
  }

  async function handleUploadFolderClick(): Promise<void> {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Upload folder",
    });
    if (selected == null) {
      return;
    }
    const folder = Array.isArray(selected) ? selected[0] ?? null : selected;
    if (folder == null) {
      return;
    }
    uploadMut.mutate([folder], {
      onError: (e) => {
        toast.error(handleTauriError(e));
      },
      onSuccess: (result) => {
        if (result.cancelled) {
          toast.warning(`Stopped · uploaded ${result.completed} of ${result.total}`);
        } else {
          toast.success(
            result.completed === 1 ? "File uploaded" : `Uploaded ${result.completed} files`,
          );
        }
      },
    });
  }

  function handleCancelUploadBatch(): void {
    if (uploadMut.isPending) {
      useUploadBatchStore.getState().requestCancel();
    }
  }

  function handleNewFolderClick(): void {
    setFolderModalOpen(true);
  }

  function handleFolderModalClose(): void {
    setFolderModalOpen(false);
  }

  function handleFolderCreate(name: string): void {
    createFolderMut.mutate(name, {
      onError: (e) => {
        toast.error(handleTauriError(e));
      },
      onSuccess: () => {
        toast.success("Folder created");
        setFolderModalOpen(false);
      },
    });
  }

  async function handleDownloadFile(file: BucketFile): Promise<void> {
    const dest = await resolveFileDownloadPath(basenameKey(file.key));
    if (dest == null) {
      return;
    }
    downloadMut.mutate(
      { destPath: dest, key: file.key },
      {
        onError: (e) => {
          toast.error(handleTauriError(e));
        },
        onSuccess: () => {
          toast.success("Saved to disk");
        },
      },
    );
  }

  function handleOpenFile(file: BucketFile): void {
    openMut.mutate(file.key, {
      onError: (e) => {
        toast.error(handleTauriError(e));
      },
    });
  }

  function handleRenameRequest(file: BucketFile): void {
    setRenameTarget(file);
  }

  function handleRenameModalClose(): void {
    setRenameTarget(null);
  }

  function handleRenameSubmit(newName: string): void {
    if (renameTarget == null) {
      return;
    }
    const leaf = newName.trim();
    if (leaf.length === 0) {
      toast.error("Invalid name");
      return;
    }
    const parentBase = prefix.replace(/\/+$/, "");
    const toKey =
      parentBase.length === 0 ? leaf : `${parentBase}/${leaf}`;
    moveMut.mutate(
      { fromKey: renameTarget.key, toKey },
      {
        onError: (e) => {
          toast.error(handleTauriError(e));
        },
        onSuccess: () => {
          toast.success("Renamed");
          setRenameTarget(null);
        },
      },
    );
  }

  async function handleCopyLink(file: BucketFile): Promise<void> {
    try {
      const url = await getPresignedUrl(file.key);
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch (e) {
      toast.error(handleTauriError(e));
    }
  }

  function handleMoveFile(fromKey: string, toFolderKey: string): void {
    const filename = basenameKey(fromKey);
    const targetFolder = toFolderKey.replace(/\/+$/, "");
    const toKey = `${targetFolder}/${filename}`;
    moveMut.mutate(
      { fromKey, toKey },
      {
        onError: (e) => {
          toast.error(handleTauriError(e));
        },
        onSuccess: () => {
          toast.success("File moved");
        },
      },
    );
  }

  async function handleBulkDownload(keys: string[]): Promise<void> {
    const fileKeys = keys.filter((k) => !k.endsWith("/"));
    if (fileKeys.length === 0) {
      return;
    }
    const folder = await resolveBulkDownloadFolder();
    if (folder == null) {
      return;
    }
    for (const key of fileKeys) {
      const filename = basenameKey(key);
      const destPath = await join(folder, filename);
      downloadMut.mutate(
        { destPath, key },
        {
          onError: (e) => {
            toast.error(`Failed ${filename}: ${handleTauriError(e)}`);
          },
        },
      );
    }
    toast.success(`Queued ${fileKeys.length} downloads`);
    setSelectedKeys(new Set());
  }

  function handleBulkDelete(keys: string[]): void {
    del.handleBulkDeleteWithKeys(keys);
  }

  function handleDuplicateFile(file: BucketFile): void {
    if (file.isFolder) return;
    duplicateMut.mutate(file.key, {
      onError: (e) => {
        toast.error(handleTauriError(e));
      },
      onSuccess: () => {
        toast.success("File duplicated");
      },
    });
  }

  async function handleZipDownload(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    const dest = await resolveZipSavePath("vaulty-selection.zip");
    if (dest == null) return;
    
    try {
      await downloadAsZip(keys, dest);
      toast.success(`Downloaded ${keys.length} files as ZIP`);
      setSelectedKeys(new Set());
    } catch (e) {
      toast.error(handleTauriError(e));
    }
  }

  const isRowActionPending =
    uploadMut.isPending ||
    downloadMut.isPending ||
    createFolderMut.isPending ||
    moveMut.isPending ||
    openMut.isPending ||
    duplicateMut.isPending ||
    del.deleteBusy;

  return {
    folderModalOpen,
    renameTarget,
    pendingDelete: del.pendingDelete,
    uploadMut,
    createFolderMut,
    moveMut,
    bulkDeleteMut: del.bulkDeleteMut,
    recursiveDeleteMut: del.recursiveDeleteMut,
    isRowActionPending,
    deleteBusy: del.deleteBusy,
    handleUploadClick,
    handleCancelUploadBatch,
    handleUploadFolderClick,
    handleNewFolderClick,
    handleFolderModalClose,
    handleFolderCreate,
    handleDownloadFile,
    handleDeleteRequest: del.handleDeleteRequest,
    handleBulkDeleteRequest: del.handleBulkDeleteRequest,
    handleRecursiveRequestForPrefix: del.handleRecursiveRequestForPrefix,
    handleRecursiveRequestFolder: del.handleRecursiveRequestFolder,
    handleDeleteModalClose: del.handleDeleteModalClose,
    handleDeleteConfirmed: del.handleDeleteConfirmed,
    handleOpenFile,
    handleRenameRequest,
    handleRenameModalClose,
    handleRenameSubmit,
    handleCopyLink,
    handleMoveFile,
    handleBulkDownload,
    handleBulkDelete,
    handleDuplicateFile,
    handleZipDownload,
  };
}
