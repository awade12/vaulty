import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { FolderColor, FolderStyle } from "../lib/folderStyle";
import { folderTokenKey } from "../lib/folderStyle";

interface FolderStyleStore {
  folderStyle: FolderStyle;
  folderColors: Record<string, FolderColor>;
  setFolderStyle: (style: FolderStyle) => void;
  setFolderColor: (connectionId: string | null, folderKey: string, color: FolderColor) => void;
  clearFolderColor: (connectionId: string | null, folderKey: string) => void;
  getFolderColor: (connectionId: string | null, folderKey: string) => FolderColor;
}

export const useFolderStyleStore = create<FolderStyleStore>()(
  persist(
    (set, get) => ({
      folderStyle: "classic",
      folderColors: {},
      setFolderStyle: (folderStyle) => set({ folderStyle }),
      setFolderColor: (connectionId, folderKey, color) => {
        const key = folderTokenKey(connectionId, folderKey);
        set((s) => ({ folderColors: { ...s.folderColors, [key]: color } }));
      },
      clearFolderColor: (connectionId, folderKey) => {
        const key = folderTokenKey(connectionId, folderKey);
        set((s) => {
          const next = { ...s.folderColors };
          delete next[key];
          return { folderColors: next };
        });
      },
      getFolderColor: (connectionId, folderKey) => {
        const key = folderTokenKey(connectionId, folderKey);
        return get().folderColors[key] ?? "default";
      },
    }),
    { name: "vaulty-folder-style" },
  ),
);
