import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";

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
