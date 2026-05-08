import { useQuery } from "@tanstack/react-query";

import { getCleanupReport } from "../../lib/tauri";
import { basenameKey, formatBytes, handleTauriError } from "../../lib/utils";
import type { BucketFile, FileVersion } from "../../types";

interface CleanupPanelProps {
  prefix: string;
  onClose: () => void;
}

function ObjectList({ files }: { files: BucketFile[] }) {
  if (files.length === 0) return <p className="text-xs text-zinc-400">No matches</p>;
  return (
    <div className="space-y-1">
      {files.slice(0, 8).map((file) => (
        <div className="rounded-md bg-white px-2 py-1.5" key={file.key}>
          <p className="truncate text-xs text-zinc-900">{basenameKey(file.key)}</p>
          <p className="mt-0.5 text-[11px] text-zinc-300">{formatBytes(file.size)}</p>
        </div>
      ))}
    </div>
  );
}

function VersionList({ versions }: { versions: FileVersion[] }) {
  if (versions.length === 0) return <p className="text-xs text-zinc-400">No matches</p>;
  return (
    <div className="space-y-1">
      {versions.slice(0, 8).map((version) => (
        <div className="rounded-md bg-white px-2 py-1.5" key={version.versionId}>
          <p className="truncate text-xs text-zinc-900">{version.versionId}</p>
          <p className="mt-0.5 text-[11px] text-zinc-300">{formatBytes(version.size)}</p>
        </div>
      ))}
    </div>
  );
}

export default function CleanupPanel({ prefix, onClose }: CleanupPanelProps) {
  const query = useQuery({
    queryKey: ["cleanup-report", prefix],
    queryFn: () => getCleanupReport({ prefix, oldDays: 90, largeBytes: 100 * 1024 * 1024 }),
  });
  const report = query.data;

  return (
    <aside className="w-80 shrink-0 overflow-auto border-l-[0.5px] border-zinc-200 bg-zinc-50 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-zinc-900">Cleanup</h2>
          <p className="mt-1 text-xs text-zinc-400">
            {report != null ? `${report.scanned.toLocaleString()} scanned` : "Scanning bucket"}
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
      {report != null && (
        <div className="space-y-4">
          {report.truncated && (
            <p className="rounded-md bg-white px-2 py-1.5 text-xs text-zinc-400">
              Scan hit the object cap. Narrow the folder to inspect more.
            </p>
          )}
          <section>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-300">
              Old files
            </h3>
            <ObjectList files={report.oldObjects} />
          </section>
          <section>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-300">
              Large files
            </h3>
            <ObjectList files={report.largeObjects} />
          </section>
          <section>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-300">
              Duplicate names
            </h3>
            {report.duplicateNameGroups.length === 0 ? (
              <p className="text-xs text-zinc-400">No matches</p>
            ) : (
              <div className="space-y-1">
                {report.duplicateNameGroups.slice(0, 8).map((group) => (
                  <div className="rounded-md bg-white px-2 py-1.5" key={group.name}>
                    <p className="truncate text-xs text-zinc-900">{group.name}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-300">
                      {group.objects.length} objects
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-300">
              Empty folder markers
            </h3>
            <ObjectList files={report.emptyFolderMarkers} />
          </section>
          <section>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-300">
              Noncurrent versions
            </h3>
            <VersionList versions={report.noncurrentVersions} />
          </section>
        </div>
      )}
    </aside>
  );
}
