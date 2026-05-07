import { useCallback, useEffect, useRef, useState } from "react";

import { isTauri } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";

export type UpdaterStatus =
  | "idle"
  | "checking"
  | "uptodate"
  | "available"
  | "downloading"
  | "ready"
  | "error";

interface UpdaterState {
  status: UpdaterStatus;
  currentVersion: string | null;
  latestVersion: string | null;
  notes: string | null;
  downloaded: number;
  total: number | null;
  error: string | null;
}

const initialState: UpdaterState = {
  status: "idle",
  currentVersion: null,
  latestVersion: null,
  notes: null,
  downloaded: 0,
  total: null,
  error: null,
};

export function useAppUpdater(): {
  state: UpdaterState;
  checkForUpdate: () => Promise<void>;
  installAndRelaunch: () => Promise<void>;
} {
  const [state, setState] = useState<UpdaterState>(initialState);
  const pendingUpdateRef = useRef<Update | null>(null);

  useEffect(() => {
    if (!isTauri()) return;
    void getVersion().then((v) => {
      setState((s) => ({ ...s, currentVersion: v }));
    });
  }, []);

  const checkForUpdate = useCallback(async () => {
    if (!isTauri()) return;
    setState((s) => ({ ...s, status: "checking", error: null }));
    try {
      const update = await check();
      if (update == null) {
        setState((s) => ({ ...s, status: "uptodate" }));
        return;
      }
      pendingUpdateRef.current = update;
      setState((s) => ({
        ...s,
        status: "available",
        latestVersion: update.version,
        notes: update.body ?? null,
      }));
    } catch (e) {
      setState((s) => ({
        ...s,
        status: "error",
        error: e instanceof Error ? e.message : String(e),
      }));
    }
  }, []);

  const installAndRelaunch = useCallback(async () => {
    const update = pendingUpdateRef.current;
    if (update == null) return;
    setState((s) => ({ ...s, status: "downloading", downloaded: 0, total: null }));
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          setState((s) => ({ ...s, total: event.data.contentLength ?? null }));
        } else if (event.event === "Progress") {
          setState((s) => ({ ...s, downloaded: s.downloaded + event.data.chunkLength }));
        } else if (event.event === "Finished") {
          setState((s) => ({ ...s, status: "ready" }));
        }
      });
      await relaunch();
    } catch (e) {
      setState((s) => ({
        ...s,
        status: "error",
        error: e instanceof Error ? e.message : String(e),
      }));
    }
  }, []);

  return { state, checkForUpdate, installAndRelaunch };
}
