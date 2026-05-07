import {
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useConnectionsQuery } from "../hooks/useConnectionsQuery";
import { activateConnection, uploadFile } from "../lib/tauri";
import { handleTauriError, joinObjectKey } from "../lib/utils";
import { useBucketStore } from "../store/bucketStore";

export default function QuickUploadModal() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const quickUploadPaths = useBucketStore((s) => s.quickUploadPaths);
  const closeQuickUpload = useBucketStore((s) => s.closeQuickUpload);
  const activeConnectionId = useBucketStore((s) => s.activeConnectionId);
  const setActiveConnectionId = useBucketStore((s) => s.setActiveConnectionId);
  const setSessionReady = useBucketStore((s) => s.setSessionReady);
  const setIsSwitchingConnection = useBucketStore((s) => s.setIsSwitchingConnection);

  const { data: connections = [] } = useConnectionsQuery();

  const [selectedConnectionId, setSelectedConnectionId] = useState("");
  const [prefix, setPrefix] = useState("");
  const [busy, setBusy] = useState(false);

  const pathsSignature =
    quickUploadPaths != null && quickUploadPaths.length > 0
      ? quickUploadPaths.join("\0")
      : null;

  const connectionIdsKey = useMemo(
    () => connections.map((c) => c.id).join(","),
    [connections],
  );

  useEffect(() => {
    if (pathsSignature == null) {
      return;
    }
    setPrefix("");
  }, [pathsSignature]);

  useEffect(() => {
    if (pathsSignature == null) {
      return;
    }
    const fallback =
      activeConnectionId != null &&
      connections.some((c) => c.id === activeConnectionId)
        ? activeConnectionId
        : (connections[0]?.id ?? "");
    setSelectedConnectionId(fallback);
  }, [pathsSignature, activeConnectionId, connectionIdsKey, connections]);

  function handlePanelMouseDown(ev: MouseEvent<HTMLDivElement>): void {
    ev.stopPropagation();
  }

  function handleBackdropMouseDown(): void {
    if (!busy) {
      closeQuickUpload();
    }
  }

  function handleCancelClick(): void {
    if (!busy) {
      closeQuickUpload();
    }
  }

  function handleConnectionChange(e: ChangeEvent<HTMLSelectElement>): void {
    setSelectedConnectionId(e.target.value);
  }

  function handlePrefixChange(e: ChangeEvent<HTMLInputElement>): void {
    setPrefix(e.target.value);
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (quickUploadPaths == null || selectedConnectionId === "") {
      return;
    }
    setBusy(true);
    setIsSwitchingConnection(true);
    try {
      await activateConnection(selectedConnectionId);
      setActiveConnectionId(selectedConnectionId);
      setSessionReady(true);
      const normalizedPrefix = prefix.trim().replace(/^\/+/, "").replace(/\/+$/, "");
      for (const localPath of quickUploadPaths) {
        const base = localPath.split(/[/\\]/).pop() ?? "file";
        const key = joinObjectKey(normalizedPrefix, base);
        await uploadFile(localPath, key);
      }
      toast.success(
        quickUploadPaths.length === 1
          ? "File uploaded"
          : `Uploaded ${quickUploadPaths.length} files`,
      );
      closeQuickUpload();
      await queryClient.invalidateQueries({
        queryKey: ["bucket-files", selectedConnectionId],
      });
      navigate("/");
    } catch (err) {
      toast.error(handleTauriError(err));
    } finally {
      setBusy(false);
      setIsSwitchingConnection(false);
    }
  }

  if (pathsSignature == null || quickUploadPaths == null) {
    return null;
  }

  const fileLabel =
    quickUploadPaths.length === 1 ? "1 file selected" : `${quickUploadPaths.length} files selected`;

  const canSubmit = connections.length > 0 && selectedConnectionId !== "" && !busy;

  return (
    <div
      aria-labelledby="quick-upload-title"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/20 p-4"
      onMouseDown={handleBackdropMouseDown}
      role="dialog"
    >
      <div
        className="w-full max-w-sm rounded-xl border border-[0.5px] border-zinc-200 bg-white p-4"
        onMouseDown={handlePanelMouseDown}
      >
        <h2 className="text-sm font-medium text-zinc-900" id="quick-upload-title">
          Upload to Vaulty
        </h2>
        <p className="mt-1 text-xs text-zinc-400">{fileLabel}</p>

        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          {connections.length === 0 ? (
            <p className="text-xs text-zinc-400">
              Add a connection in Settings, then try again.
            </p>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-zinc-300">
                  Bucket
                </label>
                <select
                  className="w-full cursor-pointer rounded-md border border-[0.5px] border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-accent-200 focus:outline-none focus:ring-2 focus:ring-accent-200/40"
                  onChange={handleConnectionChange}
                  value={selectedConnectionId}
                >
                  {connections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label} · {c.bucket}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-zinc-300">
                  Prefix (folder path)
                </label>
                <input
                  autoComplete="off"
                  className="w-full rounded-md border border-[0.5px] border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-300 focus:border-accent-200 focus:outline-none focus:ring-2 focus:ring-accent-200/40"
                  onChange={handlePrefixChange}
                  placeholder="e.g. uploads/notes"
                  type="text"
                  value={prefix}
                />
              </div>
            </>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              className="rounded-md border border-[0.5px] border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-zinc-600 disabled:opacity-50"
              disabled={busy}
              onClick={handleCancelClick}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-md bg-accent-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-800 active:bg-accent-950 disabled:opacity-50"
              disabled={!canSubmit}
              type="submit"
            >
              Upload
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
