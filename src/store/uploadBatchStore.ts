import { create } from "zustand";

interface UploadBatchStore {
  cancelRequested: boolean;
  resetCancel: () => void;
  requestCancel: () => void;
}

export const useUploadBatchStore = create<UploadBatchStore>((set) => ({
  cancelRequested: false,
  resetCancel: () => set({ cancelRequested: false }),
  requestCancel: () => set({ cancelRequested: true }),
}));
