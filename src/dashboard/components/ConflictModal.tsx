import { basenameKey } from "../../lib/utils";
import type { UploadConflict, UploadConflictResolution } from "../../lib/uploadBatch";

interface ConflictModalProps {
  conflict: UploadConflict | null;
  onResolve: (resolution: UploadConflictResolution) => void;
}

export default function ConflictModal({ conflict, onResolve }: ConflictModalProps) {
  if (conflict == null) return null;

  function resolve(choice: UploadConflictResolution["choice"], applyMode: UploadConflictResolution["applyMode"]) {
    onResolve({ choice, applyMode });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/20 px-4">
      <div className="w-full max-w-sm rounded-xl border-[0.5px] border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-medium text-zinc-900">File already exists</h2>
        <p className="mt-1 break-all text-xs text-zinc-400">{conflict.key}</p>
        <div className="mt-4 space-y-2">
          <button
            className="w-full rounded-md bg-accent-700 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-800"
            onClick={() => resolve("replace", "once")}
            type="button"
          >
            Replace {basenameKey(conflict.key)}
          </button>
          <button
            className="w-full rounded-md border-[0.5px] border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600 transition-colors hover:bg-zinc-50"
            onClick={() => resolve("keepBoth", "once")}
            type="button"
          >
            Keep both
          </button>
          <button
            className="w-full rounded-md border-[0.5px] border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600 transition-colors hover:bg-zinc-50"
            onClick={() => resolve("skip", "once")}
            type="button"
          >
            Skip
          </button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            className="rounded-md border-[0.5px] border-zinc-200 bg-white px-2 py-1.5 text-[11px] text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600"
            onClick={() => resolve("replace", "all")}
            type="button"
          >
            Replace all
          </button>
          <button
            className="rounded-md border-[0.5px] border-zinc-200 bg-white px-2 py-1.5 text-[11px] text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600"
            onClick={() => resolve("keepBoth", "all")}
            type="button"
          >
            Keep all
          </button>
          <button
            className="rounded-md border-[0.5px] border-zinc-200 bg-white px-2 py-1.5 text-[11px] text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600"
            onClick={() => resolve("skip", "all")}
            type="button"
          >
            Skip all
          </button>
        </div>
      </div>
    </div>
  );
}
