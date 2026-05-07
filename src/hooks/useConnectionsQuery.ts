import { useQuery } from "@tanstack/react-query";

import { listConnections } from "../lib/tauri";

export function useConnectionsQuery() {
  return useQuery({
    queryKey: ["connections"],
    queryFn: () => listConnections(),
    staleTime: 60_000,
  });
}
