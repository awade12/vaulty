import { isTauri } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { useConnectionsQuery } from "../hooks/useConnectionsQuery";
import {
  activateConnection,
  addConnection,
  checkConnectionHealth,
  duplicateConnection,
  removeConnection,
  updateConnection,
} from "../lib/tauri";
import { handleTauriError } from "../lib/utils";
import { useBucketStore } from "../store/bucketStore";
import type { ListBucketsCredentials } from "../types";
import ConnectionForm, {
  type ConnectionFormPrefill,
  type ConnectionFormValues,
} from "./components/ConnectionForm";
import ConnectionListItem from "./components/ConnectionListItem";
import DatabaseIcon from "./components/DatabaseIcon";
import DiscoverBucketsModal from "./components/DiscoverBucketsModal";
import AppearancePreferences from "./components/AppearancePreferences";
import DownloadsPreferences from "./components/DownloadsPreferences";
import UpdatesPreferences from "./components/UpdatesPreferences";

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: connections = [], isLoading } = useConnectionsQuery();
  const activeConnectionId = useBucketStore((s) => s.activeConnectionId);
  const setActiveConnectionId = useBucketStore((s) => s.setActiveConnectionId);
  const setSessionReady = useBucketStore((s) => s.setSessionReady);
  const sessionReady = useBucketStore((s) => s.sessionReady);
  const [useBusy, setUseBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [discoverCreds, setDiscoverCreds] =
    useState<ListBucketsCredentials | null>(null);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const prefill = useMemo<ConnectionFormPrefill | null>(() => {
    if (searchParams.get("prefill") !== "minio") return null;
    return {
      label: searchParams.get("label") ?? "My MinIO",
      endpoint: searchParams.get("endpoint") ?? "",
      bucket: searchParams.get("bucket") ?? "",
      accessKeyId: searchParams.get("accessKeyId") ?? "",
      secretAccessKey: searchParams.get("secretAccessKey") ?? "",
    };
  }, [searchParams]);

  useEffect(() => {
    if (!isTauri()) return;
    void getVersion().then(setAppVersion);
  }, []);

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
      const region =
        values.region.trim() === "" ? null : values.region.trim();
      return addConnection({
        label: values.label,
        provider: values.provider,
        endpoint: values.endpoint.trim(),
        bucket: values.bucket.trim(),
        region,
        accessKeyId: values.accessKeyId.trim(),
        secretAccessKey: values.secretAccessKey,
      });
    },
    onSuccess: async (conn) => {
      await queryClient.invalidateQueries({ queryKey: ["connections"] });
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
      const region =
        values.region.trim() === "" ? null : values.region.trim();
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
    if (discoverCreds == null) {
      return [];
    }
    const ep = discoverCreds.endpoint.trim();
    return connections
      .filter(
        (c) =>
          c.provider === discoverCreds.provider && c.endpoint.trim() === ep,
      )
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
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <header className="flex h-12 items-center justify-between border-b border-[0.5px] border-zinc-200 bg-zinc-50 px-6">
        <h1 className="text-sm font-medium text-zinc-900">Settings</h1>
        {appVersion != null && (
          <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[11px] text-zinc-500 ring-1 ring-inset ring-zinc-200">
            v{appVersion}
          </span>
        )}
      </header>
      <div className="flex min-h-0 flex-1 gap-8 overflow-auto p-6">
        <div className="min-w-0 flex-1">
          <DownloadsPreferences />
          <AppearancePreferences />
          <UpdatesPreferences />
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100">
              <DatabaseIcon className="h-5 w-5 text-zinc-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900">Connections</p>
              <p className="text-xs text-zinc-400">
                {connections.length} saved connection{connections.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-accent-700" />
            </div>
          ) : connections.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-[0.5px] border-dashed border-zinc-200 bg-zinc-50 py-16">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
                <DatabaseIcon className="h-6 w-6 text-zinc-400" />
              </div>
              <p className="text-sm font-medium text-zinc-900">No connections yet</p>
              <p className="mt-1 text-xs text-zinc-400">
                Add your first S3-compatible connection to get started
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {connections.map((c) => (
                <ConnectionListItem
                  activateBusy={
                    useBusy ||
                    addMutation.isPending ||
                    updateMutation.isPending
                  }
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
        <div className="w-full max-w-sm shrink-0">
          <ConnectionForm
            draft={editingDraft}
            isPending={addMutation.isPending || updateMutation.isPending}
            onCancelDraft={editingDraft != null ? handleCancelEdit : undefined}
            onDiscoverRequest={
              editingDraft == null ? handleDiscoverRequest : undefined
            }
            onSubmit={handleFormSubmit}
            prefill={editingDraft == null ? prefill : null}
          />
        </div>
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
