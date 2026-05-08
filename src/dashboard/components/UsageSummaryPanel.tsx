import { useQuery } from "@tanstack/react-query";

import { getUsageSummary } from "../../lib/tauri";
import { formatBytes, handleTauriError } from "../../lib/utils";

interface UsageSummaryPanelProps {
  prefix: string;
  onClose: () => void;
}

export default function UsageSummaryPanel({ prefix, onClose }: UsageSummaryPanelProps) {
  const query = useQuery({
    queryKey: ["usage-summary", prefix],
    queryFn: () => getUsageSummary({ prefix }),
  });
  const summary = query.data;

  return (
    <aside className="w-80 shrink-0 overflow-auto border-l-[0.5px] border-zinc-200 bg-zinc-50 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-zinc-900">Usage</h2>
          <p className="mt-1 text-xs text-zinc-400">
            {summary != null ? `${summary.scanned.toLocaleString()} scanned` : "Scanning bucket"}
          </p>
        </div>
        <button
          className="rounded-md border-[0.5px] border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </div>
      {query.isPending && <p className="text-xs text-zinc-400">Scanning...</p>}
      {query.error != null && <p className="text-xs text-red-500">{handleTauriError(query.error)}</p>}
      {summary != null && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md bg-white px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-300">Size</p>
              <p className="mt-1 text-sm font-medium text-zinc-900">{formatBytes(summary.totalSize)}</p>
            </div>
            <div className="rounded-md bg-white px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-300">Objects</p>
              <p className="mt-1 text-sm font-medium text-zinc-900">{summary.objectCount.toLocaleString()}</p>
            </div>
          </div>
          {summary.truncated && (
            <p className="rounded-md bg-white px-2 py-1.5 text-xs text-zinc-400">
              Scan hit the object cap. Open a narrower folder for more detail.
            </p>
          )}
          <section>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-300">
              Largest prefixes
            </h3>
            <div className="space-y-1">
              {summary.largestPrefixes.map((item) => (
                <div className="rounded-md bg-white px-2 py-1.5" key={item.prefix || "/"}>
                  <p className="truncate text-xs text-zinc-900">{item.prefix || "/"}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-300">
                    {formatBytes(item.size)} · {item.count.toLocaleString()} objects
                  </p>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-300">
              File types
            </h3>
            <div className="space-y-1">
              {summary.fileTypes.map((item) => (
                <div className="rounded-md bg-white px-2 py-1.5" key={item.fileType}>
                  <p className="truncate text-xs text-zinc-900">{item.fileType}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-300">
                    {formatBytes(item.size)} · {item.count.toLocaleString()} objects
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </aside>
  );
}
