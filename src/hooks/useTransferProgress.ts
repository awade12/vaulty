import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { friendlyS3Error, transferDisplayLabel } from "../lib/utils";
import type { TransferProgressPayload } from "../types";
import { useTransferActivityStore } from "../store/transferActivityStore";

export function useTransferProgress(): TransferProgressPayload | null {
  const [progress, setProgress] = useState<TransferProgressPayload | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    void listen<TransferProgressPayload>("transfer-progress", (event) => {
      const p = event.payload;
      useTransferActivityStore.getState().ingest(p);
      setProgress(p);
      if (p.phase === "error") {
        // Surface failed transfers as a toast so users notice them even when
        // the dock is collapsed. Friendly-translate the underlying S3 error
        // so the message is actionable.
        const label = transferDisplayLabel(p.key);
        const verb =
          p.op === "upload"
            ? "Upload failed"
            : p.op === "download"
              ? "Download failed"
              : "Transfer failed";
        toast.error(`${verb}: ${label}`, {
          description: p.message != null ? friendlyS3Error(p.message) : undefined,
          duration: 8000,
        });
      }
      if (p.phase === "end" || p.phase === "error") {
        window.setTimeout(() => {
          setProgress(null);
        }, 450);
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, []);

  return progress;
}
