import { useState, type ChangeEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { compareBucketToConnection } from "../../lib/tauri";
import { handleTauriError } from "../../lib/utils";
import type { BucketDiffReport, ConnectionConfig } from "../../types";

interface BucketComparePanelProps {
  activeConnectionId: string | null;
  connections: ConnectionConfig[];
  prefix: string;
  onClose: () => void;
}

export default function BucketComparePanel({
  activeConnectionId,
  connections,
  prefix,
  onClose,
}: BucketComparePanelProps) {
  const [targetId, setTargetId] = useState("");
  const [report, setReport] = useState<BucketDiffReport | null>(null);

  const compareMut = useMutation({
    mutationFn: compareBucketToConnection,
    onSuccess: setReport,
    onError: (e) => toast.error(handleTauriError(e)),
  });

  function handleTargetChange(e: ChangeEvent<HTMLSelectElement>): void {
    setTargetId(e.target.value);
    setReport(null);
  }

  function handleCompare(): void {
    if (targetId === "") return;
    compareMut.mutate({ targetConnectionId: targetId, prefix });
  }

  return (
    <aside className="w-80 shrink-0 border-l border-[0.5px] border-zinc-200 bg-zinc-50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-900">Compare Buckets</p>
        <button className="text-xs text-zinc-400" onClick={onClose} type="button">
          Close
        </button>
      </div>
      <select
        className="w-full rounded-md border border-[0.5px] border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900"
        onChange={handleTargetChange}
        value={targetId}
      >
        <option value="">Choose target bucket…</option>
        {connections
          .filter((c) => c.id !== activeConnectionId)
          .map((connection) => (
            <option key={connection.id} value={connection.id}>
              {connection.label} · {connection.bucket}
            </option>
          ))}
      </select>
      <button
        className="mt-3 w-full rounded-md bg-accent-700 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
        disabled={targetId === "" || compareMut.isPending}
        onClick={handleCompare}
        type="button"
      >
        Dry-run compare
      </button>
      {report != null && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-zinc-400">
            Scanned {report.scannedSource} source and {report.scannedTarget} target objects.
          </p>
          <DiffCount label="Only in source" value={report.sourceOnly.length} />
          <DiffCount label="Only in target" value={report.targetOnly.length} />
          <DiffCount label="Changed" value={report.changed.length} />
          {report.truncated && (
            <p className="rounded-md bg-zinc-100 p-2 text-[11px] text-zinc-500">
              Compare hit the 10,000 object cap. Narrow the folder prefix for a full diff.
            </p>
          )}
          {report.sourceOnly.slice(0, 6).map((file) => (
            <p className="truncate text-[11px] text-zinc-500" key={file.key}>
              {file.key}
            </p>
          ))}
        </div>
      )}
    </aside>
  );
}

function DiffCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-white px-3 py-2">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-xs font-medium text-zinc-900">{value}</span>
    </div>
  );
}
