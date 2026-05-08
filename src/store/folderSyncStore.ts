import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface FolderSyncConfig {
  id: string;
  connectionId: string;
  localPath: string;
  prefix: string;
  enabled: boolean;
  mode: "copy" | "move" | "twoWay" | "mirror";
  fingerprints: Record<string, string>;
}

interface FolderSyncStore {
  configs: FolderSyncConfig[];
  upsertConfig: (config: FolderSyncConfig) => void;
  removeConfig: (id: string) => void;
  setFingerprint: (id: string, key: string, fingerprint: string) => void;
}

export const useFolderSyncStore = create<FolderSyncStore>()(
  persist(
    (set) => ({
      configs: [],
      upsertConfig: (config) =>
        set((state) => ({
          configs: [
            ...state.configs.filter((existing) => existing.id !== config.id),
            config,
          ],
        })),
      removeConfig: (id) =>
        set((state) => ({
          configs: state.configs.filter((config) => config.id !== id),
        })),
      setFingerprint: (id, key, fingerprint) =>
        set((state) => ({
          configs: state.configs.map((config) =>
            config.id === id
              ? {
                  ...config,
                  fingerprints: { ...config.fingerprints, [key]: fingerprint },
                }
              : config,
          ),
        })),
    }),
    { name: "vaulty-folder-sync" },
  ),
);
