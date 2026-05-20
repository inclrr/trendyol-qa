import { create } from "zustand";
import type { Store } from "../api/tauri";

type Theme = "light" | "dark" | "system";

interface AppState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  stores: Store[];
  setStores: (s: Store[]) => void;
  selectedStoreIds: number[] | null; // null = hepsi
  setSelectedStoreIds: (ids: number[] | null) => void;
  pendingCount: number;
  setPendingCount: (n: number) => void;
  /** Deadline rozetlerinin yeniden hesaplanması için her ~30sn'de güncellenen tick */
  nowTick: number;
  setNowTick: (n: number) => void;
  /** Kullanıcı tarafından ayarlanabilir (default 2 saat) */
  answerDeadlineHours: number;
  setAnswerDeadlineHours: (h: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: "system",
  setTheme: (theme) => set({ theme }),
  stores: [],
  setStores: (stores) => set({ stores }),
  selectedStoreIds: null,
  setSelectedStoreIds: (ids) => set({ selectedStoreIds: ids }),
  pendingCount: 0,
  setPendingCount: (n) => set({ pendingCount: n }),
  nowTick: Date.now(),
  setNowTick: (n) => set({ nowTick: n }),
  answerDeadlineHours: 2,
  setAnswerDeadlineHours: (h) => set({ answerDeadlineHours: h }),
}));

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  root.classList.toggle("dark", resolved === "dark");
}
