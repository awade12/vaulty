import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PreferencesStore {
  defaultDownloadFolder: string | null;
  alwaysPromptDownloadLocation: boolean;
  setDefaultDownloadFolder: (path: string | null) => void;
  setAlwaysPromptDownloadLocation: (value: boolean) => void;
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      defaultDownloadFolder: null,
      alwaysPromptDownloadLocation: false,
      setDefaultDownloadFolder: (path) => set({ defaultDownloadFolder: path }),
      setAlwaysPromptDownloadLocation: (alwaysPromptDownloadLocation) =>
        set({ alwaysPromptDownloadLocation }),
    }),
    { name: "vaulty-preferences" },
  ),
);
