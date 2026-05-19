import { create } from "zustand";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

interface UpdaterState {
  checking: boolean;
  available: boolean;
  version: string | null;
  notes: string | null;
  downloading: boolean;
  progress: number; // 0-100
  downloaded: number;
  total: number;
  error: string | null;
  lastChecked: number | null;
  update: Update | null;
  silentCheck: () => Promise<void>;
  manualCheck: () => Promise<void>;
  downloadAndInstall: () => Promise<void>;
}

export const useUpdaterStore = create<UpdaterState>((set, get) => ({
  checking: false,
  available: false,
  version: null,
  notes: null,
  downloading: false,
  progress: 0,
  downloaded: 0,
  total: 0,
  error: null,
  lastChecked: null,
  update: null,

  silentCheck: async () => {
    if (get().checking || get().downloading) return;
    set({ checking: true, error: null });
    try {
      const update = await check();
      if (update) {
        set({
          available: true,
          version: update.version,
          notes: update.body ?? null,
          update,
          lastChecked: Date.now(),
        });
      } else {
        set({ available: false, lastChecked: Date.now() });
      }
    } catch (e: any) {
      // sessiz kontrolde hata gösterme — çoğu zaman endpoint yok demek
      console.warn("Updater silent check failed:", e);
      set({ error: null, lastChecked: Date.now() });
    } finally {
      set({ checking: false });
    }
  },

  manualCheck: async () => {
    if (get().checking || get().downloading) return;
    set({ checking: true, error: null });
    try {
      const update = await check();
      if (update) {
        set({
          available: true,
          version: update.version,
          notes: update.body ?? null,
          update,
          lastChecked: Date.now(),
        });
      } else {
        set({ available: false, update: null, lastChecked: Date.now() });
      }
    } catch (e: any) {
      set({ error: String(e), lastChecked: Date.now() });
    } finally {
      set({ checking: false });
    }
  },

  downloadAndInstall: async () => {
    const upd = get().update;
    if (!upd) return;
    set({ downloading: true, error: null, progress: 0, downloaded: 0, total: 0 });
    try {
      let total = 0;
      let downloaded = 0;
      await upd.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            total = event.data.contentLength ?? 0;
            set({ total });
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            set({
              downloaded,
              progress: total > 0 ? Math.round((downloaded / total) * 100) : 0,
            });
            break;
          case "Finished":
            set({ progress: 100 });
            break;
        }
      });
      // İndirme + kurulum bitti, yeniden başlat
      await relaunch();
    } catch (e: any) {
      set({ error: String(e), downloading: false });
    }
  },
}));
