import { useQuery } from "@tanstack/react-query";

import { listFiles } from "../lib/tauri";
import { useBucketStore } from "../store/bucketStore";

export function useBucketContents(prefix: string) {
  const activeConnectionId = useBucketStore((s) => s.activeConnectionId);
  const sessionReady = useBucketStore((s) => s.sessionReady);

  return useQuery({
    queryKey: ["bucket-files", activeConnectionId, prefix],
    queryFn: () => listFiles(prefix),
    enabled: activeConnectionId !== null && sessionReady,
    staleTime: 30_000,
  });
}
