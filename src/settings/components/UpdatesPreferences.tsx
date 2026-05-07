import { useAppUpdater } from "../../hooks/useAppUpdater";

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UpdatesPreferences() {
  const { state, checkForUpdate, installAndRelaunch } = useAppUpdater();
  const { status, currentVersion, latestVersion, notes, downloaded, total, error } = state;

  const isChecking = status === "checking";
  const isDownloading = status === "downloading";

  let statusLabel: string;
  switch (status) {
    case "checking":
      statusLabel = "Checking for updates…";
      break;
    case "uptodate":
      statusLabel = "You're on the latest version.";
      break;
    case "available":
      statusLabel = `Version ${latestVersion ?? ""} is available.`;
      break;
    case "downloading":
      statusLabel = total != null
        ? `Downloading ${formatBytes(downloaded)} of ${formatBytes(total)}…`
        : `Downloading ${formatBytes(downloaded)}…`;
      break;
    case "ready":
      statusLabel = "Update installed. Relaunching…";
      break;
    case "error":
      statusLabel = error ?? "Something went wrong.";
      break;
    default:
      statusLabel = "Check for new releases of Vaulty.";
  }

  const progressPct =
    total != null && total > 0
      ? Math.min(100, Math.round((downloaded / total) * 100))
      : null;

  return (
    <div className="mb-8 rounded-xl border border-[0.5px] border-zinc-200 bg-zinc-50 p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
          <DownloadIcon className="h-5 w-5 text-zinc-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-900">Updates</p>
          <p className="text-xs text-zinc-400">
            {currentVersion != null ? `Vaulty ${currentVersion}` : "Vaulty"}
            {" · "}
            <span className={status === "error" ? "text-red-500" : undefined}>
              {statusLabel}
            </span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          className="rounded-md bg-accent-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-800 active:bg-accent-950 disabled:opacity-40"
          disabled={isChecking || isDownloading}
          onClick={() => void checkForUpdate()}
          type="button"
        >
          {isChecking ? "Checking…" : "Check for updates"}
        </button>
        {status === "available" || status === "downloading" ? (
          <button
            className="rounded-md border border-[0.5px] border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-40"
            disabled={isDownloading}
            onClick={() => void installAndRelaunch()}
            type="button"
          >
            {isDownloading ? "Installing…" : "Install and relaunch"}
          </button>
        ) : null}
      </div>

      {progressPct != null && isDownloading ? (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full bg-accent-700 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      ) : null}

      {notes != null && status === "available" ? (
        <pre className="mt-3 max-h-32 overflow-auto whitespace-pre-wrap rounded-md border border-[0.5px] border-zinc-200 bg-white p-2 text-[11px] leading-relaxed text-zinc-600">
          {notes}
        </pre>
      ) : null}
    </div>
  );
}
