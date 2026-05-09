import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { fixMimeIssues, scanMimeIssues } from "../../lib/tauri";
import { formatBytes, handleTauriError } from "../../lib/utils";
import type { MimeScanReport } from "../../types";

interface MimeFixerPanelProps {
  prefix: string;
  onClose: () => void;
}

export default function MimeFixerPanel({ prefix, onClose }: MimeFixerPanelProps) {
  const [report, setReport] = useState<MimeScanReport | null>(null);

  const scanMut = useMutation({
    mutationFn: scanMimeIssues,
    onSuccess: setReport,
    onError: (e) => toast.error(handleTauriError(e)),
  });

  const fixMut = useMutation({
    mutationFn: fixMimeIssues,
    onSuccess: (count) => {
      toast.success(`Fixed ${count} content type${count === 1 ? "" : "s"}`);
      scanMut.mutate(prefix);
    },
    onError: (e) => toast.error(handleTauriError(e)),
  });

  function handleScan(): void {
    scanMut.mutate(prefix);
  }

  function handleFixAll(): void {
    if (report == null) return;
    fixMut.mutate(report.issues.map((i) => i.key));
  }

  return (
    <aside className="w-80 shrink-0 border-l border-[0.5px] border-zinc-200 bg-zinc-50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-900">MIME Fixer</p>
        <button className="text-xs text-zinc-400" onClick={onClose} type="button">
          Close
        </button>
      </div>
      <p className="text-xs leading-relaxed text-zinc-400">
        Scan the current prefix for missing or wrong web content types, then repair them in place.
      </p>
      <button
        className="mt-3 w-full rounded-md bg-accent-700 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
        disabled={scanMut.isPending}
        onClick={handleScan}
        type="button"
      >
        Scan current prefix
      </button>
      {report != null && (
        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs text-zinc-400">
              {report.issues.length} issue{report.issues.length === 1 ? "" : "s"} · scanned {report.scanned}
            </p>
            <button
              className="rounded-md border border-[0.5px] border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-600 disabled:opacity-50"
              disabled={report.issues.length === 0 || fixMut.isPending}
              onClick={handleFixAll}
              type="button"
            >
              Fix all
            </button>
          </div>
          <div className="space-y-2">
            {report.issues.slice(0, 40).map((issue) => (
              <div className="rounded-md bg-white p-2" key={issue.key}>
                <p className="truncate text-xs text-zinc-900">{issue.key}</p>
                <p className="mt-1 text-[11px] text-zinc-400">
                  {issue.currentContentType} → {issue.suggestedContentType}
                </p>
                <p className="text-[11px] text-zinc-300">{formatBytes(issue.size)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
