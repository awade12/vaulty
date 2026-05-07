import { clsx } from "clsx";

import {
  FOLDER_COLORS,
  FOLDER_STYLES,
  FOLDER_STYLE_ORDER,
  type FolderStyle,
} from "../../lib/folderStyle";
import { useFolderStyleStore } from "../../store/folderStyleStore";

function FolderPreviewIcon({ className }: { className?: string }) {
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

function StylePreview({ style }: { style: FolderStyle }) {
  const tokens = FOLDER_STYLES[style];
  const folder = FOLDER_COLORS.default;
  const bg = tokens.background ? tokens.background(folder) : folder.bg;
  return (
    <div
      className={clsx(
        "flex h-10 w-10 items-center justify-center",
        tokens.radius.lg,
        bg,
        tokens.ring,
      )}
    >
      <FolderPreviewIcon className={clsx("h-5 w-5", folder.icon)} />
    </div>
  );
}

export default function AppearancePreferences() {
  const folderStyle = useFolderStyleStore((s) => s.folderStyle);
  const setFolderStyle = useFolderStyleStore((s) => s.setFolderStyle);

  return (
    <div className="mb-8 rounded-xl border border-[0.5px] border-zinc-200 bg-zinc-50 p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
          <FolderPreviewIcon className="h-5 w-5 text-zinc-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-900">Folder style</p>
          <p className="text-xs text-zinc-400">
            Sets the look of every folder. Set per-folder color from the right-click menu.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {FOLDER_STYLE_ORDER.map((s) => {
          const tokens = FOLDER_STYLES[s];
          const active = folderStyle === s;
          return (
            <button
              className={clsx(
                "flex flex-col items-center gap-2 rounded-lg border-[0.5px] bg-white px-3 py-3 text-center transition-colors",
                active
                  ? "border-accent-400 ring-2 ring-accent-200"
                  : "border-zinc-200 hover:border-zinc-300",
              )}
              key={s}
              onClick={() => setFolderStyle(s)}
              type="button"
            >
              <StylePreview style={s} />
              <p className="text-xs font-medium text-zinc-900">{tokens.label}</p>
              <p className="text-[10px] leading-tight text-zinc-400">{tokens.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
