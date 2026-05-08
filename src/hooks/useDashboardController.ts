import { useMemo } from "react";

import { deleteModalCopy } from "../dashboard/utils/deleteModalCopy";
import { useConnectionsQuery } from "./useConnectionsQuery";
import { useDashboardFileCommands } from "./useDashboardFileCommands";
import { useDashboardListing } from "./useDashboardListing";
import { useTransferProgress } from "./useTransferProgress";
import { useFolderSync } from "./useFolderSync";
import { handleTauriError } from "../lib/utils";
import { useBucketStore } from "../store/bucketStore";

export function useDashboardController() {
  useFolderSync();
  const list = useDashboardListing();
  const activeConnectionId = useBucketStore((s) => s.activeConnectionId);
  const sessionReady = useBucketStore((s) => s.sessionReady);
  const isSwitchingConnection = useBucketStore((s) => s.isSwitchingConnection);

  const cmds = useDashboardFileCommands({
    prefix: list.prefix,
    selectedKeys: list.selectedKeys,
    setSelectedKeys: list.setSelectedKeys,
    activeConnectionId,
    sessionReady,
  });

  const { data: connections = [] } = useConnectionsQuery();
  const transferProgress = useTransferProgress();

  const active = useMemo(
    () => connections.find((c) => c.id === activeConnectionId),
    [connections, activeConnectionId],
  );

  const errorMessage =
    list.query.error != null ? handleTauriError(list.query.error) : null;

  const showBucket = activeConnectionId != null && (sessionReady || isSwitchingConnection);

  const statusLeft = !showBucket
    ? "No active connection"
    : active
      ? `${active.bucket}`
      : "Connected";

  const deleteModal = deleteModalCopy(cmds.pendingDelete, list.prefix);

  return {
    ...list,
    ...cmds,
    active,
    connections,
    transferProgress,
    errorMessage,
    showBucket,
    statusLeft,
    deleteModal,
  };
}
