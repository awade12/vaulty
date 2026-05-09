import { useState, useRef, useEffect, type ChangeEvent, type KeyboardEvent } from "react";

import { clsx } from "clsx";

import { useDashboardController } from "../hooks/useDashboardController";
import { basenameKey, formatBytes, joinPrefix } from "../lib/utils";
import { useBucketStore } from "../store/bucketStore";
import type { BucketFile } from "../types";
import ConfirmDeleteModal from "./components/ConfirmDeleteModal";
import CleanupPanel from "./components/CleanupPanel";
import ConflictModal from "./components/ConflictModal";
import CrossBucketTransferModal from "./components/CrossBucketTransferModal";
import BucketComparePanel from "./components/BucketComparePanel";
import CatalogPanel from "./components/CatalogPanel";
import DashboardDisconnected from "./components/DashboardDisconnected";
import FileGrid from "./components/FileGrid";
import FolderSyncPanel from "./components/FolderSyncPanel";
import MimeFixerPanel from "./components/MimeFixerPanel";
import NewFolderModal from "./components/NewFolderModal";
import ObjectDetailsPanel from "./components/ObjectDetailsPanel";
import RenameModal from "./components/RenameModal";
import ShareLinkModal from "./components/ShareLinkModal";
import TransferDock from "./components/TransferDock";
import UsageSummaryPanel from "./components/UsageSummaryPanel";
import VersionHistoryModal from "./components/VersionHistoryModal";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}

function FolderPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function FolderUploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path
        d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 7.5l-.735-.477a2.25 2.25 0 00-1.215-.348H3.75A2.25 2.25 0 001.5 9v10.5A2.25 2.25 0 003.75 21.75h16.5a2.25 2.25 0 002.25-2.25v-7.03a2.25 2.25 0 00-.848-1.756l-4.72-3.848a2.25 2.25 0 00-1.428-.508H11.25l-1.83-1.83a2.25 2.25 0 00-1.59-.66H6.75Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SyncIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M20.015 4.356v4.992m0 0h-4.992m4.992 0-3.181-3.183a8.25 8.25 0 0 0-13.803 3.7" />
    </svg>
  );
}

function CleanupIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 7.5 16.5m0 0v-5.25m0 5.25h5.25M6.75 6.75h10.5v10.5" />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  );
}

function EllipsisIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

interface BreadcrumbProps {
  prefix: string;
  bucketLabel: string;
  onNavigate: (prefix: string) => void;
}

function Breadcrumb({ prefix, bucketLabel, onNavigate }: BreadcrumbProps) {
  const segments = prefix.replace(/\/+$/, "").split("/").filter((s) => s.length > 0);

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border-[0.5px] border-zinc-200 bg-zinc-50 px-2 py-1 text-xs">
      <button
        className="flex items-center justify-center rounded p-0.5 text-zinc-400 transition-colors hover:bg-white hover:text-zinc-600"
        onClick={() => onNavigate("")}
        type="button"
      >
        <HomeIcon className="h-3.5 w-3.5" />
      </button>
      <ChevronRightIcon className="h-3 w-3 text-zinc-300" />
      <button
        className={clsx(
          "rounded px-1 py-0.5 transition-colors",
          segments.length === 0
            ? "font-medium text-zinc-900"
            : "text-zinc-500 hover:bg-white hover:text-zinc-700"
        )}
        onClick={() => onNavigate("")}
        type="button"
      >
        {bucketLabel}
      </button>
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        const targetPrefix = joinPrefix(segments.slice(0, i + 1));
        return (
          <div className="flex items-center gap-1" key={`${seg}-${i}`}>
            <ChevronRightIcon className="h-3 w-3 text-zinc-300" />
            <button
              className={clsx(
                "max-w-[120px] truncate rounded px-1 py-0.5 transition-colors",
                isLast
                  ? "font-medium text-zinc-900"
                  : "text-zinc-500 hover:bg-white hover:text-zinc-700"
              )}
              onClick={() => onNavigate(targetPrefix)}
              type="button"
            >
              {seg}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const d = useDashboardController();
  const viewMode = useBucketStore((s) => s.viewMode);
  const setViewMode = useBucketStore((s) => s.setViewMode);
  const pinnedPrefixes = useBucketStore((s) => s.pinnedPrefixes);
  const togglePinnedPrefix = useBucketStore((s) => s.togglePinnedPrefix);
  const [versionFile, setVersionFile] = useState<BucketFile | null>(null);
  const [detailsFile, setDetailsFile] = useState<BucketFile | null>(null);
  const [sidePanel, setSidePanel] = useState<"details" | "cleanup" | "sync" | "usage" | "compare" | "mime" | "catalog" | null>(null);
  const [transferKeys, setTransferKeys] = useState<string[] | null>(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    }
    if (moreMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [moreMenuOpen]);

  function handleSearchChange(e: ChangeEvent<HTMLInputElement>) {
    d.handleFilterChange(e);
  }

  function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void d.runBucketSearch();
    } else if (e.key === "Escape" && d.bucketSearch != null) {
      e.preventDefault();
      d.clearBucketSearch();
    }
  }

  function handleShowVersions(file: BucketFile) {
    setVersionFile(file);
  }

  function handleShowDetails(file: BucketFile) {
    setDetailsFile(file);
    setSidePanel("details");
  }

  function handleShowCleanup() {
    setSidePanel("cleanup");
  }

  function handleShowSync() {
    setSidePanel("sync");
  }

  function handleShowUsage() {
    setSidePanel("usage");
  }

  function handleShowCompare() {
    setSidePanel("compare");
  }

  function handleShowMime() {
    setSidePanel("mime");
  }

  function handleShowCatalog() {
    setSidePanel("catalog");
  }

  function handleCloseSidePanel() {
    setSidePanel(null);
  }

  function handleTogglePin() {
    if (d.active?.id == null) return;
    togglePinnedPrefix(d.active.id, d.prefix);
  }

  const pinnedForActive = pinnedPrefixes.filter((p) => p.connectionId === d.active?.id);
  const isCurrentPinned = pinnedForActive.some((p) => p.prefix === d.prefix);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      {!d.showBucket ? (
        <DashboardDisconnected />
      ) : (
        <>
          <header className="flex items-center justify-between gap-4 border-b border-[0.5px] border-zinc-200 px-4 py-3">
            <Breadcrumb
              bucketLabel={d.active?.label ?? "Files"}
              onNavigate={d.handleNavigate}
              prefix={d.prefix}
            />
            <div className="flex items-center gap-2">
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  className="w-48 rounded-lg border-0 bg-zinc-100 py-1.5 pl-9 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent-200 transition-all"
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={d.searchBusy ? "Searching…" : "Search"}
                  type="search"
                  value={d.filter}
                />
              </div>
              <div className="flex items-center gap-0.5 rounded-lg bg-zinc-100 p-0.5">
                <button
                  className={clsx(
                    "rounded-md p-1.5 transition-colors",
                    viewMode === "grid" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                  )}
                  onClick={() => setViewMode("grid")}
                  title="Grid view"
                  type="button"
                >
                  <GridIcon className="h-4 w-4" />
                </button>
                <button
                  className={clsx(
                    "rounded-md p-1.5 transition-colors",
                    viewMode === "list" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                  )}
                  onClick={() => setViewMode("list")}
                  title="List view"
                  type="button"
                >
                  <ListIcon className="h-4 w-4" />
                </button>
              </div>
              <button
                className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 py-1.5 text-xs text-zinc-600 transition-colors hover:bg-zinc-200 disabled:opacity-50"
                disabled={d.isRowActionPending}
                onClick={d.handleNewFolderClick}
                title="New folder"
                type="button"
              >
                <FolderPlusIcon className="h-4 w-4" />
              </button>
              <div className="relative" ref={moreMenuRef}>
                <button
                  className={clsx(
                    "flex items-center gap-1 rounded-lg border-[0.5px] px-2.5 py-1.5 text-xs transition-colors disabled:opacity-50",
                    moreMenuOpen
                      ? "border-zinc-300 bg-zinc-100 text-zinc-700"
                      : "border-zinc-200 bg-white text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600"
                  )}
                  disabled={d.isRowActionPending}
                  onClick={() => setMoreMenuOpen((v) => !v)}
                  type="button"
                >
                  <EllipsisIcon className="h-4 w-4" />
                </button>
                {moreMenuOpen && (
                  <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded-lg border-[0.5px] border-zinc-200 bg-white py-1 shadow-lg">
                    <button
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-600 hover:bg-zinc-50"
                      onClick={() => { handleTogglePin(); setMoreMenuOpen(false); }}
                      type="button"
                    >
                      <PinIcon className="h-4 w-4 text-zinc-400" />
                      {isCurrentPinned ? "Unpin folder" : "Pin folder"}
                    </button>
                    <button
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-600 hover:bg-zinc-50"
                      onClick={() => { handleShowUsage(); setMoreMenuOpen(false); }}
                      type="button"
                    >
                      <svg className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                      </svg>
                      Usage
                    </button>
                    <button
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-600 hover:bg-zinc-50"
                      onClick={() => { handleShowCleanup(); setMoreMenuOpen(false); }}
                      type="button"
                    >
                      <CleanupIcon className="h-4 w-4 text-zinc-400" />
                      Cleanup
                    </button>
                    <button
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-600 hover:bg-zinc-50"
                      onClick={() => { handleShowSync(); setMoreMenuOpen(false); }}
                      type="button"
                    >
                      <SyncIcon className="h-4 w-4 text-zinc-400" />
                      Folder sync
                    </button>
                    <button
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-600 hover:bg-zinc-50"
                      onClick={() => { handleShowCompare(); setMoreMenuOpen(false); }}
                      type="button"
                    >
                      <SyncIcon className="h-4 w-4 text-zinc-400" />
                      Compare buckets
                    </button>
                    <button
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-600 hover:bg-zinc-50"
                      onClick={() => { handleShowMime(); setMoreMenuOpen(false); }}
                      type="button"
                    >
                      <CleanupIcon className="h-4 w-4 text-zinc-400" />
                      MIME fixer
                    </button>
                    <button
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-600 hover:bg-zinc-50"
                      onClick={() => { handleShowCatalog(); setMoreMenuOpen(false); }}
                      type="button"
                    >
                      <SearchIcon className="h-4 w-4 text-zinc-400" />
                      Local catalog
                    </button>
                    <label className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50">
                      <input
                        checked={d.optimizeImages}
                        className="h-3.5 w-3.5 rounded border-zinc-200 text-accent-700"
                        onChange={(e) => d.setOptimizeImages(e.target.checked)}
                        type="checkbox"
                      />
                      Optimize image uploads
                    </label>
                    <div className="my-1 border-t border-[0.5px] border-zinc-100" />
                    <button
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-600 hover:bg-zinc-50"
                      onClick={() => { d.handleUploadFolderClick(); setMoreMenuOpen(false); }}
                      type="button"
                    >
                      <FolderUploadIcon className="h-4 w-4 text-zinc-400" />
                      Upload folder
                    </button>
                  </div>
                )}
              </div>
              <button
                className="flex items-center gap-1.5 rounded-lg bg-accent-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-800 active:bg-accent-950 disabled:opacity-50"
                disabled={d.isRowActionPending}
                onClick={d.handleUploadClick}
                type="button"
              >
                <UploadIcon className="h-4 w-4" />
                <span>Upload</span>
              </button>
            </div>
          </header>

          {d.bucketSearch != null && (
            <div className="flex items-center justify-between gap-3 border-b border-[0.5px] border-zinc-200 bg-amber-50 px-4 py-2 text-xs text-zinc-700">
              <div className="min-w-0">
                <span className="font-medium">Search results</span>
                <span className="ml-2 text-zinc-500">
                  {d.bucketSearch.results.length} match
                  {d.bucketSearch.results.length === 1 ? "" : "es"} for{" "}
                  <span className="font-mono">"{d.bucketSearch.query}"</span>
                  {" · "}
                  scanned {d.bucketSearch.scanned.toLocaleString()} object
                  {d.bucketSearch.scanned === 1 ? "" : "s"}
                  {d.bucketSearch.truncated && " (truncated — refine to see more)"}
                </span>
              </div>
              <button
                className="shrink-0 rounded-md border border-[0.5px] border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-600 hover:bg-zinc-50"
                onClick={d.clearBucketSearch}
                type="button"
              >
                Back to folder
              </button>
            </div>
          )}
          {pinnedForActive.length > 0 && (
            <div className="flex items-center gap-2 border-b border-[0.5px] border-zinc-200 bg-zinc-50 px-4 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-300">
                Pinned
              </span>
              {pinnedForActive.map((pin) => (
                <button
                  className="rounded-md border-[0.5px] border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
                  key={pin.prefix || "root"}
                  onClick={() => d.handleNavigate(pin.prefix)}
                  type="button"
                >
                  {pin.prefix || "/"}
                </button>
              ))}
            </div>
          )}

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <FileGrid
              errorMessage={d.errorMessage}
              files={d.visibleFiles}
              isActionPending={d.isRowActionPending}
              isLoading={d.query.isPending}
              onBulkDelete={d.handleBulkDelete}
              onBulkDownload={d.handleBulkDownload}
              onClearSelection={d.handleClearSelection}
              onCopyLink={d.handleCopyLink}
              onDeleteFile={d.handleDeleteRequest}
              onDeleteSelected={d.handleDeleteSelected}
              onDownloadFile={d.handleDownloadFile}
              onTransferSelected={setTransferKeys}
              onDuplicateFile={d.handleDuplicateFile}
              onMoveFile={d.handleMoveFile}
              onShowDetails={handleShowDetails}
              onShowVersions={handleShowVersions}
              onZipDownload={d.handleZipDownload}
              onOpenFile={d.handleOpenFile}
              onOpenFolder={d.handleOpenFolder}
              onRecursiveDeleteFolder={d.handleRecursiveRequestFolder}
              onRenameFile={d.handleRenameRequest}
              onSelectAll={d.handleSelectAllVisible}
              onToggleSelect={d.handleToggleSelect}
              prefix={d.prefix}
              selectedKeys={d.selectedKeys}
            />
            {sidePanel === "details" && (
              <ObjectDetailsPanel
                connection={d.active}
                file={detailsFile}
                onClose={handleCloseSidePanel}
              />
            )}
            {sidePanel === "cleanup" && (
              <CleanupPanel onClose={handleCloseSidePanel} prefix={d.prefix} />
            )}
            {sidePanel === "sync" && (
              <FolderSyncPanel
                connection={d.active}
                onClose={handleCloseSidePanel}
                prefix={d.prefix}
              />
            )}
            {sidePanel === "usage" && (
              <UsageSummaryPanel onClose={handleCloseSidePanel} prefix={d.prefix} />
            )}
            {sidePanel === "compare" && (
              <BucketComparePanel
                activeConnectionId={d.active?.id ?? null}
                connections={d.connections}
                onClose={handleCloseSidePanel}
                prefix={d.prefix}
              />
            )}
            {sidePanel === "mime" && (
              <MimeFixerPanel onClose={handleCloseSidePanel} prefix={d.prefix} />
            )}
            {sidePanel === "catalog" && (
              <CatalogPanel
                connectionId={d.active?.id ?? null}
                onClose={handleCloseSidePanel}
                prefix={d.prefix}
              />
            )}
          </div>
        </>
      )}

      <TransferDock
        onCancelUploadBatch={d.handleCancelUploadBatch}
        progress={d.transferProgress}
        uploadBatchPending={d.uploadMut.isPending}
      />

      <NewFolderModal
        isPending={d.createFolderMut.isPending}
        onClose={d.handleFolderModalClose}
        onCreate={d.handleFolderCreate}
        open={d.folderModalOpen}
      />
      <RenameModal
        initialName={d.renameTarget != null ? basenameKey(d.renameTarget.key) : ""}
        isPending={d.moveMut.isPending}
        onClose={d.handleRenameModalClose}
        onRename={d.handleRenameSubmit}
        open={d.renameTarget != null}
      />
      <ConfirmDeleteModal
        confirmLabel={d.deleteModal.confirmLabel}
        description={d.deleteModal.body}
        isPending={d.deleteBusy}
        onCancel={d.handleDeleteModalClose}
        onConfirm={d.handleDeleteConfirmed}
        open={d.pendingDelete != null}
        requireMatch={d.deleteModal.requireMatch}
        title={d.deleteModal.title}
      />

      <VersionHistoryModal
        fileKey={versionFile?.key ?? ""}
        onClose={() => setVersionFile(null)}
        open={versionFile != null}
      />
      <ShareLinkModal file={d.shareTarget} onClose={d.handleShareModalClose} />
      <ConflictModal
        conflict={d.uploadConflict}
        onResolve={d.handleUploadConflictResolve}
      />
      <CrossBucketTransferModal
        activeConnectionId={d.active?.id ?? null}
        connections={d.connections}
        keys={transferKeys ?? []}
        onClose={() => setTransferKeys(null)}
        onDone={() => {
          d.handleClearSelection();
          void d.query.refetch();
        }}
      />
      <ConflictModal
        conflict={
          d.moveConflict == null
            ? null
            : {
                key: d.moveConflict.toKey,
                item: {
                  localPath: d.moveConflict.fromKey,
                  objectRelativeKey: basenameKey(d.moveConflict.fromKey),
                  size: 0,
                  modifiedMillis: 0,
                },
              }
        }
        onResolve={d.handleMoveConflictResolve}
      />

      <footer className="flex h-7 shrink-0 items-center gap-2.5 border-t border-[0.5px] border-zinc-200 bg-zinc-50 px-4 text-[11px] text-zinc-400">
        <div className={d.showBucket ? "h-1.5 w-1.5 rounded-full bg-green-500" : "h-1.5 w-1.5 rounded-full bg-zinc-300"} />
        <span>{d.statusLeft}</span>
        <span className="ml-auto tabular-nums">
          {d.showBucket && d.query.isSuccess
            ? `${formatBytes(d.listedTotal)} · ${d.folderCount} folders · ${d.fileCountInView} files`
            : ""}
        </span>
      </footer>
    </div>
  );
}
