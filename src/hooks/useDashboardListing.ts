import { useEffect, useMemo, useState, type ChangeEvent } from "react";

import { useBucketContents } from "./useBucketContents";
import { displayNameForKey } from "../lib/utils";
import { useBucketStore } from "../store/bucketStore";

export function useDashboardListing() {
  const [prefix, setPrefix] = useState("");
  const [filter, setFilter] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());

  const activeConnectionId = useBucketStore((s) => s.activeConnectionId);

  const query = useBucketContents(prefix);
  const files = query.data ?? [];

  const visibleFiles = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (q.length === 0) {
      return files;
    }
    return files.filter((f) =>
      displayNameForKey(f.key, prefix).toLowerCase().includes(q),
    );
  }, [files, filter, prefix]);

  useEffect(() => {
    setSelectedKeys(new Set());
  }, [prefix, activeConnectionId]);

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
  }

  function handleOpenFolder(key: string): void {
    setPrefix(key);
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
    handleNavigate,
    handleOpenFolder,
    handleToggleSelect,
    handleSelectAllVisible,
    handleClearSelection,
    handleFilterChange,
  };
}
