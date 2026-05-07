import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type MouseEvent } from "react";

import { clsx } from "clsx";

import { displayNameForKey, formatBytes, formatRelativeTime } from "../../lib/utils";
import { useBucketStore, type ViewMode } from "../../store/bucketStore";
import type { BucketFile } from "../../types";
import EmptyStateIllustration from "./EmptyStateIllustration";
import FileContextMenu from "./FileContextMenu";
import FileThumbnail from "./FileThumbnail";
import QuickPreview from "./QuickPreview";

function StarIcon({ className, filled }: { className?: string; filled?: boolean }) {
  if (filled) {
    return (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

function ArchiveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
    </svg>
  );
}

interface FileItemProps {
  file: BucketFile;
  prefix: string;
  focused: boolean;
  isStarred: boolean;
  isSelected: boolean;
  isSelectionMode: boolean;
  viewMode: ViewMode;
  isDragOver: boolean;
  childCount?: number;
  onOpen: () => void;
  onSelect: (e: MouseEvent) => void;
  onContextMenu: (position: { x: number; y: number }) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onToggleStar: () => void;
}

function FileItem({
  file,
  prefix,
  focused,
  isStarred,
  isSelected,
  isSelectionMode,
  viewMode,
  isDragOver,
  childCount,
  onOpen,
  onSelect,
  onContextMenu,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onToggleStar,
}: FileItemProps) {
  const name = displayNameForKey(file.key, prefix);

  function handleClick(e: MouseEvent) {
    e.stopPropagation();
    if (e.metaKey || e.ctrlKey || e.shiftKey || isSelectionMode) {
      onSelect(e);
    } else {
      onOpen();
    }
  }

  function handleCheckboxClick(e: MouseEvent) {
    e.stopPropagation();
    onSelect(e);
  }

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu({ x: e.clientX, y: e.clientY });
  }

  function handleDragStart(e: DragEvent) {
    e.dataTransfer.setData("text/plain", file.key);
    e.dataTransfer.effectAllowed = "move";
    onDragStart();
  }

  function handleDragOver(e: DragEvent) {
    if (file.isFolder) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      onDragOver();
    }
  }

  function handleDragLeave() {
    onDragLeave();
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    onDrop();
  }

  function handleStarClick(e: MouseEvent) {
    e.stopPropagation();
    onToggleStar();
  }

  if (viewMode === "list") {
    return (
      <div
        className={clsx(
          "group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-zinc-50",
          focused && "ring-2 ring-accent-700",
          isDragOver && file.isFolder && "bg-accent-100 ring-2 ring-accent-400",
          isSelected && "bg-accent-50"
        )}
        draggable={!file.isFolder}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onDragEnd={onDragEnd}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
        onDrop={handleDrop}
      >
        <button
          className={clsx(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded border-[0.5px] transition-colors",
            isSelected
              ? "border-accent-700 bg-accent-700 text-white"
              : "border-zinc-300 bg-white opacity-0 group-hover:opacity-100",
            isSelectionMode && "opacity-100"
          )}
          onClick={handleCheckboxClick}
          type="button"
        >
          {isSelected && <CheckIcon className="h-3 w-3" />}
        </button>
        <FileThumbnail fileKey={file.key} filename={name} isFolder={file.isFolder} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm text-zinc-900">{name}</p>
            {isStarred && <StarIcon className="h-3 w-3 shrink-0 text-amber-400" filled />}
            {file.isFolder && childCount !== undefined && childCount > 0 && (
              <span className="shrink-0 rounded bg-accent-50 px-1.5 py-0.5 text-[10px] font-medium text-accent-700">
                {childCount} {childCount === 1 ? "item" : "items"}
              </span>
            )}
          </div>
          {!file.isFolder && (
            <p className="text-[11px] text-zinc-400">
              {formatBytes(file.size)} · {formatRelativeTime(file.lastModified)}
            </p>
          )}
        </div>
        <button
          className={clsx(
            "rounded p-1 opacity-0 transition-all group-hover:opacity-100",
            isStarred ? "text-amber-400 hover:text-amber-500" : "text-zinc-300 hover:text-amber-400"
          )}
          onClick={handleStarClick}
          type="button"
        >
          <StarIcon className="h-4 w-4" filled={isStarred} />
        </button>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "group relative flex cursor-pointer flex-col items-center rounded-xl p-3 hover:bg-zinc-50",
        focused && "ring-2 ring-accent-700",
        isDragOver && file.isFolder && "bg-accent-100 ring-2 ring-accent-400",
        isSelected && "bg-accent-50 ring-2 ring-accent-200"
      )}
      draggable={!file.isFolder}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onDragEnd={onDragEnd}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDragStart={handleDragStart}
      onDrop={handleDrop}
    >
      <button
        className={clsx(
          "absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded border-[0.5px] transition-colors",
          isSelected
            ? "border-accent-700 bg-accent-700 text-white"
            : "border-zinc-300 bg-white opacity-0 group-hover:opacity-100",
          isSelectionMode && "opacity-100"
        )}
        onClick={handleCheckboxClick}
        type="button"
      >
        {isSelected && <CheckIcon className="h-3 w-3" />}
      </button>
      {isStarred && (
        <div className="absolute right-2 top-2">
          <StarIcon className="h-3.5 w-3.5 text-amber-400" filled />
        </div>
      )}
      <div className="mb-2">
        <FileThumbnail fileKey={file.key} filename={name} isFolder={file.isFolder} size="lg" />
      </div>
      <span className="w-full truncate text-center text-xs font-medium text-zinc-900">{name}</span>
      {file.isFolder && childCount !== undefined && childCount > 0 ? (
        <span className="mt-1 rounded bg-accent-50 px-1.5 py-0.5 text-[10px] font-medium text-accent-700">
          {childCount} {childCount === 1 ? "item" : "items"}
        </span>
      ) : !file.isFolder ? (
        <span className="mt-0.5 text-[10px] text-zinc-400">{formatBytes(file.size)}</span>
      ) : null}
      <button
        className={clsx(
          "absolute bottom-2 right-2 rounded p-1 opacity-0 transition-all group-hover:opacity-100",
          isStarred ? "text-amber-400 hover:text-amber-500" : "text-zinc-300 hover:text-amber-400"
        )}
        onClick={handleStarClick}
        type="button"
      >
        <StarIcon className="h-3.5 w-3.5" filled={isStarred} />
      </button>
    </div>
  );
}

interface FileGridProps {
  files: BucketFile[];
  prefix: string;
  isLoading: boolean;
  errorMessage: string | null;
  selectedKeys: Set<string>;
  onOpenFolder: (key: string) => void;
  onDownloadFile?: (file: BucketFile) => void;
  onDeleteFile?: (file: BucketFile) => void;
  onCopyLink?: (file: BucketFile) => void;
  onOpenFile?: (file: BucketFile) => void;
  onRenameFile?: (file: BucketFile) => void;
  onRecursiveDeleteFolder?: (file: BucketFile) => void;
  onMoveFile?: (fromKey: string, toFolder: string) => void;
  onToggleSelect?: (key: string) => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  onBulkDelete?: (keys: string[]) => void;
  onBulkDownload?: (keys: string[]) => void;
  onDuplicateFile?: (file: BucketFile) => void;
  onShowVersions?: (file: BucketFile) => void;
  onZipDownload?: (keys: string[]) => void;
  isActionPending?: boolean;
}

export default function FileGrid({
  files,
  prefix,
  isLoading,
  errorMessage,
  selectedKeys,
  onOpenFolder,
  onDownloadFile,
  onDeleteFile,
  onCopyLink,
  onOpenFile,
  onRenameFile,
  onRecursiveDeleteFolder,
  onMoveFile,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onBulkDelete,
  onBulkDownload,
  onDuplicateFile,
  onShowVersions,
  onZipDownload,
  isActionPending,
}: FileGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{ file: BucketFile; position: { x: number; y: number } } | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [dropZoneActive, setDropZoneActive] = useState(false);
  const [previewFile, setPreviewFile] = useState<BucketFile | null>(null);
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShowSpinner(false);
      return;
    }
    const timer = setTimeout(() => setShowSpinner(true), 150);
    return () => clearTimeout(timer);
  }, [isLoading]);

  const viewMode = useBucketStore((s) => s.viewMode);
  const starredKeys = useBucketStore((s) => s.starredKeys);
  const toggleStar = useBucketStore((s) => s.toggleStar);
  const recentFiles = useBucketStore((s) => s.recentFiles);
  const activeConnectionId = useBucketStore((s) => s.activeConnectionId);
  const addRecentFile = useBucketStore((s) => s.addRecentFile);

  const folders = files.filter((f) => f.isFolder);
  const regularFiles = files.filter((f) => !f.isFolder);
  const allItems = [...folders, ...regularFiles];

  const folderChildCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const folder of folders) {
      const folderPrefix = folder.key;
      counts[folder.key] = files.filter(
        (f) => f.key !== folderPrefix && f.key.startsWith(folderPrefix)
      ).length;
    }
    return counts;
  }, [files, folders]);

  const recentInCurrentBucket = recentFiles
    .filter((r) => r.connectionId === activeConnectionId)
    .map((r) => files.find((f) => f.key === r.key))
    .filter((f): f is BucketFile => f != null && !f.isFolder)
    .slice(0, 5);

  const starredInView = files.filter((f) => starredKeys.includes(f.key));
  const isSelectionMode = selectedKeys.size > 0;
  const lastClickedIndex = useRef<number>(-1);

  function handleFileSelect(file: BucketFile, e: MouseEvent) {
    if (!onToggleSelect) return;
    
    const fileIndex = allItems.findIndex((f) => f.key === file.key);
    
    if (e.shiftKey && lastClickedIndex.current >= 0) {
      const start = Math.min(lastClickedIndex.current, fileIndex);
      const end = Math.max(lastClickedIndex.current, fileIndex);
      for (let i = start; i <= end; i++) {
        if (!selectedKeys.has(allItems[i].key)) {
          onToggleSelect(allItems[i].key);
        }
      }
    } else {
      onToggleSelect(file.key);
    }
    
    lastClickedIndex.current = fileIndex;
  }

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (allItems.length === 0) return;

    const cols = viewMode === "grid" ? 6 : 1;

    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, allItems.length - 1));
        break;
      case "ArrowLeft":
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + cols, allItems.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - cols, 0));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < allItems.length) {
          const item = allItems[focusedIndex];
          if (item.isFolder) {
            onOpenFolder(item.key);
          } else {
            setPreviewFile(item);
            if (activeConnectionId) addRecentFile(item.key, activeConnectionId);
          }
        }
        break;
      case "Delete":
      case "Backspace":
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < allItems.length) {
          onDeleteFile?.(allItems[focusedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setPreviewFile(null);
        break;
    }
  }, [allItems, focusedIndex, viewMode, onOpenFolder, onDeleteFile, activeConnectionId, addRecentFile]);

  useEffect(() => {
    setFocusedIndex(-1);
  }, [prefix]);

  function handleContainerClick() {
    setContextMenu(null);
  }

  function handleFileDrop(targetFolderKey: string) {
    if (draggingKey && draggingKey !== targetFolderKey && onMoveFile) {
      onMoveFile(draggingKey, targetFolderKey);
    }
    setDraggingKey(null);
    setDragOverKey(null);
  }

  function handleContainerDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDropZoneActive(true);
  }

  function handleContainerDragLeave(e: DragEvent<HTMLDivElement>) {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setDropZoneActive(false);
    }
  }

  function handleContainerDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDropZoneActive(false);
  }

  function handleOpenFile(file: BucketFile) {
    if (activeConnectionId) {
      addRecentFile(file.key, activeConnectionId);
    }
    setPreviewFile(file);
  }

  if (errorMessage) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
          <AlertIcon className="h-6 w-6 text-red-500" />
        </div>
        <p className="text-sm font-medium text-zinc-900">Something went wrong</p>
        <p className="mt-1 max-w-xs text-center text-xs text-zinc-400">{errorMessage}</p>
      </div>
    );
  }

  if (isLoading && showSpinner) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-[3px] border-zinc-200 border-t-accent-700" />
        <p className="text-sm text-zinc-400">Loading files…</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex-1" />;
  }

  if (files.length === 0) {
    return (
      <div
        className={clsx(
          "flex flex-1 flex-col items-center justify-center",
          dropZoneActive && "bg-accent-50 ring-2 ring-inset ring-accent-300"
        )}
        onDragLeave={handleContainerDragLeave}
        onDragOver={handleContainerDragOver}
        onDrop={handleContainerDrop}
      >
        <EmptyStateIllustration className="mb-6 h-40 w-auto" />
        <p className="text-sm font-medium text-zinc-900">No files yet</p>
        <p className="mt-1 text-xs text-zinc-400">Drag and drop files here or click Upload to get started</p>
        {dropZoneActive && (
          <div className="mt-4 rounded-lg bg-accent-100 px-4 py-2 text-sm font-medium text-accent-700">
            Drop files to upload
          </div>
        )}
      </div>
    );
  }

  const selectedFiles = files.filter((f) => selectedKeys.has(f.key));
  const selectedSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
      {isSelectionMode && (
        <div className="flex shrink-0 items-center gap-3 border-b border-[0.5px] border-zinc-200 bg-accent-50 px-4 py-2">
          <span className="text-sm font-medium text-accent-700">
            {selectedKeys.size} selected
          </span>
          <span className="text-xs text-accent-600">
            ({formatBytes(selectedSize)})
          </span>
          <div className="flex-1" />
          <button
            className="rounded-lg px-3 py-1.5 text-xs text-zinc-600 hover:bg-white"
            onClick={onSelectAll}
            type="button"
          >
            Select all
          </button>
          {onBulkDownload && (
            <button
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              onClick={() => onBulkDownload(Array.from(selectedKeys))}
              type="button"
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              Download
            </button>
          )}
          {onZipDownload && selectedKeys.size > 1 && (
            <button
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              onClick={() => onZipDownload(Array.from(selectedKeys))}
              type="button"
            >
              <ArchiveIcon className="h-3.5 w-3.5" />
              Download ZIP
            </button>
          )}
          {onBulkDelete && (
            <button
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs text-red-500 hover:bg-red-50"
              onClick={() => onBulkDelete(Array.from(selectedKeys))}
              type="button"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              Delete
            </button>
          )}
          <button
            className="rounded-lg px-3 py-1.5 text-xs text-zinc-500 hover:bg-white hover:text-zinc-700"
            onClick={onClearSelection}
            type="button"
          >
            Cancel
          </button>
        </div>
      )}
      <div
        ref={containerRef}
        className={clsx(
          "flex flex-1 flex-col overflow-auto p-4 outline-none",
          dropZoneActive && "bg-accent-50/50 ring-2 ring-inset ring-accent-300"
        )}
        onClick={handleContainerClick}
        onDragLeave={handleContainerDragLeave}
        onDragOver={handleContainerDragOver}
        onDrop={handleContainerDrop}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >

        {recentInCurrentBucket.length > 0 && prefix === "" && (
          <div className="mb-6">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-zinc-400">Recent</p>
            <div className={viewMode === "grid" 
              ? "grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
              : "flex flex-col gap-1"
            }>
              {recentInCurrentBucket.map((file) => (
                <FileItem
                  file={file}
                  focused={false}
                  isDragOver={false}
                  isSelected={selectedKeys.has(file.key)}
                  isSelectionMode={isSelectionMode}
                  isStarred={starredKeys.includes(file.key)}
                  key={`recent-${file.key}`}
                  onContextMenu={(pos) => setContextMenu({ file, position: pos })}
                  onDragEnd={() => setDraggingKey(null)}
                  onDragLeave={() => setDragOverKey(null)}
                  onDragOver={() => {}}
                  onDragStart={() => setDraggingKey(file.key)}
                  onDrop={() => {}}
                  onOpen={() => handleOpenFile(file)}
                  onSelect={(e) => handleFileSelect(file, e)}
                  onToggleStar={() => toggleStar(file.key)}
                  prefix={prefix}
                  viewMode={viewMode}
                />
              ))}
            </div>
          </div>
        )}

        {folders.length > 0 && (
          <div className="mb-6">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-zinc-400">Folders</p>
            <div className={viewMode === "grid" 
              ? "grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
              : "flex flex-col gap-1"
            }>
              {folders.map((file, i) => (
                <FileItem
                  childCount={folderChildCounts[file.key]}
                  file={file}
                  focused={focusedIndex === i}
                  isDragOver={dragOverKey === file.key}
                  isSelected={selectedKeys.has(file.key)}
                  isSelectionMode={isSelectionMode}
                  isStarred={starredKeys.includes(file.key)}
                  key={file.key}
                  onContextMenu={(pos) => setContextMenu({ file, position: pos })}
                  onDragEnd={() => setDraggingKey(null)}
                  onDragLeave={() => setDragOverKey(null)}
                  onDragOver={() => setDragOverKey(file.key)}
                  onDragStart={() => setDraggingKey(file.key)}
                  onDrop={() => handleFileDrop(file.key)}
                  onOpen={() => onOpenFolder(file.key)}
                  onSelect={(e) => handleFileSelect(file, e)}
                  onToggleStar={() => toggleStar(file.key)}
                  prefix={prefix}
                  viewMode={viewMode}
                />
              ))}
            </div>
          </div>
        )}

        {regularFiles.length > 0 && (
          <div>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-zinc-400">Files</p>
            <div className={viewMode === "grid" 
              ? "grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
              : "flex flex-col gap-1"
            }>
              {regularFiles.map((file, i) => (
                <FileItem
                  file={file}
                  focused={focusedIndex === folders.length + i}
                  isDragOver={false}
                  isSelected={selectedKeys.has(file.key)}
                  isSelectionMode={isSelectionMode}
                  isStarred={starredKeys.includes(file.key)}
                  key={file.key}
                  onContextMenu={(pos) => setContextMenu({ file, position: pos })}
                  onDragEnd={() => setDraggingKey(null)}
                  onDragLeave={() => {}}
                  onDragOver={() => {}}
                  onDragStart={() => setDraggingKey(file.key)}
                  onDrop={() => {}}
                  onOpen={() => handleOpenFile(file)}
                  onSelect={(e) => handleFileSelect(file, e)}
                  onToggleStar={() => toggleStar(file.key)}
                  prefix={prefix}
                  viewMode={viewMode}
                />
              ))}
            </div>
          </div>
        )}

        {contextMenu && (
          <FileContextMenu
            file={contextMenu.file}
            isActionPending={isActionPending}
            onClose={() => setContextMenu(null)}
            onCopyLink={onCopyLink}
            onDeleteFile={onDeleteFile}
            onDownloadFile={onDownloadFile}
            onDuplicateFile={onDuplicateFile}
            onOpenFile={(f) => handleOpenFile(f)}
            onOpenFolder={onOpenFolder}
            onShowVersions={onShowVersions}
            onRecursiveDeleteFolder={onRecursiveDeleteFolder}
            onRenameFile={onRenameFile}
            position={contextMenu.position}
          />
        )}

        {dropZoneActive && (
          <div className="pointer-events-none fixed inset-4 flex items-center justify-center rounded-2xl border-2 border-dashed border-accent-400 bg-accent-50/80">
            <div className="text-center">
              <p className="text-lg font-medium text-accent-700">Drop files to upload</p>
              <p className="mt-1 text-sm text-accent-600">Files will be uploaded to the current folder</p>
            </div>
          </div>
        )}
      </div>
      </div>

      {previewFile && (
        <QuickPreview
          file={previewFile}
          isStarred={starredKeys.includes(previewFile.key)}
          onClose={() => setPreviewFile(null)}
          onDelete={() => {
            onDeleteFile?.(previewFile);
            setPreviewFile(null);
          }}
          onDownload={() => onDownloadFile?.(previewFile)}
          onToggleStar={() => toggleStar(previewFile.key)}
          prefix={prefix}
        />
      )}
    </div>
  );
}
