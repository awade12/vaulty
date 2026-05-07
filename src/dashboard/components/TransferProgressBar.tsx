import { formatBytes } from "../../lib/utils";
import type { TransferProgressPayload } from "../../types";

interface TransferProgressBarProps {
  progress: TransferProgressPayload | null;
}

export default function TransferProgressBar({
  progress,
}: TransferProgressBarProps) {
  if (progress == null) {
    return null;
  }

  const pct =
    progress.total != null && progress.total > 0
      ? Math.min(100, (progress.transferred / progress.total) * 100)
      : null;
  const label =
    progress.phase === "start"
      ? `Starting ${progress.op}…`
      : progress.phase === "error"
        ? progress.message ?? "Transfer failed"
        : `${progress.op === "upload" ? "Upload" : "Download"} · ${formatBytes(progress.transferred)}${progress.total != null ? ` / ${formatBytes(progress.total)}` : ""}`;

  return (
    <div className="border-t border-[0.5px] border-zinc-200 bg-zinc-50 px-3 py-1.5">
      <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-500">
        <span className="min-w-0 truncate">{label}</span>
        {pct != null && (
          <span className="shrink-0 tabular-nums">{Math.round(pct)}%</span>
        )}
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-full bg-accent-700 transition-[width] duration-150"
          style={{
            width: `${pct ?? (progress.phase === "start" ? 8 : 100)}%`,
          }}
        />
      </div>
    </div>
  );
}
