import { useState, type ChangeEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { indexCatalog, searchCatalog } from "../../lib/tauri";
import { formatBytes, handleTauriError } from "../../lib/utils";
import type { CatalogSearchResult } from "../../types";

interface CatalogPanelProps {
  connectionId: string | null;
  prefix: string;
  onClose: () => void;
}

export default function CatalogPanel({
  connectionId,
  prefix,
  onClose,
}: CatalogPanelProps) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<CatalogSearchResult | null>(null);

  const indexMut = useMutation({
    mutationFn: indexCatalog,
    onSuccess: (count) => toast.success(`Indexed ${count} object${count === 1 ? "" : "s"}`),
    onError: (e) => toast.error(handleTauriError(e)),
  });

  const searchMut = useMutation({
    mutationFn: searchCatalog,
    onSuccess: setResult,
    onError: (e) => toast.error(handleTauriError(e)),
  });

  function handleQueryChange(e: ChangeEvent<HTMLInputElement>): void {
    setQuery(e.target.value);
  }

  function handleIndex(): void {
    if (connectionId == null) return;
    indexMut.mutate({ connectionId, prefix });
  }

  function handleSearch(): void {
    if (connectionId == null) return;
    searchMut.mutate({ connectionId, query });
  }

  return (
    <aside className="w-80 shrink-0 border-l border-[0.5px] border-zinc-200 bg-zinc-50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-900">Local Catalog</p>
        <button className="text-xs text-zinc-400" onClick={onClose} type="button">
          Close
        </button>
      </div>
      <p className="text-xs leading-relaxed text-zinc-400">
        Build a local searchable snapshot for the current bucket or prefix. Search is instant after indexing.
      </p>
      <button
        className="mt-3 w-full rounded-md bg-accent-700 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
        disabled={connectionId == null || indexMut.isPending}
        onClick={handleIndex}
        type="button"
      >
        Index current prefix
      </button>
      <div className="mt-3 flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-md border border-[0.5px] border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900"
          onChange={handleQueryChange}
          placeholder="Search catalog..."
          value={query}
        />
        <button
          className="rounded-md border border-[0.5px] border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600 disabled:opacity-50"
          disabled={connectionId == null || searchMut.isPending}
          onClick={handleSearch}
          type="button"
        >
          Search
        </button>
      </div>
      {result != null && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-zinc-400">
            {result.entries.length} shown · {result.indexedCount} indexed
          </p>
          {result.entries.map((entry) => (
            <div className="rounded-md bg-white p-2" key={entry.key}>
              <p className="truncate text-xs text-zinc-900">{entry.key}</p>
              <p className="mt-1 text-[11px] text-zinc-400">
                {formatBytes(entry.size)} · {entry.contentType || "unknown"}
              </p>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
