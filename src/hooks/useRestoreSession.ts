import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { activateConnection } from "../lib/tauri";
import { handleTauriError } from "../lib/utils";
import { useBucketStore } from "../store/bucketStore";

export function useRestoreSession() {
  const activeConnectionId = useBucketStore((s) => s.activeConnectionId);
  const isSwitchingConnection = useBucketStore((s) => s.isSwitchingConnection);
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    if (isSwitchingConnection) {
      return;
    }

    if (activeConnectionId === null) {
      useBucketStore.getState().setSessionReady(true);
      return;
    }

    if (hasRestoredRef.current) {
      return;
    }

    hasRestoredRef.current = true;
    useBucketStore.getState().setSessionReady(false);

    void (async () => {
      try {
        await activateConnection(activeConnectionId);
        useBucketStore.getState().setSessionReady(true);
      } catch (e) {
        toast.error(handleTauriError(e));
        useBucketStore.getState().setActiveConnectionId(null);
        useBucketStore.getState().setSessionReady(true);
      }
    })();
  }, [activeConnectionId, isSwitchingConnection]);
}
