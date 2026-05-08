import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { useConnectionsQuery } from "../hooks/useConnectionsQuery";
import {
  activateConnection,
  addConnection,
  checkConnectionHealth,
  duplicateConnection,
  listActivity,
  listCredentialProfiles,
  removeConnection,
  updateConnection,
} from "../lib/tauri";
import { handleTauriError } from "../lib/utils";
import { useBucketStore } from "../store/bucketStore";
import type { ListBucketsCredentials } from "../types";
import ConnectionForm, {
  type ConnectionFormPrefill,
  type ConnectionFormValues,
} from "../settings/components/ConnectionForm";
import ConnectionListItem from "../settings/components/ConnectionListItem";
import DiscoverBucketsModal from "../settings/components/DiscoverBucketsModal";
import StorageAccountsPanel from "../settings/components/StorageAccountsPanel";
import ActivityLogPanel from "../settings/components/ActivityLogPanel";

function DatabaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  );
}

export default function ConnectionsPage() {
  const queryClient = useQueryClient();
  const { data: connections = [], isLoading } = useConnectionsQuery();
  const { data: credentialProfiles = [] } = useQuery({
    queryKey: ["credential-profiles"],
    queryFn: () => listCredentialProfiles(),
  });
  const { data: activity = [] } = useQuery({
    queryKey: ["activity"],
    queryFn: () => listActivity(),
  });
  const activeConnectionId = useBucketStore((s) => s.activeConnectionId);
  const setActiveConnectionId = useBucketStore((s) => s.setActiveConnectionId);
  const setSessionReady = useBucketStore((s) => s.setSessionReady);
  const sessionReady = useBucketStore((s) => s.sessionReady);
  const [useBusy, setUseBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [discoverCreds, setDiscoverCreds] = useState<ListBucketsCredentials | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const prefill = useMemo<ConnectionFormPrefill | null>(() => {
    if (searchParams.get("prefill") !== "minio") return null;
    return {
      label: searchParams.get("label") ?? "My MinIO",
      presetId: searchParams.get("presetId") ?? "minio",
      endpoint: searchParams.get("endpoint") ?? "",
      bucket: searchParams.get("bucket") ?? "",
      accessKeyId: searchParams.get("accessKeyId") ?? "",
      secretAccessKey: searchParams.get("secretAccessKey") ?? "",
    };
  }, [searchParams]);

  const editingDraft = useMemo(
    () => connections.find((c) => c.id === editingId) ?? null,
    [connections, editingId],
  );

  useEffect(() => {
    if (sessionReady) {
      setUseBusy(false);
    }
  }, [sessionReady]);

  const addMutation = useMutation({
    mutationFn: (values: ConnectionFormValues) => {
      const region = values.region.trim() === "" ? null : values.region.trim();
      return addConnection({
        label: values.label,
        provider: values.provider,
        endpoint: values.endpoint.trim(),
        bucket: values.bucket.trim(),
        region,
        accessKeyId: values.accessKeyId.trim(),
        secretAccessKey: values.secretAccessKey,
        credentialProfileId: values.credentialProfileId,
      });
    },
    onSuccess: async (conn) => {
      await queryClient.invalidateQueries({ queryKey: ["connections"] });
      await queryClient.invalidateQueries({ queryKey: ["credential-profiles"] });
      await queryClient.invalidateQueries({ queryKey: ["activity"] });
      setSessionReady(false);
      setActiveConnectionId(conn.id);
      toast.success("Connection saved");
    },
    onError: (e) => {
      toast.error(handleTauriError(e));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: ConnectionFormValues & { id: string }) => {
      const region = values.region.trim() === "" ? null : values.region.trim();
      const secretTrim = values.secretAccessKey.trim();
      return updateConnection({
        id: values.id,
        label: values.label,
        provider: values.provider,
        endpoint: values.endpoint.trim(),
        bucket: values.bucket.trim(),
        region,
        accessKeyId: values.accessKeyId.trim(),
        secretAccessKey: secretTrim === "" ? null : secretTrim,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["connections"] });
      await queryClient.invalidateQueries({ queryKey: ["credential-profiles"] });
      await queryClient.invalidateQueries({ queryKey: ["activity"] });
      setEditingId(null);
      setSessionReady(false);
      toast.success("Connection updated");
    },
    onError: (e) => {
      toast.error(handleTauriError(e));
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicateConnection(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["connections"] });
      await queryClient.invalidateQueries({ queryKey: ["activity"] });
      toast.success("Connection duplicated");
    },
    onError: (e) => {
      toast.error(handleTauriError(e));
    },
  });

  const healthMutation = useMutation({
    mutationFn: (id: string) => checkConnectionHealth(id),
    onSuccess: () => {
      toast.success("Bucket reachable");
    },
    onError: (e) => {
      toast.error(handleTauriError(e));
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeConnection(id),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: ["connections"] });
      void queryClient.invalidateQueries({ queryKey: ["credential-profiles"] });
      void queryClient.invalidateQueries({ queryKey: ["activity"] });
      void queryClient.invalidateQueries({ queryKey: ["bucket-files"] });
      if (activeConnectionId === id) {
        setActiveConnectionId(null);
      }
      if (editingId === id) {
        setEditingId(null);
      }
      toast.success("Connection removed");
    },
    onError: (e) => {
      toast.error(handleTauriError(e));
    },
  });

  const existingForDiscover = useMemo(() => {
    if (discoverCreds == null) return [];
    const ep = discoverCreds.endpoint.trim();
    return connections
      .filter((c) => c.provider === discoverCreds.provider && c.endpoint.trim() === ep)
      .map((c) => c.bucket);
  }, [connections, discoverCreds]);

  function handleDiscoverRequest(creds: ListBucketsCredentials): void {
    setDiscoverCreds(creds);
    setDiscoverOpen(true);
  }

  function handleDiscoverClose(): void {
    setDiscoverOpen(false);
    setDiscoverCreds(null);
  }

  function handleDiscoverAdded(): void {
    void queryClient.invalidateQueries({ queryKey: ["connections"] });
    void queryClient.invalidateQueries({ queryKey: ["credential-profiles"] });
    void queryClient.invalidateQueries({ queryKey: ["activity"] });
    setSessionReady(false);
  }

  function handleFormSubmit(values: ConnectionFormValues): void {
    if (editingDraft != null) {
      updateMutation.mutate({ ...values, id: editingDraft.id });
      return;
    }
    addMutation.mutate(values);
    if (searchParams.get("prefill")) setSearchParams({});
  }

  function handleCancelEdit(): void {
    setEditingId(null);
  }

  function handleEdit(id: string): void {
    setEditingId(id);
  }

  function handleDuplicate(id: string): void {
    duplicateMutation.mutate(id);
  }

  function handleHealth(id: string): void {
    healthMutation.mutate(id);
  }

  function handleActivate(id: string): void {
    if (id === activeConnectionId) {
      setUseBusy(true);
      setSessionReady(false);
      void (async () => {
        try {
          await activateConnection(id);
          setSessionReady(true);
          await queryClient.invalidateQueries({ queryKey: ["bucket-files"] });
          toast.success("Connection refreshed");
        } catch (e) {
          setSessionReady(true);
          toast.error(handleTauriError(e));
        } finally {
          setUseBusy(false);
        }
      })();
      return;
    }

    setUseBusy(true);
    setSessionReady(false);
    setActiveConnectionId(id);
  }

  function handleRemove(id: string): void {
    removeMutation.mutate(id);
  }

  return (
    <div className="flex h-full">
      <div className="min-w-0 flex-1 overflow-auto p-6">
        <StorageAccountsPanel profiles={credentialProfiles} />
        <ActivityLogPanel events={activity} />

        <h2 className="mb-4 text-sm font-medium text-zinc-900">
          Connections
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-accent-700" />
          </div>
        ) : connections.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-[0.5px] border-dashed border-zinc-200 py-16">
            <DatabaseIcon className="h-8 w-8 text-zinc-300 mb-3" />
            <p className="text-sm text-zinc-500">No connections yet</p>
            <p className="text-xs text-zinc-400 mt-1">Add one using the form</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {connections.map((c) => (
              <ConnectionListItem
                activateBusy={useBusy || addMutation.isPending || updateMutation.isPending}
                connection={c}
                healthBusy={healthMutation.isPending}
                isActive={c.id === activeConnectionId}
                key={c.id}
                onActivate={handleActivate}
                onDuplicate={handleDuplicate}
                onEdit={handleEdit}
                onHealth={handleHealth}
                onRemove={handleRemove}
                removeBusy={removeMutation.isPending}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="w-80 shrink-0 border-l border-[0.5px] border-zinc-200 bg-zinc-50 overflow-auto p-6">
        <h2 className="mb-4 text-sm font-medium text-zinc-900">
          {editingDraft ? "Edit" : "New Connection"}
        </h2>
        <ConnectionForm
          credentialProfiles={credentialProfiles}
          draft={editingDraft}
          isPending={addMutation.isPending || updateMutation.isPending}
          onCancelDraft={editingDraft != null ? handleCancelEdit : undefined}
          onDiscoverRequest={editingDraft == null ? handleDiscoverRequest : undefined}
          onSubmit={handleFormSubmit}
          prefill={editingDraft == null ? prefill : null}
        />
      </div>

      <DiscoverBucketsModal
        credentials={discoverCreds}
        existingBucketNames={existingForDiscover}
        onAdded={handleDiscoverAdded}
        onClose={handleDiscoverClose}
        open={discoverOpen}
      />
    </div>
  );
}
