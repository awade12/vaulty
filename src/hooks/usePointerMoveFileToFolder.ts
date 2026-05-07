import {
  useCallback,
  useEffect,
  useRef,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { folderKeyElementFromPoint } from "../lib/folderDropTarget";

const DRAG_THRESHOLD_PX = 5;

let dragBodyChromeActive = false;

function applyDragBodyChrome(): void {
  if (dragBodyChromeActive) return;
  dragBodyChromeActive = true;
  document.body.style.userSelect = "none";
  document.body.style.cursor = "grabbing";
  document.body.style.touchAction = "none";
}

function clearDragBodyChrome(): void {
  if (!dragBodyChromeActive) return;
  dragBodyChromeActive = false;
  document.body.style.userSelect = "";
  document.body.style.cursor = "";
  document.body.style.touchAction = "";
}

export interface DragGhostPayload {
  x: number;
  y: number;
  label: string;
}

interface UsePointerMoveFileToFolderArgs {
  moveEnabled: boolean;
  onMoveComplete: (targetFolderKey: string, sourceKey: string) => void;
  setDraggingKey: (key: string | null) => void;
  setDragOverKey: (key: string | null) => void;
  setDragGhost: (ghost: DragGhostPayload | null) => void;
}

export function usePointerMoveFileToFolder({
  moveEnabled,
  onMoveComplete,
  setDraggingKey,
  setDragOverKey,
  setDragGhost,
}: UsePointerMoveFileToFolderArgs): {
  suppressActivationUntilRef: MutableRefObject<number>;
  onFileRowPointerDown: (fileKey: string, label: string, e: ReactPointerEvent<HTMLElement>) => void;
} {
  const onMoveCompleteRef = useRef(onMoveComplete);
  onMoveCompleteRef.current = onMoveComplete;

  const sessionRef = useRef<{
    fileKey: string;
    label: string;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  const suppressActivationUntilRef = useRef(0);

  const tearDownWindowListeners = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      tearDownWindowListeners.current?.();
      tearDownWindowListeners.current = null;
      sessionRef.current = null;
      dragBodyChromeActive = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      document.body.style.touchAction = "";
      setDragGhost(null);
    };
  }, [setDragGhost]);

  const handleWindowPointerMove = useCallback(
    (e: PointerEvent) => {
      const s = sessionRef.current;
      if (s == null) return;
      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;
      if (!s.moved) {
        if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return;
        s.moved = true;
        applyDragBodyChrome();
        setDraggingKey(s.fileKey);
      }
      setDragGhost({ x: e.clientX, y: e.clientY, label: s.label });
      setDragOverKey(folderKeyElementFromPoint(e.clientX, e.clientY));
    },
    [setDragGhost, setDragOverKey, setDraggingKey],
  );

  const handleWindowPointerEnd = useCallback(
    (e: PointerEvent) => {
      tearDownWindowListeners.current?.();
      tearDownWindowListeners.current = null;

      const s = sessionRef.current;
      sessionRef.current = null;

      if (s == null) return;

      if (!s.moved) {
        return;
      }

      clearDragBodyChrome();

      suppressActivationUntilRef.current = performance.now() + 400;
      setDraggingKey(null);
      setDragOverKey(null);
      setDragGhost(null);

      const targetFolder = folderKeyElementFromPoint(e.clientX, e.clientY);
      if (targetFolder != null && moveEnabled) {
        onMoveCompleteRef.current(targetFolder, s.fileKey);
      }
    },
    [moveEnabled, setDragGhost, setDragOverKey, setDraggingKey],
  );

  const onFileRowPointerDown = useCallback(
    (fileKey: string, label: string, e: ReactPointerEvent<HTMLElement>) => {
      if (!moveEnabled) return;
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("button")) return;

      const el = e.currentTarget;
      if (el instanceof HTMLElement) {
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }

      sessionRef.current = {
        fileKey,
        label,
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
      };

      const onMove = (ev: PointerEvent) => handleWindowPointerMove(ev);
      const onUp = (ev: PointerEvent) => handleWindowPointerEnd(ev);

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);

      tearDownWindowListeners.current = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
    },
    [handleWindowPointerEnd, handleWindowPointerMove, moveEnabled],
  );

  return { suppressActivationUntilRef, onFileRowPointerDown };
}
