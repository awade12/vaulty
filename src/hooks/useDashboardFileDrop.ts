import { getCurrentWebview } from "@tauri-apps/api/webview";
import { useEffect } from "react";

interface UseDashboardFileDropArgs {
  enabled: boolean;
  /**
   * Called when external files are dropped onto the window.
   * `targetFolderKey` is the S3 prefix of the folder under the cursor (with
   * trailing `/`), or `null` if the cursor wasn't over a specific folder
   * — in which case the caller should upload to the current prefix.
   */
  onPathsDropped: (paths: string[], targetFolderKey: string | null) => void;
}

/**
 * Resolve the folder under the cursor at drop time. Folders set
 * `data-vaulty-folder-key` on their root element so we can look them up
 * via `elementFromPoint`.
 *
 * Tauri reports drop positions in *physical* pixels; the DOM expects CSS
 * pixels. Divide by devicePixelRatio to bridge.
 */
function folderKeyAtPhysicalPosition(x: number, y: number): string | null {
  const dpr = window.devicePixelRatio || 1;
  const cx = x / dpr;
  const cy = y / dpr;
  const el = document.elementFromPoint(cx, cy);
  if (el == null) return null;
  const folderEl = el.closest("[data-vaulty-folder-key]");
  if (folderEl == null) return null;
  return folderEl.getAttribute("data-vaulty-folder-key");
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
          const pos = event.payload.position;
          const target =
            pos != null
              ? folderKeyAtPhysicalPosition(pos.x, pos.y)
              : null;
          onPathsDropped(event.payload.paths, target);
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
