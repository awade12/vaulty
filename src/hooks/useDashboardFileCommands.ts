import { open, save } from "@tauri-apps/plugin-dialog";
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
import { downloadAsZip, getPresignedUrl } from "../lib/tauri";
import { basenameKey, handleTauriError } from "../lib/utils";
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
    (paths: string[]) => {
      if (paths.length === 0) {
        return;
      }
      uploadMut.mutate(paths, {
        onError: (e) => {
          toast.error(handleTauriError(e));
        },
        onSuccess: () => {
          toast.success(
            paths.length === 1 ? "File uploaded" : "Uploaded files",
          );
        },
      });
    },
    [uploadMut],
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
      onSuccess: () => {
        toast.success(
          paths.length === 1 ? "File uploaded" : `Uploaded ${paths.length} files`,
        );
      },
    });
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
    const defaultPath = basenameKey(file.key);
    const dest = await save({
      defaultPath: defaultPath.length > 0 ? defaultPath : "download",
    });
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
    if (keys.length === 0) return;
    
    for (const key of keys) {
      const filename = basenameKey(key);
      const dest = await save({
        defaultPath: filename.length > 0 ? filename : "download",
      });
      if (dest == null) continue;
      
      downloadMut.mutate(
        { destPath: dest, key },
        {
          onError: (e) => {
            toast.error(`Failed to download ${filename}: ${handleTauriError(e)}`);
          },
        },
      );
    }
    toast.success(`Downloading ${keys.length} files`);
    setSelectedKeys(new Set());
  }

  function handleBulkDelete(keys: string[]): void {
    del.handleBulkDeleteRequest(keys);
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
    
    const dest = await save({
      defaultPath: "files.zip",
      filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
    });
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
