import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { activateConnection, globalSearch } from "../lib/tauri";
import { handleTauriError } from "../lib/utils";
import { useBucketStore } from "../store/bucketStore";
import type { ConnectionConfig, GlobalSearchReport } from "../types";

interface CommandPaletteProps {
  connections: ConnectionConfig[];
}

export default function CommandPalette({ connections }: CommandPaletteProps) {
  const navigate = useNavigate();
  const setActiveConnectionId = useBucketStore((s) => s.setActiveConnectionId);
  const setSessionReady = useBucketStore((s) => s.setSessionReady);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [report, setReport] = useState<GlobalSearchReport | null>(null);

  const searchMut = useMutation({
    mutationFn: globalSearch,
    onSuccess: setReport,
    onError: (e) => toast.error(handleTauriError(e)),
  });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredConnections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return connections.slice(0, 6);
    return connections
      .filter(
        (c) =>
          c.label.toLowerCase().includes(q) ||
          c.bucket.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [connections, query]);

  function handleQueryChange(e: ChangeEvent<HTMLInputElement>): void {
    setQuery(e.target.value);
    setReport(null);
  }

  async function handleConnection(id: string): Promise<void> {
    try {
      await activateConnection(id);
      setActiveConnectionId(id);
      setSessionReady(true);
      navigate("/");
      setOpen(false);
    } catch (e) {
      toast.error(handleTauriError(e));
    }
  }

  function handleGlobalSearch(): void {
    if (query.trim().length >= 2) {
      searchMut.mutate(query);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-900/20 p-6 pt-20">
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-[0.5px] border-zinc-200 bg-white">
        <input
          autoFocus
          className="w-full border-b border-[0.5px] border-zinc-200 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none"
          onChange={handleQueryChange}
          placeholder="Switch bucket, search all buckets, or open settings…"
          value={query}
        />
        <div className="max-h-[60vh] overflow-y-auto p-2">
          <button
            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-xs text-zinc-600 hover:bg-zinc-100"
            onClick={() => {
              navigate("/guide/connections");
              setOpen(false);
            }}
            type="button"
          >
            Open Connections
          </button>
          {query.trim().length >= 2 && (
            <button
              className="flex w-full items-center rounded-lg px-3 py-2 text-left text-xs text-accent-700 hover:bg-accent-50"
              disabled={searchMut.isPending}
              onClick={handleGlobalSearch}
              type="button"
            >
              Search all buckets for “{query.trim()}”
            </button>
          )}
          {filteredConnections.map((connection) => (
            <button
              className="flex w-full items-center rounded-lg px-3 py-2 text-left hover:bg-zinc-100"
              key={connection.id}
              onClick={() => void handleConnection(connection.id)}
              type="button"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-zinc-900">
                  {connection.label}
                </span>
                <span className="block truncate text-[11px] text-zinc-400">
                  {connection.bucket}
                </span>
              </span>
            </button>
          ))}
          {report != null && (
            <div className="mt-2 border-t border-[0.5px] border-zinc-200 pt-2">
              <p className="px-3 py-1 text-[11px] text-zinc-400">
                {report.matches.length} matches · scanned {report.scanned}
              </p>
              {report.matches.slice(0, 12).map((match) => (
                <button
                  className="flex w-full items-center rounded-lg px-3 py-2 text-left hover:bg-zinc-100"
                  key={`${match.connectionId}:${match.file.key}`}
                  onClick={() => void handleConnection(match.connectionId)}
                  type="button"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs text-zinc-900">
                      {match.file.key}
                    </span>
                    <span className="block truncate text-[11px] text-zinc-400">
                      {match.connectionLabel} · {match.bucket}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
