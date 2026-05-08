import { useState } from "react";
import { toast } from "sonner";

import { copyText } from "../../lib/clipboard";
import { getPresignedUrl } from "../../lib/tauri";
import { basenameKey, handleTauriError } from "../../lib/utils";
import type { BucketFile } from "../../types";

const OPTIONS = [
  { label: "15 min", seconds: 900 },
  { label: "1 hour", seconds: 3600 },
  { label: "1 day", seconds: 86_400 },
  { label: "7 days", seconds: 604_800 },
];

interface ShareLinkModalProps {
  file: BucketFile | null;
  onClose: () => void;
}

export default function ShareLinkModal({ file, onClose }: ShareLinkModalProps) {
  const [busySeconds, setBusySeconds] = useState<number | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  if (file == null) return null;

  async function handleCopy(seconds: number): Promise<void> {
    if (file == null) return;
    setBusySeconds(seconds);
    try {
      const url = await getPresignedUrl(file.key, seconds);
      setGeneratedUrl(url);
      const copied = await copyText(url);
      if (copied) {
        toast.success("Share link copied");
      } else {
        toast.warning("Link created. Select and copy it manually.");
      }
    } catch (e) {
      toast.error(handleTauriError(e));
    } finally {
      setBusySeconds(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/20 px-4">
      <div className="w-full max-w-sm rounded-xl border-[0.5px] border-zinc-200 bg-white p-4">
        <div className="mb-3">
          <h2 className="text-sm font-medium text-zinc-900">Share link</h2>
          <p className="mt-1 truncate text-xs text-zinc-400">{basenameKey(file.key)}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {OPTIONS.map((option) => (
            <button
              className="rounded-md border-[0.5px] border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
              disabled={busySeconds != null}
              key={option.seconds}
              onClick={() => void handleCopy(option.seconds)}
              type="button"
            >
              {busySeconds === option.seconds ? "Copying..." : option.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-zinc-400">
          S3 presigned links cannot be revoked individually. Use a short expiration, or rotate the
          access key if a copied link must be invalidated immediately.
        </p>
        {generatedUrl != null && (
          <textarea
            className="mt-3 h-20 w-full resize-none rounded-md border-[0.5px] border-zinc-200 bg-zinc-50 px-2 py-1.5 font-mono text-[11px] text-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent-200"
            onFocus={(e) => e.currentTarget.select()}
            readOnly
            value={generatedUrl}
          />
        )}
        <div className="mt-4 flex justify-end">
          <button
            className="rounded-md border-[0.5px] border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-zinc-600"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
