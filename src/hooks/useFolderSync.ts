import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { join } from "@tauri-apps/api/path";

import {
  collectUploadCandidates,
  deleteFile,
  deleteLocalFile,
  downloadFile,
  listFiles,
  uploadFile,
} from "../lib/tauri";
import { handleTauriError, joinObjectKey } from "../lib/utils";
import { useBucketStore } from "../store/bucketStore";
import { useFolderSyncStore } from "../store/folderSyncStore";

const SYNC_INTERVAL_MS = 30_000;

function stripWatchedRoot(relativeKey: string): string {
  const parts = relativeKey.split("/").filter((part) => part.length > 0);
  if (parts.length <= 1) {
    return parts[0] ?? relativeKey;
  }
  return parts.slice(1).join("/");
}

function keyFromLocalItem(prefix: string, relativeKey: string): string {
  return joinObjectKey(prefix, stripWatchedRoot(relativeKey));
}

export function useFolderSync(): void {
  const queryClient = useQueryClient();
  const activeConnectionId = useBucketStore((s) => s.activeConnectionId);
  const sessionReady = useBucketStore((s) => s.sessionReady);
  const configs = useFolderSyncStore((s) => s.configs);
  const running = useRef(false);

  useEffect(() => {
    if (activeConnectionId == null || !sessionReady) return;
    const config = configs.find(
      (c) => c.connectionId === activeConnectionId && c.enabled,
    );
    if (config == null) return;
    const syncId = config.id;

    async function syncOnce(): Promise<void> {
      if (running.current) return;
      running.current = true;
      try {
        const latest = useFolderSyncStore
          .getState()
          .configs.find((c) => c.id === syncId);
        if (latest == null || !latest.enabled) return;
        const items = await collectUploadCandidates([latest.localPath]);
        const mode = latest.mode ?? "copy";
        const localKeys = new Set(
          items.map((item) => keyFromLocalItem(latest.prefix, item.objectRelativeKey)),
        );
        let uploaded = 0;
        for (const item of items) {
          const objectRelativeKey = stripWatchedRoot(item.objectRelativeKey);
          const key = joinObjectKey(latest.prefix, objectRelativeKey);
          const legacyKey = joinObjectKey(latest.prefix, item.objectRelativeKey);
          const fingerprint = `${item.size}:${item.modifiedMillis}`;
          if (latest.fingerprints[key] === fingerprint) {
            continue;
          }
          if (latest.fingerprints[legacyKey] === fingerprint) {
            useFolderSyncStore.getState().setFingerprint(latest.id, key, fingerprint);
            continue;
          }
          await uploadFile(item.localPath, key);
          if (mode === "move") {
            await deleteLocalFile(item.localPath);
          }
          useFolderSyncStore.getState().setFingerprint(latest.id, key, fingerprint);
          uploaded++;
        }
        let downloaded = 0;
        if (mode === "twoWay" || mode === "mirror") {
          const remoteFiles = (await listFiles(latest.prefix)).filter((file) => !file.isFolder);
          for (const file of remoteFiles) {
            if (localKeys.has(file.key)) continue;
            const rel = file.key.startsWith(latest.prefix)
              ? file.key.slice(latest.prefix.length)
              : file.key;
            if (rel.length === 0 || rel.includes("/")) continue;
            const dest = await join(latest.localPath, rel);
            await downloadFile(file.key, dest);
            useFolderSyncStore
              .getState()
              .setFingerprint(latest.id, file.key, `${file.size}:${file.lastModified}`);
            downloaded++;
          }
        }
        let deletedRemote = 0;
        if (mode === "mirror") {
          const knownKeys = Object.keys(latest.fingerprints).filter((key) =>
            key.startsWith(latest.prefix),
          );
          for (const key of knownKeys) {
            if (localKeys.has(key)) continue;
            await deleteFile(key);
            deletedRemote++;
          }
        }
        if (uploaded > 0 || downloaded > 0 || deletedRemote > 0) {
          void queryClient.invalidateQueries({
            queryKey: ["bucket-files", activeConnectionId],
          });
          const parts = [
            uploaded > 0 ? `${uploaded} uploaded` : "",
            downloaded > 0 ? `${downloaded} downloaded` : "",
            deletedRemote > 0 ? `${deletedRemote} deleted` : "",
          ].filter(Boolean);
          toast.success(`Synced ${parts.join(", ")}`);
        }
      } catch (e) {
        toast.error(handleTauriError(e));
      } finally {
        running.current = false;
      }
    }

    void syncOnce();
    const timer = window.setInterval(() => void syncOnce(), SYNC_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [activeConnectionId, configs, queryClient, sessionReady]);
}
