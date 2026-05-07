import { type ChangeEvent } from "react";

import { open } from "@tauri-apps/plugin-dialog";

import { TRANSFER_CONCURRENCY_LIMIT } from "../../lib/constants";
import { usePreferencesStore } from "../../store/preferencesStore";

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path
        d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function DownloadsPreferences() {
  const defaultDownloadFolder = usePreferencesStore((s) => s.defaultDownloadFolder);
  const alwaysPromptDownloadLocation = usePreferencesStore(
    (s) => s.alwaysPromptDownloadLocation,
  );
  const setDefaultDownloadFolder = usePreferencesStore((s) => s.setDefaultDownloadFolder);
  const setAlwaysPromptDownloadLocation = usePreferencesStore(
    (s) => s.setAlwaysPromptDownloadLocation,
  );

  async function handleChooseFolderClick(): Promise<void> {
    const picked = await open({
      directory: true,
      multiple: false,
      title: "Default download folder",
      defaultPath: defaultDownloadFolder ?? undefined,
    });
    if (picked == null) {
      return;
    }
    const path = Array.isArray(picked) ? picked[0] ?? null : picked;
    if (path != null) {
      setDefaultDownloadFolder(path);
    }
  }

  function handleClearFolderClick(): void {
    setDefaultDownloadFolder(null);
  }

  function handleAlwaysPromptChange(e: ChangeEvent<HTMLInputElement>): void {
    setAlwaysPromptDownloadLocation(e.target.checked);
  }

  return (
    <div className="mb-8 rounded-xl border border-[0.5px] border-zinc-200 bg-zinc-50 p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
          <FolderIcon className="h-5 w-5 text-zinc-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-900">Downloads on this Mac</p>
          <p className="text-xs text-zinc-400">
            Keep files out of Downloads unless you choose that folder here.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          className="rounded-md bg-accent-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-800 active:bg-accent-950"
          onClick={handleChooseFolderClick}
          type="button"
        >
          Choose folder
        </button>
        <button
          className="rounded-md border border-[0.5px] border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-zinc-600 disabled:opacity-40"
          disabled={defaultDownloadFolder == null}
          onClick={handleClearFolderClick}
          type="button"
        >
          Clear
        </button>
      </div>

      {defaultDownloadFolder != null && (
        <p className="mt-2 truncate font-mono text-[11px] text-zinc-500" title={defaultDownloadFolder}>
          {defaultDownloadFolder}
        </p>
      )}

      <label className="mt-4 flex cursor-pointer items-start gap-2">
        <input
          checked={alwaysPromptDownloadLocation}
          className="mt-0.5 h-3.5 w-3.5 rounded border-[0.5px] border-zinc-300 text-accent-700 focus:ring-accent-200"
          onChange={handleAlwaysPromptChange}
          type="checkbox"
        />
        <span className="text-xs text-zinc-600">
          Always ask where to save each file (uses your folder as the starting location when set).
        </span>
      </label>

      <p className="mt-4 text-[11px] leading-relaxed text-zinc-400">
        Transfers run at most <span className="tabular-nums">{TRANSFER_CONCURRENCY_LIMIT}</span>{" "}
        at a time so Vaulty stays light on CPU, disk, and network.
      </p>
    </div>
  );
}
