import { useState } from "react";
import { toast } from "sonner";

import { transferToConnection } from "../../lib/tauri";
import { handleTauriError } from "../../lib/utils";
import type { ConnectionConfig } from "../../types";

interface CrossBucketTransferModalProps {
  connections: ConnectionConfig[];
  activeConnectionId: string | null;
  keys: string[];
  onClose: () => void;
  onDone: () => void;
}

export default function CrossBucketTransferModal({
  connections,
  activeConnectionId,
  keys,
  onClose,
  onDone,
}: CrossBucketTransferModalProps) {
  const targets = connections.filter((connection) => connection.id !== activeConnectionId);
  const [targetId, setTargetId] = useState(targets[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  async function run(deleteSource: boolean): Promise<void> {
    if (targetId.length === 0 || keys.length === 0) return;
    setBusy(true);
    try {
      const count = await transferToConnection({
        targetConnectionId: targetId,
        keys,
        deleteSource,
      });
      toast.success(`${deleteSource ? "Moved" : "Copied"} ${count} object${count === 1 ? "" : "s"}`);
      onDone();
      onClose();
    } catch (e) {
      toast.error(handleTauriError(e));
    } finally {
      setBusy(false);
    }
  }

  if (keys.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/20 px-4">
      <div className="w-full max-w-sm rounded-xl border-[0.5px] border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-medium text-zinc-900">Copy or move to bucket</h2>
        <p className="mt-1 text-xs text-zinc-400">
          {keys.length} selected key{keys.length === 1 ? "" : "s"}
        </p>
        <select
          className="mt-4 w-full rounded-md border-[0.5px] border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-accent-200"
          onChange={(e) => setTargetId(e.target.value)}
          value={targetId}
        >
          {targets.map((connection) => (
            <option key={connection.id} value={connection.id}>
              {connection.label} · {connection.bucket}
            </option>
          ))}
        </select>
        {targets.length === 0 && (
          <p className="mt-3 text-xs text-zinc-400">Add another connection first.</p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            className="rounded-md bg-accent-700 px-3 py-2 text-xs font-medium text-white hover:bg-accent-800 disabled:opacity-50"
            disabled={busy || targetId.length === 0}
            onClick={() => void run(false)}
            type="button"
          >
            Copy
          </button>
          <button
            className="rounded-md border-[0.5px] border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
            disabled={busy || targetId.length === 0}
            onClick={() => void run(true)}
            type="button"
          >
            Move
          </button>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            className="rounded-md border-[0.5px] border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600"
            disabled={busy}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
