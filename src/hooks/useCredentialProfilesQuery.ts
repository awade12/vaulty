import { useQuery } from "@tanstack/react-query";

import { listCredentialProfiles } from "../lib/tauri";

export function useCredentialProfilesQuery() {
  return useQuery({
    queryKey: ["credential-profiles"],
    queryFn: () => listCredentialProfiles(),
    staleTime: 60_000,
  });
}
