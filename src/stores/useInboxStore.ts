import { create } from "zustand";

export type Preset = "7d" | "14d" | "30d" | "custom";

function toInputDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function presetRange(p: Preset) {
  const end = new Date();
  const start = new Date();
  const days = p === "7d" ? 7 : p === "14d" ? 14 : 30;
  start.setDate(end.getDate() - days);
  return { start: toInputDate(start), end: toInputDate(end) };
}

const initial = presetRange("14d");

interface InboxState {
  status: string;
  preset: Preset;
  fromDate: string;
  toDate: string;
  search: string;
  setStatus: (s: string) => void;
  setPreset: (p: Preset) => void;
  setFromDate: (d: string) => void;
  setToDate: (d: string) => void;
  setSearch: (s: string) => void;
}

export const useInboxStore = create<InboxState>((set) => ({
  status: "WAITING_FOR_ANSWER",
  preset: "14d",
  fromDate: initial.start,
  toDate: initial.end,
  search: "",
  setStatus: (status) => set({ status }),
  setPreset: (preset) => {
    if (preset === "custom") set({ preset });
    else {
      const r = presetRange(preset);
      set({ preset, fromDate: r.start, toDate: r.end });
    }
  },
  setFromDate: (fromDate) => set({ fromDate, preset: "custom" }),
  setToDate: (toDate) => set({ toDate, preset: "custom" }),
  setSearch: (search) => set({ search }),
}));
