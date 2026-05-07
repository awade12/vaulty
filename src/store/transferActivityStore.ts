import { create } from "zustand";

import type { TransferProgressPayload } from "../types";

type RowKey = string;

interface ActivityRow {
  payload: TransferProgressPayload;
  updatedAt: number;
}

interface TransferActivityStore {
  active: Record<RowKey, ActivityRow>;
  recent: TransferProgressPayload[];
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  ingest: (payload: TransferProgressPayload) => void;
}

function rowKey(payload: TransferProgressPayload): RowKey {
  return `${payload.op}:${payload.key}`;
}

export const useTransferActivityStore = create<TransferActivityStore>((set) => ({
  active: {},
  recent: [],
  expanded: false,
  setExpanded: (expanded) => set({ expanded }),
  ingest: (payload) => {
    const k = rowKey(payload);
    const now = Date.now();
    set((state) => {
      if (payload.phase === "end" || payload.phase === "error") {
        const { [k]: _removed, ...restActive } = state.active;
        const recent = [payload, ...state.recent.filter((r) => rowKey(r) !== k)].slice(0, 14);
        return { active: restActive, recent };
      }
      return {
        active: {
          ...state.active,
          [k]: { payload, updatedAt: now },
        },
      };
    });
  },
}));
