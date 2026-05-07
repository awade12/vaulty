import { getCurrentWebview } from "@tauri-apps/api/webview";
import { useEffect } from "react";

interface UseDashboardFileDropArgs {
  enabled: boolean;
  onPathsDropped: (paths: string[]) => void;
}

export function useDashboardFileDrop({
  enabled,
  onPathsDropped,
}: UseDashboardFileDropArgs): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    let unlisten: (() => void) | undefined;

    void getCurrentWebview()
      .onDragDropEvent((event) => {
        if (event.payload.type === "drop") {
          onPathsDropped(event.payload.paths);
        }
      })
      .then((fn) => {
        unlisten = fn;
      });

    return () => {
      unlisten?.();
    };
  }, [enabled, onPathsDropped]);
}
