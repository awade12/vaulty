import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { toast } from "sonner";

import { useBucketContents } from "./useBucketContents";
import { searchObjects } from "../lib/tauri";
import { displayNameForKey, handleTauriError } from "../lib/utils";
import { useBucketStore } from "../store/bucketStore";
import type { BucketFile } from "../types";

export interface BucketSearchState {
  query: string;
  results: BucketFile[];
  scanned: number;
  truncated: boolean;
}

export function useDashboardListing() {
  const [prefix, setPrefix] = useState("");
  const [filter, setFilter] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [bucketSearch, setBucketSearch] = useState<BucketSearchState | null>(
    null,
  );
  const [searchBusy, setSearchBusy] = useState(false);

  const activeConnectionId = useBucketStore((s) => s.activeConnectionId);

  const query = useBucketContents(prefix);
  const files = query.data ?? [];

  const visibleFiles = useMemo(() => {
    if (bucketSearch != null) {
      return bucketSearch.results;
    }
    const q = filter.trim().toLowerCase();
    if (q.length === 0) {
      return files;
    }
    return files.filter((f) =>
      displayNameForKey(f.key, prefix).toLowerCase().includes(q),
    );
  }, [files, filter, prefix, bucketSearch]);

  useEffect(() => {
    setSelectedKeys(new Set());
  }, [prefix, activeConnectionId]);

  // Leaving the current connection or navigating exits bucket-search mode.
  useEffect(() => {
    setBucketSearch(null);
  }, [activeConnectionId]);

  async function runBucketSearch(): Promise<void> {
    const q = filter.trim();
    if (q.length < 2) {
      toast.error("Type at least 2 characters to search the bucket.");
      return;
    }
    setSearchBusy(true);
    try {
      const result = await searchObjects(q, prefix);
      setBucketSearch({
        query: q,
        results: result.matches,
        scanned: result.scanned,
        truncated: result.truncated,
      });
      if (result.matches.length === 0) {
        toast.info(`No matches for "${q}" in this bucket.`);
      } else if (result.truncated) {
        toast.info(
          `Showing first ${result.matches.length} matches. Refine your query for more.`,
        );
      }
    } catch (e) {
      toast.error(handleTauriError(e));
    } finally {
      setSearchBusy(false);
    }
  }

  function clearBucketSearch(): void {
    setBucketSearch(null);
  }

  const listedTotal = useMemo(() => {
    return files
      .filter((f) => !f.isFolder)
      .reduce((sum, f) => sum + f.size, 0);
  }, [files]);

  const fileCountInView = useMemo(() => {
    return files.filter((f) => !f.isFolder).length;
  }, [files]);

  const folderCount = useMemo(() => {
    return files.filter((f) => f.isFolder).length;
  }, [files]);

  function handleNavigate(nextPrefix: string): void {
    setPrefix(nextPrefix);
    setBucketSearch(null);
  }

  function handleOpenFolder(key: string): void {
    setPrefix(key);
    setBucketSearch(null);
  }

  function handleToggleSelect(key: string): void {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function handleSelectAllVisible(): void {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const f of visibleFiles) {
        if (!f.isFolder) {
          next.add(f.key);
        }
      }
      return next;
    });
  }

  function handleClearSelection(): void {
    setSelectedKeys(new Set());
  }

  function handleFilterChange(e: ChangeEvent<HTMLInputElement>): void {
    setFilter(e.target.value);
  }

  return {
    prefix,
    filter,
    selectedKeys,
    setSelectedKeys,
    query,
    files,
    visibleFiles,
    listedTotal,
    fileCountInView,
    folderCount,
    bucketSearch,
    searchBusy,
    runBucketSearch,
    clearBucketSearch,
    handleNavigate,
    handleOpenFolder,
    handleToggleSelect,
    handleSelectAllVisible,
    handleClearSelection,
    handleFilterChange,
  };
}
