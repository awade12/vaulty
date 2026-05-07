import { useMemo } from "react";

import { TRANSFER_CONCURRENCY_LIMIT } from "../../lib/constants";
import { formatBytes, transferDisplayLabel } from "../../lib/utils";
import { useTransferActivityStore } from "../../store/transferActivityStore";
import type { TransferProgressPayload } from "../../types";

interface TransferDockProps {
  progress: TransferProgressPayload | null;
  uploadBatchPending?: boolean;
  onCancelUploadBatch?: () => void;
}

function activityRowKey(payload: TransferProgressPayload): string {
  return `${payload.op}:${payload.key}`;
}

function labelForPayload(p: TransferProgressPayload): string {
  const name = transferDisplayLabel(p.key);
  if (p.phase === "error") {
    return p.message ?? "Failed";
  }
  if (p.phase === "start") {
    return `Starting ${p.op}… ${name}`;
  }
  const opLabel = p.op === "upload" ? "Upload" : "Download";
  const sz =
    p.total != null
      ? `${formatBytes(p.transferred)} / ${formatBytes(p.total)}`
      : formatBytes(p.transferred);
  return `${opLabel} · ${name} · ${sz}`;
}

function pctFor(p: TransferProgressPayload): number | null {
  if (p.total == null || p.total <= 0) {
    return null;
  }
  return Math.min(100, (p.transferred / p.total) * 100);
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      aria-hidden
      className={`h-3 w-3 text-zinc-400 transition-transform ${expanded ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path d="m19.5 8.25-7.5 7.5-7.5-7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function TransferDock({
  progress,
  uploadBatchPending = false,
  onCancelUploadBatch,
}: TransferDockProps) {
  const active = useTransferActivityStore((s) => s.active);
  const recent = useTransferActivityStore((s) => s.recent);
  const expanded = useTransferActivityStore((s) => s.expanded);
  const setExpanded = useTransferActivityStore((s) => s.setExpanded);

  const activeList = useMemo(
    () => Object.values(active).sort((a, b) => b.updatedAt - a.updatedAt),
    [active],
  );

  const headline = progress ?? activeList[0]?.payload ?? null;

  const hasActivity =
    headline != null ||
    activeList.length > 0 ||
    recent.length > 0 ||
    uploadBatchPending;

  function handleToggleTransfersClick(): void {
    setExpanded(!expanded);
  }

  if (!hasActivity) {
    return (
      <div className="border-t border-[0.5px] border-zinc-200 bg-zinc-50 px-3 py-1.5">
        <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-400">
          <span className="text-zinc-500">Transfers</span>
          <span className="tabular-nums">Idle · max {TRANSFER_CONCURRENCY_LIMIT} concurrent</span>
        </div>
      </div>
    );
  }

  const barPct = headline != null ? pctFor(headline) : null;

  return (
    <div className="border-t border-[0.5px] border-zinc-200 bg-zinc-50">
      <div className="flex items-center gap-2 px-3 py-1">
        <button
          className="flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
          onClick={handleToggleTransfersClick}
          type="button"
        >
          <span>Transfers</span>
          <ChevronIcon expanded={expanded} />
        </button>
        <div className="min-w-0 flex-1 truncate text-[11px] text-zinc-500">
          {headline != null
            ? labelForPayload(headline)
            : uploadBatchPending
              ? "Uploading batch…"
              : recent.length > 0
                ? "Idle · expand for recent"
                : "Working…"}
        </div>
        {uploadBatchPending && onCancelUploadBatch != null ? (
          <button
            className="shrink-0 rounded-md border border-[0.5px] border-zinc-200 bg-white px-2 py-0.5 text-[10px] text-zinc-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
            onClick={onCancelUploadBatch}
            type="button"
          >
            Stop
          </button>
        ) : null}
        <span className="shrink-0 text-[10px] tabular-nums text-zinc-300">
          max {TRANSFER_CONCURRENCY_LIMIT}
        </span>
      </div>
      {headline != null &&
        headline.phase !== "error" &&
        headline.phase !== "end" && (
        <div className="px-3 pb-1.5">
          <div className="h-1 overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full bg-accent-700 transition-[width] duration-150"
              style={{
                width: `${barPct ?? (headline.phase === "start" ? 8 : 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {expanded && (
        <div className="max-h-40 overflow-y-auto border-t border-[0.5px] border-zinc-200 px-3 py-2">
          {activeList.length > 0 && (
            <div className="mb-2">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-300">
                Active
              </p>
              <ul className="space-y-1">
                {activeList.map(({ payload }) => (
                  <li className="truncate text-[11px] text-zinc-600" key={activityRowKey(payload)}>
                    {labelForPayload(payload)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {recent.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-300">
                Recent
              </p>
              <ul className="space-y-1">
                {recent.slice(0, 8).map((payload) => (
                  <li
                    className="truncate text-[11px] text-zinc-400"
                    key={activityRowKey(payload)}
                  >
                    {labelForPayload(payload)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
