import { useQuery } from "@tanstack/react-query";

import { getObjectDetails } from "../../lib/tauri";
import { basenameKey, formatBytes, formatRelativeTime, handleTauriError } from "../../lib/utils";
import type { BucketFile, ConnectionConfig } from "../../types";

interface DetailRowProps {
  label: string;
  value: string;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="border-b-[0.5px] border-zinc-200 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-300">{label}</div>
      <div className="mt-1 break-all text-xs text-zinc-900">{value || "None"}</div>
    </div>
  );
}

interface ObjectDetailsPanelProps {
  file: BucketFile | null;
  connection: ConnectionConfig | undefined;
  onClose: () => void;
}

export default function ObjectDetailsPanel({ file, connection, onClose }: ObjectDetailsPanelProps) {
  const query = useQuery({
    enabled: file != null,
    queryKey: ["object-details", file?.key],
    queryFn: () => getObjectDetails(file?.key ?? ""),
  });

  if (file == null) return null;

  const details = query.data;
  const metadata = details != null ? Object.entries(details.metadata) : [];

  return (
    <aside className="w-80 shrink-0 overflow-auto border-l-[0.5px] border-zinc-200 bg-zinc-50 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-medium text-zinc-900">{basenameKey(file.key)}</h2>
          <p className="mt-1 text-xs text-zinc-400">Object details</p>
        </div>
        <button
          className="rounded-md border-[0.5px] border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </div>

      {query.isPending && <p className="text-xs text-zinc-400">Loading details...</p>}
      {query.error != null && <p className="text-xs text-red-500">{handleTauriError(query.error)}</p>}
      {details != null && (
        <div>
          <DetailRow label="Full key" value={details.key} />
          <DetailRow label="Provider" value={connection?.provider ?? "Unknown"} />
          <DetailRow label="Bucket" value={connection?.bucket ?? "Unknown"} />
          <DetailRow label="Endpoint" value={connection?.endpoint ?? "Default"} />
          <DetailRow label="Size" value={formatBytes(details.size)} />
          <DetailRow label="Content type" value={details.contentType} />
          <DetailRow label="Storage class" value={details.storageClass} />
          <DetailRow label="Versioning" value={details.versioningStatus} />
          <DetailRow label="Last modified" value={formatRelativeTime(details.lastModified)} />
          <DetailRow label="ETag" value={details.etag} />
          <DetailRow label="Cache control" value={details.cacheControl} />
          <div className="py-2">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-300">
              Metadata
            </div>
            {metadata.length === 0 ? (
              <p className="mt-1 text-xs text-zinc-400">None</p>
            ) : (
              <div className="mt-1 space-y-1">
                {metadata.map(([key, value]) => (
                  <p className="break-all text-xs text-zinc-900" key={key}>
                    <span className="text-zinc-400">{key}: </span>
                    {value}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
