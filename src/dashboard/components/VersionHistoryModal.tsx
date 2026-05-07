import { useEffect, useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { toast } from "sonner";

import { downloadFileVersion, listFileVersions } from "../../lib/tauri";
import { basenameKey, formatBytes, formatRelativeTime, handleTauriError } from "../../lib/utils";
import type { FileVersion } from "../../types";

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
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

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

interface VersionHistoryModalProps {
  fileKey: string;
  open: boolean;
  onClose: () => void;
}

export default function VersionHistoryModal({
  fileKey,
  open,
  onClose,
}: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !fileKey) return;

    setLoading(true);
    setError(null);

    listFileVersions(fileKey)
      .then((v) => {
        setVersions(v);
        setLoading(false);
      })
      .catch((e) => {
        setError(handleTauriError(e));
        setLoading(false);
      });
  }, [open, fileKey]);

  async function handleDownloadVersion(version: FileVersion) {
    const filename = basenameKey(fileKey);
    const ext = filename.includes(".") ? filename.substring(filename.lastIndexOf(".")) : "";
    const nameWithoutExt = filename.replace(ext, "");
    const defaultName = `${nameWithoutExt}_${version.versionId.substring(0, 8)}${ext}`;

    const dest = await save({
      defaultPath: defaultName,
    });
    if (dest == null) return;

    setDownloading(version.versionId);
    try {
      await downloadFileVersion(fileKey, version.versionId, dest);
      toast.success("Version downloaded");
    } catch (e) {
      toast.error(handleTauriError(e));
    } finally {
      setDownloading(null);
    }
  }

  if (!open) return null;

  const filename = basenameKey(fileKey);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-lg rounded-xl border-[0.5px] border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-[0.5px] border-zinc-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50">
              <HistoryIcon className="h-4 w-4 text-accent-700" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-zinc-900">Version History</h2>
              <p className="text-xs text-zinc-400">{filename}</p>
            </div>
          </div>
          <button
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            onClick={onClose}
            type="button"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[400px] overflow-y-auto p-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-accent-700" />
              <p className="mt-3 text-xs text-zinc-400">Loading versions…</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {!loading && !error && versions.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm text-zinc-500">No versions found</p>
              <p className="mt-1 text-xs text-zinc-400">
                Versioning may not be enabled for this bucket
              </p>
            </div>
          )}

          {!loading && !error && versions.length > 0 && (
            <div className="space-y-2">
              {versions.map((v) => (
                <div
                  className="flex items-center justify-between rounded-lg border-[0.5px] border-zinc-200 px-4 py-3 hover:bg-zinc-50"
                  key={v.versionId}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-zinc-900">
                        {formatRelativeTime(v.lastModified)}
                      </p>
                      {v.isLatest && (
                        <span className="rounded bg-accent-50 px-1.5 py-0.5 text-[10px] font-medium text-accent-700">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-zinc-400">
                      {formatBytes(v.size)} · {v.versionId.substring(0, 16)}…
                    </p>
                  </div>
                  <button
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50"
                    disabled={downloading === v.versionId}
                    onClick={() => handleDownloadVersion(v)}
                    type="button"
                  >
                    {downloading === v.versionId ? (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border border-zinc-300 border-t-zinc-600" />
                    ) : (
                      <DownloadIcon className="h-3.5 w-3.5" />
                    )}
                    Download
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-[0.5px] border-zinc-200 px-5 py-3">
          <button
            className="w-full rounded-lg bg-zinc-100 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-200"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
