import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ViewMode = "grid" | "list";

interface RecentFile {
  key: string;
  connectionId: string;
  accessedAt: number;
}

interface BucketStore {
  activeConnectionId: string | null;
  sessionReady: boolean;
  isSwitchingConnection: boolean;
  viewMode: ViewMode;
  starredKeys: string[];
  recentFiles: RecentFile[];
  quickUploadPaths: string[] | null;
  setActiveConnectionId: (id: string | null) => void;
  setSessionReady: (ready: boolean) => void;
  setIsSwitchingConnection: (switching: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleStar: (key: string) => void;
  addRecentFile: (key: string, connectionId: string) => void;
  openQuickUpload: (paths: string[]) => void;
  closeQuickUpload: () => void;
}

const MAX_RECENT_FILES = 20;

export const useBucketStore = create<BucketStore>()(
  persist(
    (set, get) => ({
      activeConnectionId: null,
      sessionReady: false,
      isSwitchingConnection: false,
      viewMode: "grid",
      starredKeys: [],
      recentFiles: [],
      quickUploadPaths: null,
      setSessionReady: (ready) => set({ sessionReady: ready }),
      setActiveConnectionId: (id) => set({ activeConnectionId: id }),
      setIsSwitchingConnection: (switching) => set({ isSwitchingConnection: switching }),
      setViewMode: (mode) => set({ viewMode: mode }),
      toggleStar: (key) => {
        const current = get().starredKeys;
        if (current.includes(key)) {
          set({ starredKeys: current.filter((k) => k !== key) });
        } else {
          set({ starredKeys: [...current, key] });
        }
      },
      addRecentFile: (key, connectionId) => {
        const current = get().recentFiles.filter((f) => f.key !== key);
        const updated = [{ key, connectionId, accessedAt: Date.now() }, ...current].slice(0, MAX_RECENT_FILES);
        set({ recentFiles: updated });
      },
      openQuickUpload: (paths) => set({ quickUploadPaths: paths }),
      closeQuickUpload: () => set({ quickUploadPaths: null }),
    }),
    {
      name: "vaulty-bucket-store",
      partialize: (state) => ({
        activeConnectionId: state.activeConnectionId,
        viewMode: state.viewMode,
        starredKeys: state.starredKeys,
        recentFiles: state.recentFiles,
      }),
    },
  ),
);

