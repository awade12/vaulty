import { open } from "@tauri-apps/plugin-dialog";

import { useFolderSyncStore } from "../../store/folderSyncStore";
import type { FolderSyncConfig } from "../../store/folderSyncStore";
import type { ConnectionConfig } from "../../types";

interface FolderSyncPanelProps {
  connection: ConnectionConfig | undefined;
  prefix: string;
  onClose: () => void;
}

const MODES: Array<{ mode: FolderSyncConfig["mode"]; label: string; description: string }> = [
  { mode: "copy", label: "Copy only", description: "Upload local changes and keep local files" },
  { mode: "move", label: "Move after upload", description: "Upload local files, then remove them from this Mac" },
  { mode: "twoWay", label: "Two-way", description: "Upload local changes and download missing bucket files" },
  { mode: "mirror", label: "Mirror", description: "Also delete known bucket files when local copies disappear" },
];

export default function FolderSyncPanel({ connection, prefix, onClose }: FolderSyncPanelProps) {
  const configs = useFolderSyncStore((s) => s.configs);
  const upsertConfig = useFolderSyncStore((s) => s.upsertConfig);
  const removeConfig = useFolderSyncStore((s) => s.removeConfig);
  const config = configs.find((c) => c.connectionId === connection?.id);

  async function handlePickFolder(): Promise<void> {
    if (connection == null) return;
    const selected = await open({ directory: true, multiple: false, title: "Watch folder" });
    const localPath = Array.isArray(selected) ? selected[0] : selected;
    if (localPath == null) return;
    upsertConfig({
      id: config?.id ?? `${connection.id}:${Date.now()}`,
      connectionId: connection.id,
      localPath,
      prefix,
      enabled: true,
      mode: config?.mode ?? "copy",
      fingerprints: config?.fingerprints ?? {},
    });
  }

  function handleToggle(): void {
    if (config == null) return;
    upsertConfig({ ...config, enabled: !config.enabled });
  }

  function handleRemove(): void {
    if (config == null) return;
    removeConfig(config.id);
  }

  function handleMode(mode: FolderSyncConfig["mode"]): void {
    if (config == null) return;
    upsertConfig({ ...config, mode });
  }

  return (
    <aside className="w-80 shrink-0 overflow-auto border-l-[0.5px] border-zinc-200 bg-zinc-50 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-zinc-900">Folder sync</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Uploads changed files every 30 seconds. Local files stay on this Mac.
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
      {config == null ? (
        <button
          className="w-full rounded-md bg-accent-700 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-800"
          onClick={() => void handlePickFolder()}
          type="button"
        >
          Pick local folder
        </button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-md bg-white px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-300">
              Local folder
            </p>
            <p className="mt-1 break-all text-xs text-zinc-900">{config.localPath}</p>
          </div>
          <div className="rounded-md bg-white px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-300">
              Bucket prefix
            </p>
            <p className="mt-1 break-all text-xs text-zinc-900">{config.prefix || "/"}</p>
          </div>
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-300">
              Sync mode
            </p>
            <div className="space-y-1.5">
              {MODES.map((mode) => (
                <button
                  className={[
                    "w-full rounded-md border-[0.5px] px-3 py-2 text-left transition-colors",
                    (config.mode ?? "copy") === mode.mode
                      ? "border-accent-200 bg-accent-50 text-accent-700"
                      : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
                  ].join(" ")}
                  key={mode.mode}
                  onClick={() => handleMode(mode.mode)}
                  type="button"
                >
                  <span className="block text-xs font-medium">{mode.label}</span>
                  <span className="mt-0.5 block text-[11px] text-zinc-400">
                    {mode.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="rounded-md border-[0.5px] border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600 hover:bg-zinc-50"
              onClick={handleToggle}
              type="button"
            >
              {config.enabled ? "Pause" : "Resume"}
            </button>
            <button
              className="rounded-md border-[0.5px] border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600 hover:bg-zinc-50"
              onClick={() => void handlePickFolder()}
              type="button"
            >
              Change
            </button>
          </div>
          <button
            className="w-full rounded-md border-[0.5px] border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-400 hover:bg-red-50 hover:text-red-500"
            onClick={handleRemove}
            type="button"
          >
            Remove sync
          </button>
        </div>
      )}
    </aside>
  );
}
