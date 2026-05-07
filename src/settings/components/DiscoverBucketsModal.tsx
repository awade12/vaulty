import { useMutation, useQuery } from "@tanstack/react-query";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type MouseEvent,
} from "react";
import { toast } from "sonner";

import { bulkAddConnections, listAccountBuckets } from "../../lib/tauri";
import { handleTauriError } from "../../lib/utils";
import type { ListBucketsCredentials } from "../../types";
import DiscoverBucketRow from "./DiscoverBucketRow";

interface DiscoverBucketsModalProps {
  open: boolean;
  credentials: ListBucketsCredentials | null;
  existingBucketNames: string[];
  onClose: () => void;
  onAdded: () => void;
}

export default function DiscoverBucketsModal({
  open,
  credentials,
  existingBucketNames,
  onClose,
  onAdded,
}: DiscoverBucketsModalProps) {
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const existingSet = useMemo(
    () => new Set(existingBucketNames),
    [existingBucketNames],
  );

  const listQuery = useQuery({
    queryKey: ["account-buckets", credentials] as const,
    queryFn: () => {
      if (credentials == null) {
        return Promise.resolve([]);
      }
      return listAccountBuckets({
        provider: credentials.provider,
        endpoint: credentials.endpoint,
        region: credentials.region,
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      });
    },
    enabled: open && credentials != null,
  });

  const names = listQuery.data ?? [];

  useEffect(() => {
    if (!open) {
      setFilter("");
      setSelected(new Set());
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open || listQuery.status !== "success") {
      return;
    }
    const next = new Set(
      names.filter((n) => !existingSet.has(n)),
    );
    setSelected(next);
  }, [open, listQuery.status, names, existingSet]);

  const bulkMut = useMutation({
    mutationFn: (buckets: string[]) => {
      if (credentials == null) {
        throw new Error("Missing credentials");
      }
      return bulkAddConnections({
        provider: credentials.provider,
        endpoint: credentials.endpoint,
        region: credentials.region,
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        buckets,
      });
    },
    onSuccess: (res) => {
      const n = res.added.length;
      const parts: string[] = [];
      if (n > 0) {
        parts.push(`Added ${n} connection${n !== 1 ? "s" : ""}`);
      }
      if (res.skippedExisting.length > 0) {
        parts.push(`skipped ${res.skippedExisting.length} already saved`);
      }
      if (res.failed.length > 0) {
        parts.push(`${res.failed.length} failed`);
      }
      toast.success(parts.length > 0 ? parts.join(" · ") : "No changes");
      onAdded();
      onClose();
    },
    onError: (e) => {
      toast.error(handleTauriError(e));
    },
  });

  const q = filter.trim().toLowerCase();
  const visible = useMemo(() => {
    if (q.length === 0) {
      return names;
    }
    return names.filter((n) => n.toLowerCase().includes(q));
  }, [names, q]);

  function handleBackdropMouseDown(): void {
    if (!bulkMut.isPending) {
      onClose();
    }
  }

  function handlePanelMouseDown(e: MouseEvent): void {
    e.stopPropagation();
  }

  function handleFilterChange(e: ChangeEvent<HTMLInputElement>): void {
    setFilter(e.target.value);
  }

  function handleToggle(name: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  function handleSelectAllVisible(): void {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const n of visible) {
        next.add(n);
      }
      return next;
    });
  }

  function handleSelectNewOnly(): void {
    setSelected(
      new Set(names.filter((n) => !existingSet.has(n))),
    );
  }

  function handleClearSelection(): void {
    setSelected(new Set());
  }

  function handleAddSelected(): void {
    const buckets = Array.from(selected);
    if (buckets.length === 0) {
      return;
    }
    bulkMut.mutate(buckets);
  }

  const busy = bulkMut.isPending || listQuery.isFetching;

  if (!open || credentials == null) {
    return null;
  }

  return (
    <div
      aria-labelledby="discover-buckets-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/20 p-4"
      onMouseDown={handleBackdropMouseDown}
      role="dialog"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-xl border border-[0.5px] border-zinc-200 bg-white"
        onMouseDown={handlePanelMouseDown}
      >
        <div className="border-b border-[0.5px] border-zinc-200 p-4">
          <h2
            className="text-sm font-medium text-zinc-900"
            id="discover-buckets-title"
          >
            Buckets in account
          </h2>
          <p className="mt-1 text-[11px] text-zinc-500">
            Choose buckets to save as connections (same credentials for each).
            Already saved buckets stay listed but are not pre-selected.
          </p>
          <input
            className="mt-3 w-full rounded-md border border-[0.5px] border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-300 focus:border-accent-200 focus:outline-none focus:ring-2 focus:ring-accent-200/40"
            onChange={handleFilterChange}
            placeholder="Search bucket names…"
            type="search"
            value={filter}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              className="rounded-md border border-[0.5px] border-zinc-200 bg-white px-2 py-1 text-[10px] text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-zinc-600 disabled:opacity-50"
              disabled={busy}
              onClick={handleSelectNewOnly}
              type="button"
            >
              Select new only
            </button>
            <button
              className="rounded-md border border-[0.5px] border-zinc-200 bg-white px-2 py-1 text-[10px] text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-zinc-600 disabled:opacity-50"
              disabled={busy}
              onClick={handleSelectAllVisible}
              type="button"
            >
              Add visible to selection
            </button>
            <button
              className="rounded-md border border-[0.5px] border-zinc-200 bg-white px-2 py-1 text-[10px] text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-zinc-600 disabled:opacity-50"
              disabled={busy}
              onClick={handleClearSelection}
              type="button"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {listQuery.isError && (
            <p className="px-2 py-4 text-center text-xs text-red-500">
              {handleTauriError(listQuery.error)}
            </p>
          )}
          {listQuery.isPending && (
            <p className="px-2 py-8 text-center text-xs text-zinc-400">
              Loading buckets…
            </p>
          )}
          {listQuery.isSuccess && visible.length === 0 && (
            <p className="px-2 py-8 text-center text-xs text-zinc-400">
              {names.length === 0
                ? "No buckets returned. Check API token permissions."
                : "No buckets match filter."}
            </p>
          )}
          {listQuery.isSuccess &&
            visible.map((name) => (
              <DiscoverBucketRow
                isChecked={selected.has(name)}
                isSaved={existingSet.has(name)}
                key={name}
                name={name}
                onToggle={handleToggle}
              />
            ))}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-[0.5px] border-zinc-200 p-3">
          <button
            className="rounded-md border border-[0.5px] border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-zinc-600 disabled:opacity-50"
            disabled={busy}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-md bg-accent-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-800 active:bg-accent-950 disabled:opacity-50"
            disabled={busy || selected.size === 0}
            onClick={handleAddSelected}
            type="button"
          >
            Add {selected.size} connection{selected.size !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
